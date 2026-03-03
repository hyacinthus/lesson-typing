import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseAuthClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: userError?.message || 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabaseClient = createClient(
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
      return new Response(JSON.stringify({ error: 'sessionId is required' }), { status: 400, headers: corsHeaders })
    }

    const { data: session, error: sessionError } = await supabaseClient
      .from('lt_practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 400, headers: corsHeaders })
    }

    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      await supabaseClient.from('lt_practice_sessions').delete().eq('id', sessionId)
      return new Response(JSON.stringify({ error: 'Session expired' }), { status: 400, headers: corsHeaders })
    }

    const serverStartTime = new Date(session.created_at).getTime()
    const now = Date.now()
    const serverDurationMs = now - serverStartTime
    const serverDurationSec = serverDurationMs / 1000

    let isValid = true
    let cheatReason = null

    if (wpm > 300 || cpm > 1500) {
      isValid = false
      cheatReason = 'Impossible speed'
    }

    if (duration > serverDurationSec + 10) {
      isValid = false
      cheatReason = 'Duration mismatch (upper)'
    }

    if (isValid && trace && Array.isArray(trace) && trace.length > 0) {
      const typingStartOffsetSec = trace[0] / 1000
      const expectedServerTypingDuration = serverDurationSec - typingStartOffsetSec
      if (duration > 0 && duration < expectedServerTypingDuration * 0.3 - 5) {
        isValid = false
        cheatReason = 'Duration mismatch (lower)'
      }
    }

    if (isValid && trace && Array.isArray(trace) && trace.length > 5) {
      for (let i = 1; i < trace.length; i++) {
        if (trace[i] - trace[i - 1] <= 0) {
          isValid = false
          cheatReason = 'Invalid trace: non-positive interval'
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
      
      if (isValid) {
        const traceDurationSec = trace[trace.length - 1] / 1000
        if (Math.abs(traceDurationSec - duration) > 5) {
          isValid = false
          cheatReason = 'Trace duration mismatch'
        }
      }

      if (isValid && totalChars && trace.length !== totalChars) {
        isValid = false
        cheatReason = 'Trace length mismatch with totalChars'
      }
    }

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

    const { data: logData, error: logError } = await supabaseClient
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
        is_valid: isValid
      })
      .select('id')
      .single()

    if (logError) {
      console.error('Log Error:', logError)
      throw logError
    }

    await supabaseClient.from('lt_practice_sessions').delete().eq('id', sessionId)

    if (isValid && accuracy === 100) {
      const { data: existingStats } = await supabaseClient
        .from('lt_user_lesson_stats')
        .select('best_cpm')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle()

      if (!existingStats || cpm > existingStats.best_cpm) {
        await supabaseClient
          .from('lt_user_lesson_stats')
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            best_cpm: cpm,
            best_wpm: wpm,
            duration: duration,
            achieved_at: new Date().toISOString()
          })
      }
    }

    return new Response(
      JSON.stringify({ success: true, logId: logData.id, cheatReason: isValid ? null : cheatReason }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
