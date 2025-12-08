import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { requestId, email } = await req.json()
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') ?? 'http://localhost:3000'
    const redirectTo = `${siteUrl}/account/update-password`

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: redirectTo } // この redirectTo オプションが正しく設定されているか確認
    )

    if (inviteError) throw inviteError

    const { error: updateError } = await supabaseAdmin
      .from('signup_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)

    if (updateError) throw updateError
    
    return new Response(JSON.stringify({ message: `Successfully approved ${email}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})