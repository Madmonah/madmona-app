import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Simple password-gate. The password is read from the env var ADMIN_PASSWORD
// and never exposed to the client. Admin page sends it in the X-Admin-Password header.

function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    // If no admin password is configured, refuse access entirely
    return false
  }
  const provided = request.headers.get('x-admin-password')
  return provided === expected
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // @ts-expect-error - Supabase JS v2.45+ generic type quirk (see next.config.mjs)
  const { data, error } = await supabase
    .from('booking_leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[admin/leads] fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }

  return NextResponse.json({ leads: data ?? [] })
}

// PATCH endpoint to update lead status (e.g. mark as 'contacted' / 'confirmed')
export async function PATCH(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { id, status } = body as Record<string, unknown>

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const allowedStatuses = ['new', 'contacted', 'confirmed', 'cancelled']
  if (typeof status !== 'string' || !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // @ts-expect-error - Supabase JS v2.45+ generic type quirk
  const { error } = await supabase
    .from('booking_leads')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('[admin/leads] update error:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
