// ☎️ /api/crm/call — المارد بيفرّغ المكالمة ويطلّع التاسكات
// =====================================================================
// محمد (٢١ أغسطس ٢٠٢٦):
//   «كل واحدة تعمل مكالمة نفرّغ المكالمة ونحطّ تاسكات بناءً عليها …
//    والمارد هو اللي هيفرّغ المكالمة ويحطّ التاسكات، ولو فيه حاجة ظهرت
//    تخصّ شخص تاني التاسك ينزل على الشخص التاني أوتوماتيك»
//
// الشغل هنا:
//   ١) بيتأكد من هوية الموظف بالتوكن (نفس نمط /api/team/marid)
//   ٢) بياخد نص المكالمة (اللي الموظف كتبه أو أملاه بصوته من الموبايل)
//   ٣) المارد بيطلّع منه: ملخّص · نتيجة المكالمة · معاد المتابعة · تاسكات
//      وكل تاسك معاه **تخصصه**
//   ٤) بينادي `crm_log_call` **بتوكن الموظف** — فالمكالمة بتتسجّل باسمه،
//      والتاسك اللي تخصصه مختلف بينزل عند مسؤول التخصص التاني لوحده.
//
// 🎙️ (٢٢ أغسطس ٢٠٢٦) محمد: «عايز التطبيق بتاعنا هو اللي يسجّل حتى لو
//    هيسجّل كلام الموظفين بتوعنا احنا بس» — اتعمل. الأبليكيشن بيسجّل صوت
//    حقيقي بالمايك، بيرفعه على bucket خاص `crm-calls`، والمسار بيتسجّل هنا
//    مع المكالمة (`p_audio_path`). التسجيل بيتسمع من ملف العميل بلينك موقّع.
//
// ⚠️ **حدّ تقني مينفعش نلفّ حواليه**: أندرويد وiOS بيقفلوا المايك على
//    المتصفح طول ما فيه مكالمة تليفون شغّالة. يعني التسجيل بيشتغل **بعد ما
//    يقفل**. التسجيل التلقائي للمكالمة بالصوتين محتاج **رقم مركزي
//    (VoIP/كول سنتر)** والمكالمات كلها تعدّي منه — قرار منفصل.
//
// ⚠️ لو المارد وقع لأي سبب، بنسجّل المكالمة **من غير تاسكات** بدل ما نضيّعها.
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callClaude, parseJsonResponse } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

type MaridOut = {
  summary_ar?: string
  outcome?: string
  next_action_at?: string | null
  tasks?: { title?: string; detail?: string; specialty?: string; priority?: string; due_at?: string }[]
}

