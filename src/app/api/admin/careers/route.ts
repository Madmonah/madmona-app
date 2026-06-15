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
    // Pull from BOTH tables:
    //  - employee_join_requests = web-form applicants from /careers (has salary, city, job_title)
    //  - job_applications       = WhatsApp inbound bot-captured applicants
    const [webRes, waRes] = await Promise.all([
      supabase
        .from('employee_join_requests')
        .select('id, full_name, phone_normalized, email, job_title, city, last_salary_egp, expected_salary_egp, status, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('job_applications')
        .select('id, full_name, phone, email, position, cv_url, message, education, expected_salary, source, status, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    if (webRes.error) throw webRes.error;
    if (waRes.error) throw waRes.error;

    // Normalize web-form rows to the unified shape used by the UI
    const webRows = (webRes.data || []).map((r: any) => ({
      id: r.id,
      full_name: r.full_name,
      phone: r.phone_normalized,
      email: r.email,
      position: r.job_title,
      cv_url: r?.metadata?.cv_url || null,
      message: r?.metadata?.why_join || null,
      education: null,
      expected_salary: r.expected_salary_egp ? String(r.expected_salary_egp) : null,
      source: 'website',
      status: r.status || 'pending',
      created_at: r.created_at,
      _source_table: 'employee_join_requests',
      _city: r.city,
      _last_salary: r.last_salary_egp,
    }));

    const waRows = (waRes.data || []).map((r: any) => ({
      ...r,
      _source_table: 'job_applications',
    }));

    // Merge, sort by created_at desc
    const merged = [...webRows, ...waRows].sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({
      applications: merged,
      count: merged.length,
      web_count: webRows.length,
      whatsapp_count: waRows.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'unknown' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, source_table } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 });
    }

    const ALLOWED = ['new', 'pending', 'reviewing', 'shortlisted', 'interviewed', 'hired', 'rejected'];
    if (!ALLOWED.includes(status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }

    // Default to job_applications for backwards-compat, switch table if caller specifies.
    const table = source_table === 'employee_join_requests' ? 'employee_join_requests' : 'job_applications';

    const { error } = await supabase
      .from(table)
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'unknown' }, { status: 500 });
  }
}
