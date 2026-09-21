import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '@supabase/supabase-js/cors'
import { findInvalidMetric, validateRun } from './validate.ts'

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

    const metrics = { cpm, wpm, accuracy, duration, totalChars, correctChars, errorChars, effectiveKeystrokes }
    const invalidMetric = findInvalidMetric(metrics)
    if (invalidMetric) {
      return new Response(
        JSON.stringify({ error: `Invalid value for ${invalidMetric}` }),
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

    // --- Anti-cheat validation (see validate.ts) ---
    const serverDurationSec = (Date.now() - new Date(session.created_at).getTime()) / 1000
    const { isValid, cheatReason } = validateRun(
      { ...metrics, trace },
      { lessonCharacterCount: lessonData.character_count, serverDurationSec }
    )

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
