import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // ★★★ Correctly initialize the client ONCE at the top ★★★
  const cookieStore = await cookies();
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId');

  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const { data: submission, error } = await supabase
      .from('checklist_submissions')
      .select('answers, submitted_at')
      .eq('profile_id', profileId)
      .gte('submitted_at', `${today}T00:00:00.000Z`)
      .lte('submitted_at', `${today}T23:59:59.999Z`)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({ submission });
  } catch (error: any) {
    console.error('Checklist submission fetch error:', {
      message: error.message,
      details: error.stack,
      hint: error.hint,
      code: error.code,
    });
    return NextResponse.json({ error: 'Failed to fetch checklist submission' }, { status: 500 });
  }
}