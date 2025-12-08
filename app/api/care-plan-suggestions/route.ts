import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const icfCategoryMap: Record<string, string[]> = {
    "BADL": ["d5", "d4", "b"],
    "IADL": ["d6", "d2"],
    "コミュニケーション": ["d3", "d7"],
    "環境": ["e"],
};

export async function GET(request: NextRequest) {
  // ★★★ Correctly initialize the client ONCE at the top ★★★
  const cookieStore = await cookies();
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const floor = searchParams.get('floor');
  const category = searchParams.get('category');

  if (!floor || !category) {
    return NextResponse.json({ error: 'floorとcategoryは必須です' }, { status: 400 });
  }

  const icfPrefixes = icfCategoryMap[category];
  if (!icfPrefixes) {
    return NextResponse.json({});
  }

  try {
    const { data: recipients, error } = await supabase
      .from('care_recipient')
      .select('name, careplan_icf')
      .eq('floor', floor);

    if (error) throw error;
    if (!recipients) return NextResponse.json({});

    const suggestions = recipients.reduce((acc, recipient) => {
      if (!Array.isArray(recipient.careplan_icf)) return acc;
      
      const matchedPlans = recipient.careplan_icf
        .filter(plan => 
          plan.icf_codes && icfPrefixes.some(prefix => 
            plan.icf_codes.some((code: string) => code.startsWith(prefix))
          )
        )
        .map(plan => plan.plan);

      if (matchedPlans.length > 0) {
        acc[recipient.name] = matchedPlans;
      }
      return acc;
    }, {} as Record<string, string[]>);
    
    return NextResponse.json(suggestions);

  } catch (error: any) {
    console.error('Care plan suggestions API error:', error.message);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}