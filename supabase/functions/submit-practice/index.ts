import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create auth-context client (uses the caller's JWT via forwarded Authorization header)
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify the user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: userError?.message || 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Service-role client for privileged DB operations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const {
      sessionId, lessonId,
      cpm, wpm, accuracy, duration, totalChars,
      correctChars, errorChars, effectiveKeystrokes, trace
    } = body

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Every numeric field consumed below must be a finite non-negative number;
    // anything else never comes from the real client and could dodge the
    // checks below (e.g. NaN comparisons are always false).
    const metrics = { cpm, wpm, accuracy, duration, totalChars, correctChars, errorChars, effectiveKeystrokes }
    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        return new Response(
          JSON.stringify({ error: `Invalid value for ${key}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    // Validate session exists and belongs to the user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('lt_practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if session is expired
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      await supabaseAdmin.from('lt_practice_sessions').delete().eq('id', sessionId)
      return new Response(
        JSON.stringify({ error: 'Session expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // The session (created by start-practice) is the source of truth for
    // which lesson was practiced; a client-supplied lessonId that differs
    // would let scores from an easy lesson land on another lesson's leaderboard.
    if (lessonId !== session.lesson_id) {
      return new Response(
        JSON.stringify({ error: 'lessonId does not match the practice session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Look up lesson from database to validate character count.
    // language/collection_id also come from here rather than the client.
    const { data: lessonData, error: lessonError } = await supabaseAdmin
      .from('lt_lessons')
      .select('character_count, language, collection_id')
      .eq('id', session.lesson_id)
      .single()

    if (lessonError || !lessonData) {
      return new Response(
        JSON.stringify({ error: 'Lesson not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // --- Anti-cheat validation ---
    const serverStartTime = new Date(session.created_at).getTime()
    const now = Date.now()
    const serverDurationMs = now - serverStartTime
    const serverDurationSec = serverDurationMs / 1000

    let isValid = true
    let cheatReason = null

    // Speed sanity check
    if (wpm > 150 || cpm > 750) {
      isValid = false
      cheatReason = 'Impossible speed'
    }

    // Character count validation against server-side lesson data
    if (isValid && totalChars !== lessonData.character_count) {
      isValid = false
      cheatReason = 'Character count mismatch'
    }

    // Duration upper-bound check
    if (duration > serverDurationSec + 10) {
      isValid = false
      cheatReason = 'Duration mismatch (upper)'
    }

    // Raw character throughput check. Unlike the cpm/wpm fields (which are
    // client-claimed), totalChars is validated against the lesson and duration
    // is bounded above, so this cannot be lied around. 750 chars/min matches
    // the cpm cap above; the 1s floor avoids flagging sub-second runs on
    // tiny lessons where the rounded duration is 0.
    if (isValid && totalChars > (Math.max(duration, 1) / 60) * 750) {
      isValid = false
      cheatReason = 'Impossible speed'
    }

    // Accuracy must match the character counts it is supposedly derived from
    // (±1 for rounding). Every typed character is either correct or an error,
    // so the two counts must add up.
    if (isValid) {
      if (correctChars > totalChars || correctChars + errorChars !== totalChars) {
        isValid = false
        cheatReason = 'Invalid character counts'
      } else {
        const serverAccuracy = totalChars > 0
          ? Math.round((correctChars / totalChars) * 100)
          : 100
        if (Math.abs(accuracy - serverAccuracy) > 1) {
          isValid = false
          cheatReason = 'Accuracy mismatch'
        }
      }
    }

    // A keystroke trace is mandatory: every check below is trace-based, so an
    // omitted or malformed trace (non-numbers dodge the comparisons) would
    // bypass them all. After this gate, isValid implies trace is a non-empty
    // array of finite non-negative numbers.
    const hasValidTrace = Array.isArray(trace) &&
      trace.length > 0 &&
      trace.every((t: unknown) => typeof t === 'number' && Number.isFinite(t) && t >= 0)
    if (isValid && !hasValidTrace) {
      isValid = false
      cheatReason = 'Missing or malformed keystroke trace'
    }

    // The client appends one trace entry per committed character (deletes
    // remove none, retypes append more), so a legitimate run has at least
    // totalChars entries. A stub trace (e.g. a single entry) would slip past
    // the length-gated checks below. Tolerance of 2 covers bundles built
    // before the engine fix, which dropped the first two entries.
    if (isValid && trace.length < totalChars - 2) {
      isValid = false
      cheatReason = 'Incomplete keystroke trace'
    }

    // Trace-based duration lower-bound check
    if (isValid) {
      const typingStartOffsetSec = trace[0] / 1000
      const expectedServerTypingDuration = serverDurationSec - typingStartOffsetSec
      if (duration > 0 && duration < expectedServerTypingDuration * 0.3 - 5) {
        isValid = false
        cheatReason = 'Duration mismatch (lower)'
      }
    }

    // Trace monotonicity and interval checks
    if (isValid && trace.length > 5) {
      for (let i = 1; i < trace.length; i++) {
        if (trace[i] < trace[i - 1]) {
          isValid = false
          cheatReason = 'Invalid trace: not ascending'
          break
        }
      }

      // Robotic keystroke variance check
      if (isValid) {
        let totalInterval = 0
        const intervals = []
        for (let i = 1; i < trace.length; i++) {
          const diff = trace[i] - trace[i - 1]
          intervals.push(diff)
          totalInterval += diff
        }
        const mean = totalInterval / intervals.length

        let sumSquares = 0
        for (const diff of intervals) {
          sumSquares += Math.pow(diff - mean, 2)
        }
        const variance = sumSquares / intervals.length

        if (variance < 10) {
          isValid = false
          cheatReason = 'Robotic keystroke variance'
        }
      }

      // Trace duration vs reported duration check
      if (isValid) {
        const traceDurationSec = trace[trace.length - 1] / 1000
        if (Math.abs(traceDurationSec - duration) > 5) {
          isValid = false
          cheatReason = 'Trace duration mismatch'
        }
      }

      // Removed trace.length === totalChars check because it fails for IME (Chinese) input and backspaces.
    }

    // Server-side CPM verification
    const keystrokesForCpm = effectiveKeystrokes || totalChars
    if (isValid && trace.length > 1 && keystrokesForCpm > 0) {
      const traceDurationSec = trace[trace.length - 1] / 1000
      if (traceDurationSec > 0) {
        const serverComputedCpm = Math.round(keystrokesForCpm / (traceDurationSec / 60))
        if (Math.abs(serverComputedCpm - cpm) > serverComputedCpm * 0.3) {
          isValid = false
          cheatReason = 'CPM mismatch with server calculation'
        }
      }
    }

    // --- Insert practice log ---
    const { data: logData, error: logError } = await supabaseAdmin
      .from('lt_practice_logs')
      .insert({
        user_id: user.id,
        lesson_id: session.lesson_id,
        session_id: sessionId,
        language: lessonData.language,
        collection_id: lessonData.collection_id,
        cpm, wpm, accuracy, duration,
        total_chars: totalChars,
        correct_chars: correctChars,
        error_chars: errorChars,
        trace: trace ? trace : null,
        is_valid: isValid,
      })
      .select('id')
      .single()

    if (logError) {
      console.error('Log Error:', logError)
      throw logError
    }

    // Clean up the used session
    await supabaseAdmin.from('lt_practice_sessions').delete().eq('id', sessionId)

    // Update best stats if this is a valid perfect run. correctChars ===
    // totalChars instead of the rounded accuracy field, which reports 100
    // from 99.5% upward.
    if (isValid && totalChars > 0 && correctChars === totalChars) {
      const { data: existingStats } = await supabaseAdmin
        .from('lt_user_lesson_stats')
        .select('best_cpm')
        .eq('user_id', user.id)
        .eq('lesson_id', session.lesson_id)
        .maybeSingle()

      if (!existingStats || cpm > existingStats.best_cpm) {
        await supabaseAdmin
          .from('lt_user_lesson_stats')
          .upsert({
            user_id: user.id,
            lesson_id: session.lesson_id,
            best_cpm: cpm,
            best_wpm: wpm,
            duration: duration,
            achieved_at: new Date().toISOString(),
          })
      }
    }

    return new Response(
      JSON.stringify({ success: true, logId: logData.id, cheatReason: isValid ? null : cheatReason }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
