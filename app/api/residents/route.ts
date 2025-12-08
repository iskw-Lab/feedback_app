import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = await createClient();
  

  const { searchParams } = new URL(request.url);
  const floor = searchParams.get('floor');

  if (!floor) {
    return NextResponse.json({ error: 'floorは必須です' }, { status: 400 });
  }

  try {
    // ★★★ select句に 'careplan_icf' を追加 ★★★
    const { data, error } = await supabase
      .from('care_recipient')
      .select('name, careplan_icf')
      .eq('floor', floor);

    if (error) throw error;

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Residents API error:', error.message);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}