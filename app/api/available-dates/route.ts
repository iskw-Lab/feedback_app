import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  // セキュリティ: 認証チェック
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const staffName = searchParams.get('staffName');

  if (!staffName) {
    return NextResponse.json({ error: 'スタッフ名が指定されていません。' }, { status: 400 });
  }

  const dataDirectory = path.join(process.cwd(), 'data');
  const availableDates: { year_month: string; floor: string }[] = [];

  try {
    const files = await fs.readdir(dataDirectory);
    for (const file of files) {
      if (file.endsWith('_analysis.json')) {
        const filePath = path.join(dataDirectory, file);
        const fileContents = await fs.readFile(filePath, 'utf8');
        const analysisData = JSON.parse(fileContents);

        const staffExists = analysisData.some(
          (row: any) => ((row.登録者苗字 || "") + (row.登録者名前 || "")).trim() === staffName
        );

        if (staffExists) {
          const [year_month, floor_part] = file.replace('_analysis.json', '').split('_');
          const floor = floor_part === 'shokibo' ? '小規模多機能' : floor_part;
          availableDates.push({ year_month, floor });
        }
      }
    }
    
    availableDates.sort((a, b) => b.year_month.localeCompare(a.year_month));
    return NextResponse.json(availableDates);

  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return NextResponse.json([]); // No data directory
    }
    console.error('Error finding available dates:', error);
    return NextResponse.json({ error: '利用可能な年月の検索中にエラーが発生しました。' }, { status: 500 });
  }
}
