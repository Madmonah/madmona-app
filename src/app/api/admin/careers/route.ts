// app/api/admin/careers/route.ts
// Madmona Admin — Job Applications API

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select('id, full_name, phone, email, position, cv_url, message, education, expected_salary, source, status, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    return NextResponse.json({ applications: data || [], count: (data || []).length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'unknown' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 });
    }

    const ALLOWED = ['new', 'reviewing', 'shortlisted', 'interviewed', 'hired', 'rejected'];
    if (!ALLOWED.includes(status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }

    const { error } = await supabase
      .from('job_applications')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'unknown' }, { status: 500 });
  }
}
