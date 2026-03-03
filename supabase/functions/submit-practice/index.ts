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
      sessionId, lessonId, language, collectionId,
      cpm, wpm, accuracy, duration, totalChars,
      correctChars, errorChars, effectiveKeystrokes, trace
    } = body

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
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

    // Duration upper-bound check
    if (duration > serverDurationSec + 10) {
      isValid = false
      cheatReason = 'Duration mismatch (upper)'
    }

    // Trace-based duration lower-bound check
    if (isValid && trace && Array.isArray(trace) && trace.length > 0) {
      const typingStartOffsetSec = trace[0] / 1000
      const expectedServerTypingDuration = serverDurationSec - typingStartOffsetSec
      if (duration > 0 && duration < expectedServerTypingDuration * 0.3 - 5) {
        isValid = false
        cheatReason = 'Duration mismatch (lower)'
      }
    }

    // Trace monotonicity and interval checks
    if (isValid && trace && Array.isArray(trace) && trace.length > 5) {
      for (let i = 1; i < trace.length; i++) {
        if (trace[i] - trace[i - 1] < 0) {
          isValid = false
          cheatReason = 'Invalid trace: negative interval'
          break
        }
      }

      if (isValid) {
        for (let i = 1; i < trace.length; i++) {
          if (trace[i] < trace[i - 1]) {
            isValid = false
            cheatReason = 'Invalid trace: not ascending'
            break
          }
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
    if (isValid && trace && Array.isArray(trace) && trace.length > 1 && keystrokesForCpm > 0) {
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
        lesson_id: lessonId,
        session_id: sessionId,
        language: language || 'unknown',
        collection_id: collectionId || 'unknown',
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

    // Update best stats if this is a valid 100% accuracy run
    if (isValid && accuracy === 100) {
      const { data: existingStats } = await supabaseAdmin
        .from('lt_user_lesson_stats')
        .select('best_cpm')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle()

      if (!existingStats || cpm > existingStats.best_cpm) {
        await supabaseAdmin
          .from('lt_user_lesson_stats')
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
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
