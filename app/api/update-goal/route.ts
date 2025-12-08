import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  // セキュリティ: 認証チェック
  const cookieStore = await cookies();
  const supabase = await createAuthClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { profileId, oldGoal, newGoal, status, comment } = await request.json();

  // セキュリティ: 入力値の検証
  if (!profileId || typeof profileId !== 'string') {
    return NextResponse.json({ error: '不正なプロファイルIDです' }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    if (status === 'achieved' && oldGoal && oldGoal.trim() !== '') {
      await supabaseAdmin.from('goal_history').insert({
        profile_id: profileId,
        goal_text: oldGoal,
        status: 'achieved',
        comment: comment,
      });
    }

    // ★★★ ここからが修正箇所 ★★★
    // staff_member テーブルではなく、staff_profiles テーブルを更新する
    const { data, error: updateError } = await supabaseAdmin
      .from('staff_profiles') // テーブル名を変更
      .update({ target: newGoal })
      .eq('id', profileId) // 条件を profileId に変更
      .select('target');
      
    if (updateError) throw updateError;
    if (!data || data.length === 0) {
      throw new Error(`指定されたプロファイルID (${profileId}) が見つかりませんでした。`);
    }
    // ★★★ ここまでが修正箇所 ★★★

    return NextResponse.json(data[0]);
    
  } catch (error: any) {
    console.error('Full error in /api/update-goal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}