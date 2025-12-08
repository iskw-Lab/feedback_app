import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// POST: 新規スタッフ追加
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { name, floor } = await request.json();

  if (!name || !floor) {
    return NextResponse.json({ error: '名前とフロアは必須です' }, { status: 400 });
  }

  try {
    const { data: profileData, error: profileError } = await supabase
      .from('staff_profiles')
      .insert({ name: name })
      .select().single();
    if (profileError) throw profileError;

    const { data: memberData, error: memberError } = await supabase
      .from('staff_member')
      .insert({ floor: floor, profile_id: profileData.id })
      .select().single();
    if (memberError) throw memberError;

    return NextResponse.json(memberData);
  } catch (error: any) {
    console.error('スタッフ追加APIエラー:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ★★★ 修正(PUT)ハンドラを追加 ★★★
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { id, profile_id, name, floor } = await request.json();

  if (!id || !profile_id || !name || !floor) {
    return NextResponse.json({ error: '必要な情報が不足しています' }, { status: 400 });
  }

  try {
    // 2つのテーブルを同時に更新
    const [profileResult, memberResult] = await Promise.all([
      supabase.from('staff_profiles').update({ name }).eq('id', profile_id),
      supabase.from('staff_member').update({ floor }).eq('id', id)
    ]);

    if (profileResult.error) throw profileResult.error;
    if (memberResult.error) throw memberResult.error;

    return NextResponse.json({ message: 'スタッフ情報を更新しました' });
  } catch (error: any) {
    console.error('スタッフ更新APIエラー:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ★★★ 削除(DELETE)ハンドラを追加 ★★★
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { profile_ids } = await request.json(); // 単一IDではなく、IDの配列を受け取る

  if (!Array.isArray(profile_ids) || profile_ids.length === 0) {
    return NextResponse.json({ error: '削除するIDの配列が必要です' }, { status: 400 });
  }

  try {
    // ステップ1: 関連するstaff_memberの行をすべて削除
    const { error: memberError } = await supabase
        .from('staff_member')
        .delete()
        .in('profile_id', profile_ids);
    if (memberError) throw memberError;

    // ステップ2: staff_profilesの行をすべて削除
    const { error: profileError } = await supabase
        .from('staff_profiles')
        .delete()
        .in('id', profile_ids);
    if (profileError) throw profileError;

    return NextResponse.json({ message: '選択されたスタッフを削除しました' });
  } catch (error: any) {
    console.error('スタッフ一括削除APIエラー:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}