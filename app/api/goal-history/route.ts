import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId');

  if (!profileId) {
    return NextResponse.json({ error: 'プロファイルIDは必須です。' }, { status: 400 });
  }
  const cookieStore = await cookies();
  const supabase = await createClient();
  try {
    // ★★★ 修正箇所 ★★★
    // .single() を使わず、複数行の結果を配列として取得する
    const { data, error } = await supabase
      .from('goal_history')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // dataは常に配列（結果がなくても空の配列[]）
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}