import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers'; // ★ Import cookies
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies(); // ★ Get the cookie store
  const supabase = await createClient(); // ★ Pass it to the client
  
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('profileId');

  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }

  try {
    const { data: submission, error } = await supabase
      .from('checklist_submissions')
      .select('answers, submitted_at')
      .eq('profile_id', profileId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({ submission });
  } catch (error: any) {
    console.error('Checklist submission fetch error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch checklist submission' }, { status: 500 });
  }
}