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

    const { lessonId } = await req.json()

    if (!lessonId) {
      return new Response(
        JSON.stringify({ error: 'lessonId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Cleanup: remove expired sessions for this user
    await supabaseAdmin
      .from('lt_practice_sessions')
      .delete()
      .eq('user_id', user.id)
      .lt('expires_at', new Date().toISOString())

    // Cleanup: remove any existing session for this user+lesson
    await supabaseAdmin
      .from('lt_practice_sessions')
      .delete()
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)

    // Create a new session
    const { data, error } = await supabaseAdmin
      .from('lt_practice_sessions')
      .insert({
        user_id: user.id,
        lesson_id: lessonId,
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ sessionId: data.id }),
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
