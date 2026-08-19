// src/app/api/admin/staff/route.ts
// =====================================================================
// 🔐 (١٩ أغسطس ٢٠٢٦ — محمد: «هعمل صفحة إدارة الموظفين وانتا تضيفهم بنفسك»
//    ثم «اربط [الأدوار بالصلاحيات]») — إدارة حسابات الأدمن (platform_admins).
// GET    → قايمة الموظفين (أي أدمن داخل يقدر يشوفها)
// POST/PATCH/DELETE → owner بس (ربط الدور بالصلاحية: أدمن عادي مايقدرش
//    يضيف/يمسح/يعطّل حسابات تانية — ده كان بالظبط ثغرة الباسورد المشترك
//    القديم: أي حد داخل = صلاحيات كاملة من غير تدرّج).
// =====================================================================

import { NextResponse } from 'next/server'
import { getPlatformAdminFromRequest } from '@/lib/platformAdmin'
import { platformAdminDb, hashPassword, passwordStrengthError } from '@/lib/platformAdmin'
import { normalizePhone } from '@/lib/auth-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireOwner(req: Request): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const me = await getPlatformAdminFromRequest(req)
  if (!me) return { ok: false, res: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  if (me.role !== 'owner') {
    return { ok: false, res: NextResponse.json({ error: 'الصلاحية دي لـ owner بس — كلّم صاحب الحساب' }, { status: 403 }) }
  }
  return { ok: true }
}

export async function GET(req: Request) {
  const me = await getPlatformAdminFromRequest(req)
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = platformAdminDb()
  const { data, error } = await db
    .from('platform_admins')
    .select('id, full_name, email, phone, role, status, last_login_at, created_at')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, staff: data ?? [], me: { role: me.role } })
}

export async function POST(req: Request) {
  const gate = await requireOwner(req)
  if (!gate.ok) return gate.res

  let body: { full_name?: string; email?: string; phone?: string; password?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 })
  }

  const full_name = (body.full_name || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const phoneRaw = (body.phone || '').trim()
  const password = body.password || ''
  const role = body.role === 'owner' ? 'owner' : 'admin'

  if (!full_name) return NextResponse.json({ error: 'اسم الموظف مطلوب' }, { status: 400 })
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'إيميل غير صالح' }, { status: 400 })
  const phone = normalizePhone(phoneRaw)
  if (!phone) return NextResponse.json({ error: 'رقم موبايل مصري غير صالح' }, { status: 400 })
  const pwErr = passwordStrengthError(password)
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 })

  const db = platformAdminDb()
  const { data, error } = await db
    .from('platform_admins')
    .insert({
      full_name,
      email,
      phone,
      password_hash: hashPassword(password),
      role,
      status: 'active',
    } as never)
    .select('id, full_name, email, phone, role, status, created_at')
    .single()

  if (error) {
    const msg = /duplicate key.*email/i.test(error.message)
      ? 'الإيميل ده مستخدم لموظف تاني'
      : /duplicate key.*phone/i.test(error.message)
        ? 'الرقم ده مستخدم لموظف تاني'
        : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ ok: true, staff: data })
}

export async function PATCH(req: Request) {
  const gate = await requireOwner(req)
  if (!gate.ok) return gate.res

  let body: { id?: string; status?: string; new_password?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 })
  }
  const id = (body.id || '').trim()
  if (!id) return NextResponse.json({ error: 'معرّف الموظف مطلوب' }, { status: 400 })

  const db = platformAdminDb()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.status) {
    if (!['active', 'disabled'].includes(body.status)) {
      return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 })
    }
    // مايتعطلش آخر owner نشط — عشان محدش يقفل الأدمن على نفسه بالغلط
    if (body.status === 'disabled') {
      const { data: target } = await db.from('platform_admins').select('role').eq('id', id).maybeSingle()
      if ((target as { role?: string } | null)?.role === 'owner') {
        const { count } = await db
          .from('platform_admins')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'owner')
          .eq('status', 'active')
        if ((count ?? 0) <= 1) {
          return NextResponse.json({ error: 'مينفعش تعطّل آخر حساب owner نشط' }, { status: 400 })
        }
      }
      // تعطيل الحساب = إلغاء كل جلساته النشطة فورًا
      await db.from('platform_admin_sessions').delete().eq('admin_id', id)
    }
    updates.status = body.status
  }

  if (body.role) {
    if (!['owner', 'admin'].includes(body.role)) {
      return NextResponse.json({ error: 'صلاحية غير صالحة' }, { status: 400 })
    }
    updates.role = body.role
  }

  if (body.new_password) {
    const pwErr = passwordStrengthError(body.new_password)
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 })
    updates.password_hash = hashPassword(body.new_password)
    // تغيير الباسورد = إلغاء كل الجلسات القديمة (لو حد سرق التوكن يخرج)
    await db.from('platform_admin_sessions').delete().eq('admin_id', id)
  }

  const { data, error } = await db
    .from('platform_admins')
    .update(updates as never)
    .eq('id', id)
    .select('id, full_name, email, phone, role, status')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, staff: data })
}

export async function DELETE(req: Request) {
  const gate = await requireOwner(req)
  if (!gate.ok) return gate.res

  let body: { id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 })
  }
  const id = (body.id || '').trim()
  if (!id) return NextResponse.json({ error: 'معرّف الموظف مطلوب' }, { status: 400 })

  const db = platformAdminDb()
  const { data: target } = await db.from('platform_admins').select('role').eq('id', id).maybeSingle()
  if ((target as { role?: string } | null)?.role === 'owner') {
    const { count } = await db
      .from('platform_admins')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
      .eq('status', 'active')
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'مينفعش تمسح آخر حساب owner' }, { status: 400 })
    }
  }

  await db.from('platform_admin_sessions').delete().eq('admin_id', id)
  const { error } = await db.from('platform_admins').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