const OUTCOMES = ['contacted', 'interested', 'offer_sent', 'won', 'lost', 'not_interested', 'no_answer', 'spam']

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  let body: {
    contactId?: string; transcript?: string; durationSec?: number
    channel?: string; direction?: string; skipMarid?: boolean
    outcome?: string; summary?: string
    // 🎙️ (٢٢ أغسطس ٢٠٢٦) التسجيل الصوتي الحقيقي — الملف نفسه بيترفع من
    //    المتصفح على bucket `crm-calls` بجلسة الموظف، وإحنا بنسجّل مساره.
    audioPath?: string; audioSeconds?: number; transcriptSource?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }

  const contactId = (body.contactId || '').trim()
  const transcript = (body.transcript || '').trim()
  if (!contactId) return NextResponse.json({ ok: false, error: 'مفيش عميل' }, { status: 400 })
  // ⚠️ التسجيل الصوتي لوحده كفاية — المكالمة اتسجّلت حتى لو مفيش نص
  if (!transcript && !body.summary && !body.audioPath) {
    return NextResponse.json({ ok: false, error: 'سجّل صوتك أو اكتب اللي حصل في المكالمة' }, { status: 400 })
  }

  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // ١) الهوية — بتوكن الموظف نفسه، مش بمفتاح سيرفر
  const userClient = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

  // ٢) سياق العميل + التخصصات المتاحة (عشان المارد يوجّه التاسك صح)
  const [{ data: contact }, { data: specs }] = await Promise.all([
    admin.from('crm_contacts')
      .select('id, phone, display_name, city, specialty, status, notes, raw_category')
      .eq('id', contactId).maybeSingle(),
    admin.from('crm_specialties').select('key, name_ar').eq('active', true),
  ])
  if (!contact) return NextResponse.json({ ok: false, error: 'العميل مش موجود' }, { status: 404 })

  const specList = ((specs ?? []) as { key: string; name_ar: string }[])
    .map(s => `${s.key} = ${s.name_ar}`).join(' · ')
  const c = contact as Record<string, unknown>

  let out: MaridOut = {}
  if (transcript && !body.skipMarid) {
    const systemPrompt = [
      'إنت «المارد» — مساعد فريق مبيعات مضمونة (منصة مصرية).',
      'الموظف خلّص مكالمة مع عميل وبيقولك اللي حصل. شغلتك تحوّل الكلام ده لشغل واضح.',
      '',
      'رجّع JSON بالشكل ده بالظبط ومن غير أي كلام تاني:',
      '{"summary_ar":"سطرين بالعامية المصرية عن اللي حصل",',
      ' "outcome":"واحدة من: contacted | interested | offer_sent | won | lost | not_interested | no_answer | spam",',
      ' "next_action_at":"تاريخ ISO لو العميل طلب نتواصل بعدين، أو null",',
      ' "tasks":[{"title":"خطوة واحدة واضحة","detail":"التفاصيل","specialty":"مفتاح التخصص","priority":"low|medium|high"}]}',
      '',
      `التخصصات المتاحة (استخدم المفتاح الإنجليزي بالظبط): ${specList}`,
      '',
      'قواعد مهمة:',
      '- التاسك يبقى خطوة واحدة يقدر حد ينفّذها، مش وصف للموقف.',
      '- **لو ظهر في المكالمة موضوع بتاع تخصص تاني، اعمله تاسك لوحده وحطّ له تخصصه** —',
      '  مثلاً عميل عقارات قال إن عنده عربية عايز يبيعها → تاسك تخصصه vehicles.',
      '- التخصص الافتراضي للتاسك هو تخصص العميل الحالي.',
      '- ماتخترعش وعود ولا أسعار ولا مواعيد مش موجودة في كلام الموظف.',
      '- لو المكالمة مردّش عليها: outcome = no_answer، وتاسك واحد بس للمحاولة تاني.',
      '- من غير تاسكات وهمية: لو مفيش خطوة حقيقية، رجّع tasks فاضية.',
    ].join('\n')

    const userMessage = [
      `العميل: ${(c.display_name as string) || (c.phone as string)}`,
      `رقمه: ${c.phone as string}`,
      c.city ? `المنطقة: ${c.city as string}` : '',
      `تخصصه عندنا: ${(c.specialty as string) || 'لسه مش متحدّد'}`,
      c.raw_category ? `تصنيفه الأصلي في الملف: ${c.raw_category as string}` : '',
      c.notes ? `ملاحظات سابقة: ${String(c.notes).slice(0, 300)}` : '',
      '',
      'كلام الموظف عن المكالمة:',
      transcript,
    ].filter(Boolean).join('\n')

    try {
      const raw = await callClaude({
        systemPrompt, userMessage, maxTokens: 1500, temperature: 0.2,
        agentName: 'crm-call-summarizer',
      })
      out = parseJsonResponse<MaridOut>(raw)
    } catch (e) {
      // المارد وقع — بنكمّل ونسجّل المكالمة من غير تاسكات بدل ما نضيّعها
      console.error('[crm/call] marid failed', e instanceof Error ? e.message : e)
      out = { summary_ar: transcript.slice(0, 300), outcome: 'contacted', tasks: [] }
    }
  } else {
    out = {
      summary_ar: body.summary
        || (transcript ? transcript.slice(0, 300) : undefined)
        || (body.audioPath ? 'مكالمة متسجّلة صوت — من غير تفريغ' : undefined),
      outcome: body.outcome, tasks: [],
    }
  }

  const outcome = OUTCOMES.includes(String(out.outcome)) ? out.outcome : (body.outcome || 'contacted')
  const tasks = (out.tasks || [])
    .filter(t => (t.title || '').trim())
    .slice(0, 6)
    .map(t => ({
      title: String(t.title).trim().slice(0, 200),
      detail: t.detail ? String(t.detail).slice(0, 600) : null,
      specialty: t.specialty || null,
      priority: ['low', 'medium', 'high'].includes(String(t.priority)) ? t.priority : 'medium',
      due_at: t.due_at || null,
    }))

  // ٣) التسجيل — **بتوكن الموظف** عشان auth.uid() تبقى هو، والتاسك يتنسب صح
  const { data: logged, error } = await userClient.rpc('crm_log_call' as never, {
    p_contact: contactId,
    p_transcript: transcript || null,
    p_summary: out.summary_ar || null,
    p_outcome: outcome,
    p_tasks: tasks,
    p_direction: body.direction || 'outbound',
    p_channel: body.channel || 'phone',
    p_duration_sec: body.durationSec ?? null,
    p_next_action_at: out.next_action_at || null,
    p_audio_path: body.audioPath || null,
    p_audio_seconds: body.audioSeconds ?? null,
    p_transcript_source: body.transcriptSource || null,
  } as never)

  if (error) {
    console.error('[crm/call] log failed', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  }
  const res = logged as unknown as { ok?: boolean; error?: string; tasks_created?: number; tasks_routed?: number; audio_saved?: boolean }
  if (res?.ok === false) return NextResponse.json({ ok: false, error: res.error }, { status: 400 })

  return NextResponse.json({
    ok: true,
    summary: out.summary_ar || null,
    outcome,
    next_action_at: out.next_action_at || null,
    tasks,
    tasks_created: res?.tasks_created ?? 0,
    tasks_routed: res?.tasks_routed ?? 0,
    audio_saved: res?.audio_saved ?? false,
  })
}
