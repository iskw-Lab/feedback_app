import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

// --- 1. IP許可リストのセットアップ (コメントアウト) ---

// 環境変数（カンマ区切り）からIPリストを取得
// const ipListString = process.env.ALLOWED_IP_ADDRESSES;

// 文字列を配列に変換
// const ALLOWED_IP_ADDRESSES = ipListString
//   ? ipListString.split(',').map(ip => ip.trim()).filter(Boolean)
//   : [];

// 開発環境 (NODE_ENV === 'development') ではチェックをスキップするかどうか
// const allowLocalhost = process.env.NODE_ENV === 'development';

export async function middleware(request: NextRequest) {
  
  // --- 2. IPアドレスのチェックを実行 (コメントアウト) ---
  // const ip = request.ip;

  // console.log("Middleware: 検出されたIPアドレス:", ip);

  // if (allowLocalhost && (!ip || ip === '127.0.0.1' || ip === '::1')) {
  //   // 開発環境のローカルホストは常に許可し、次の認証チェックに進む
  // } else {
  //   // 開発環境以外、またはローカルホスト以外からのアクセス
    
  //   // 環境変数が設定されていない場合 (安全策としてブロック)
  //   if (ALLOWED_IP_ADDRESSES.length === 0) {
  //     console.warn("ALLOWED_IP_ADDRESSES 環境変数が設定されていません。");
  //     return new NextResponse('Configuration Error.', { status: 500 });
  //   }

  //   // IPが許可リストに含まれていない場合は 403 Forbidden を返す
  //   if (!ip || !ALLOWED_IP_ADDRESSES.includes(ip)) {
  //     return new NextResponse('Access Denied: Your IP is not allowed.', {
  //       status: 403,
  //     });
  //   }
  // }
  
  // --- 3. 認証チェック (IPが許可された場合のみ実行) ---
  
  // リクエストとレスポンスを更新するためのクライアントを作成
  const { supabase, response } = createClient(request);

  // 現在のセッション（ログイン情報）を取得
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // ユーザーがアクセスしようとしているパス名を取得
  const pathname = request.nextUrl.pathname;

  // ログインしておらず、かつログインページ（'/'）にアクセスしようとしていない場合
  if (!session && pathname !== '/') {
    // ログインページにリダイレクト
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/'; // ログインページ（'/'）を指定
    return NextResponse.redirect(redirectUrl);
  }

  // ログイン済みだが、'/' (ログインページ) にアクセスしようとしている場合
  if (session && pathname === '/') {
    // ダッシュボードにリダイレクト
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  // IPが許可されており、リダイレクトも不要な場合にのみ、
  // Supabaseクライアント（セッション情報）を含んだレスポンスを返す
  return response;
}

// Middlewareをどのページで実行するかを指定
export const config = {
  matcher: [
    /*
     * すべてのパスを監視対象とする
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};