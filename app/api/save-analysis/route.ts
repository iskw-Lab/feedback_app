import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const mapFloorForFilename = (floor: string): string => {
    if (floor === "小規模多機能") return "shokibo";
    return floor;
};

// サーバーサイド用のSupabaseクライアント
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  // セキュリティ: 認証チェック
  const cookieStore = await cookies();
  const supabase = await createAuthClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try { // ★★★ 修正: 不足していた '{' を追加 ★★★
    const { year_month, floor, data } = await request.json();

    if (!year_month || !floor || !data) {
      return NextResponse.json({ error: '年月、フロア、データは必須です。' }, { status: 400 });
    }

    // --- 1. Upsert staff members to Supabase ---
    // ★★★ 修正: as string[] を追加してTypeScriptの型エラーを解決 ★★★
    const staffToUpsert = ([...new Set(data.map((item: any) => (((item.登録者苗字 || "") + (item.登録者名前 || "")).trim())))] as string[])
      .filter(Boolean)
      .map((name: string) => {
          const staffRow = data.find((row: any) => (((row.登録者苗字 || "") + (row.登録者名前 || "")).trim()) === name);
          return {
              name: name,
              floor: staffRow?.フロア名 || "未分類" // staffRowが存在しない場合に備えて '?' を追加
          };
      });

    if (staffToUpsert.length > 0) {
        const { error: upsertError } = await supabaseAdmin
            .from('staff_member')
            .upsert(staffToUpsert, { onConflict: 'name,floor' }); 
        
        if (upsertError) throw upsertError;
    }


    // --- 2. Save the JSON file to the server ---
    const dataDirectory = path.join(process.cwd(), 'data');
    // セキュリティ: ディレクトリパスの検証
    const expectedDataDir = path.join(process.cwd(), 'data');
    if (dataDirectory !== expectedDataDir) {
      return NextResponse.json({ error: '不正なディレクトリパスです' }, { status: 400 });
    }
    await fs.mkdir(dataDirectory, { recursive: true });

    const safeFloor = mapFloorForFilename(floor);
    // セキュリティ: year_monthとfloorの検証
    if (!/^\d{6}$/.test(year_month)) {
      return NextResponse.json({ error: '不正な年月形式です' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(safeFloor)) {
      return NextResponse.json({ error: '不正なフロア名です' }, { status: 400 });
    }
    
    const filename = `${year_month}_${safeFloor}_analysis.json`;
    const filePath = path.join(dataDirectory, filename);
    
    // セキュリティ: パストラバーサル対策
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(expectedDataDir)) {
      return NextResponse.json({ error: '不正なファイルパスです' }, { status: 400 });
    }

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    return NextResponse.json({ message: `${year_month} (${floor}) のデータを保存し、スタッフ情報を更新しました。` });
  } catch (error: any) {
    console.error('Error in save-analysis API:', error);
    return NextResponse.json({ error: `ファイルの保存またはスタッフ情報の更新に失敗しました: ${error.message}` }, { status: 500 });
  }
}

