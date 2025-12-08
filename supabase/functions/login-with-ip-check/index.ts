import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// セキュリティ: IPアドレスを環境変数から取得
// 環境変数 ALLOWED_IP_ADDRESSES にカンマ区切りでIPアドレスを設定
// 例: ALLOWED_IP_ADDRESSES=127.0.0.1,::1,192.168.1.1
const allowedIpsEnv = Deno.env.get('ALLOWED_IP_ADDRESSES');
if (!allowedIpsEnv) {
  console.error('CRITICAL: ALLOWED_IP_ADDRESSES environment variable is not set. IP filtering will block all requests.');
}
const ALLOWED_IPS = allowedIpsEnv 
  ? allowedIpsEnv.split(',').map(ip => ip.trim()).filter(Boolean)
  : []; 

// ★★★ ここからが修正箇所 ★★★
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // すべてのオリジンを許可 (開発用)。本番では 'http://localhost:3000' などに制限
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// ★★★ ここまでが修正箇所 ★★★

serve(async (req) => {
  try {
    // ★★★ 修正: OPTIONS (preflight) リクエストに対応 ★★★
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // (ここから先のロジックは変更なし)
    console.log('Function invoked. Method:', req.method);

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: corsHeaders });
    }

    let email, password;
    try {
      const body = await req.json();
      email = body.email;
      password = body.password;
      if (!email || !password) throw new Error('Email and password are required.');
    // deno-lint-ignore no-unused-vars
    } catch (e: unknown) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: corsHeaders });
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim();
    if (!clientIp || !ALLOWED_IPS.includes(clientIp)) {
      return new Response(JSON.stringify({ error: 'Access from your IP is not allowed.' }), { status: 403, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 401, headers: corsHeaders });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: unknown) {
    if (err instanceof Error) console.error('Unhandled error:', err.message, err.stack);
    else console.error('Unhandled unknown error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: corsHeaders });
  }
});