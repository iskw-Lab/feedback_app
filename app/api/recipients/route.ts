import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.NODE_ENV === 'development'
  ? 'http://127.0.0.1:5328/sctipts/tag_icf'
  : `${process.env.VERCEL_URL}/scripts/tag_icf`;

// GET: 全ての利用者を取得
export async function GET() {
  const cookieStore = await cookies();
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('care_recipient')
      .select('id, name, floor, careplan')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 新規利用者を追加
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const body = await request.json();
  const { name, floor, careplan } = body;

  try {
    const { data: insertedData, error: insertError } = await supabase
      .from('care_recipient')
      .insert({ name, floor, careplan })
      .select()
      .single();

    if (insertError) throw insertError;

    if (careplan) {
      const pythonResponse = await fetch(PYTHON_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ careplan }),
      });

      if (pythonResponse.ok) {
        const result = await pythonResponse.json();
        const { error: updateError } = await supabase
          .from('care_recipient')
          .update({ careplan_icf: result.careplan_icf })
          .eq('id', insertedData.id);
        
        if (updateError) console.error("ICF update failed:", updateError.message);
      }
    }

    return NextResponse.json(insertedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


// ★★★ ここからが修正箇所 ★★★
// PUT: ケアプランを更新
export async function PUT(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const { id, careplan } = await request.json();

    if (!id) {
        return NextResponse.json({ error: "ID is required for update" }, { status: 400 });
    }

    try {
        // ステップ1: まずケアプランのテキスト自体を更新する
        const { data: updatedData, error: updateError } = await supabase
            .from('care_recipient')
            .update({ careplan: careplan })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        // ステップ2: ケアプランのテキストがあれば、Python APIを呼び出してICFタグを更新する
        if (careplan) {
            const pythonResponse = await fetch(PYTHON_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ careplan }),
            });

            if (pythonResponse.ok) {
                const result = await pythonResponse.json();
                // 取得したICFタグでcareplan_icfカラムを更新
                const { error: icfUpdateError } = await supabase
                    .from('care_recipient')
                    .update({ careplan_icf: result.careplan_icf })
                    .eq('id', id);
                
                if (icfUpdateError) {
                    console.error("ICF update failed after successful plan update:", icfUpdateError.message);
                }
            } else {
                 console.error("Python API call failed during update:", await pythonResponse.text());
            }
        } else {
            // もしケアプランが空にされた場合は、ICFタグもクリアする
            const { error: clearIcfError } = await supabase
                .from('care_recipient')
                .update({ careplan_icf: null })
                .eq('id', id);

            if (clearIcfError) {
                console.error("Failed to clear ICF tags:", clearIcfError.message);
            }
        }
        
        // 最初の更新結果をフロントエンドに返す
        return NextResponse.json(updatedData);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
// ★★★ ここまでが修正箇所 ★★★


// DELETE: 利用者を削除 (一括削除対応)
export async function DELETE(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    try {
        // 修正1: 'ids' (配列) として受け取る
        const { ids } = await request.json();

        // バリデーション: idsが配列でない、または空の場合はエラー
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: '削除対象のIDが選択されていません' }, { status: 400 });
        }

        // 修正2: .eq('id', id) ではなく .in('id', ids) を使う
        const { error } = await supabase
            .from('care_recipient')
            .delete()
            .in('id', ids);

        if (error) throw error;

        return NextResponse.json({ message: `${ids.length}件の利用者を削除しました` });

    } catch (error: any) {
        console.error("Delete Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}