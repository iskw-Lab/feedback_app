import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  // セキュリティ: 認証チェック
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const dataDirectory = path.join(process.cwd(), 'data');
  try {
    const files = await fs.readdir(dataDirectory);
    const analysisFiles = files
      .filter((file) => file.endsWith('_analysis.json'))
      .map((file) => {
        const [year_month, floor_part] = file.replace('_analysis.json', '').split('_');
        const floor = floor_part === 'shokibo' ? '小規模多機能' : floor_part;
        return { year_month, floor };
      });

    // Group floors by year_month
    const groupedByYearMonth = analysisFiles.reduce((acc, current) => {
      const { year_month, floor } = current;
      if (!acc[year_month]) {
        acc[year_month] = [];
      }
      acc[year_month].push(floor);
      return acc;
    }, {} as Record<string, string[]>);

    return NextResponse.json(groupedByYearMonth);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return NextResponse.json({}); // Return empty object if directory doesn't exist
    }
    console.error('Error listing analysis files:', error);
    return NextResponse.json({ error: '分析ファイル一覧の取得に失敗しました。' }, { status: 500 });
  }
}

