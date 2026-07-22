// مخ المارد المشترك — نفس منطق راوت واتساب بالظبط، بس متاح لأي قناة
// (شات الموقع، تليجرام... إلخ). بننقله هنا عشان نعيد استخدامه من غير
// ما نلمس مسار الواتساب الشغّال.
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { MARID_TOOLS, runMaridTool, MADMONA_LINKS } from '@/lib/marid-tools'
import { ADMIN_TOOLS, runAdminTool, ADMIN_PROMPT } from '@/lib/marid-admin'

// المارد بيقدر يسأل الداتابيز قبل ما يرد: يبحث في الكتالوج، يشوف المتكلّم
// مين، يجيب حجوزاته، يسجّل إعلان. بندوّر الحلقة لحد ما يخلص أدوات.
export async function callMaridWithTools(opts: {
  systemPrompt: string
  userMessage: string
  mediaBlocks?: Array<Record<string, unknown>>
  senderPhone: string
  senderName: string | null
  savedMediaUrl?: string | null
  admin?: boolean
}): Promise<string> {
  const mediaBlocks = opts.mediaBlocks ?? []
  const MAX_TURNS = opts.admin ? 6 : 4
  const tools = opts.admin ? [...MARID_TOOLS, ...ADMIN_TOOLS] : MARID_TOOLS

  const system = `${opts.systemPrompt}${opts.admin ? ADMIN_PROMPT : ''}

═══════════════════════════════════════════════════════════
النهاردة
═══════════════════════════════════════════════════════════
${new Date().toLocaleString('ar-EG', {
  timeZone: 'Africa/Cairo',
  dateStyle: 'full',
  timeStyle: 'short',
})}
(بتوقيت القاهرة · ISO: ${new Date().toISOString()})

⛔ ماتسألش العميل عن التاريخ أو الساعة — إنت عارفهم.

═══════════════════════════════════════════════════════════
معلومات المتكلّم دلوقتي
═══════════════════════════════════════════════════════════
رقمه: ${opts.senderPhone}${opts.senderName ? `\nاسمه: ${opts.senderName}` : ''}

استخدم الرقم ده مباشرة في الأدوات — ماتسألهوش عليه.
${opts.savedMediaUrl ? `\n📎 الملف اللي بعته اتحفظ هنا:\n${opts.savedMediaUrl}\nلو هتسجّل إعلان، مرّر الرابط ده في image_urls.\n\n🧾 لو الصورة فيها منيو أو قائمة أسعار: اقرا كل صنف وسعره من الصورة نفسها وسجّلهم بـ create_listing_draft صنف صنف بسعره — الأسعار اللي في الصورة هي المصدر، متخترعش.\n` : ''}

═══════════════════════════════════════════════════════════
عندك أدوات — استخدمها
═══════════════════════════════════════════════════════════
• أي سؤال عن حاجة معينة → search_catalog قبل ما ترد
• «عندكم إيه؟» → list_categories
• **أول حاجة دايمًا: who_is_this** — ابعتله الرقم *والاسم*.
• «فين حجزي؟» → get_my_orders
• عايز يضيف منتج/خدمة → اجمع البيانات ثم create_listing_draft
• أي كلام عن **أوردر** → manage_order
• أي كلام عن **ميعاد** → manage_meeting
• search_catalog مارجّعش حاجة → record_unmet_demand فورًا

⚠️ ممنوع تخترع إعلان أو سعر أو لينك. لو الأداة مارجعتش حاجة، قول للعميل بصراحة إن ده مش متاح.

الروابط الرسمية:
${Object.entries(MADMONA_LINKS)
  .map(([k, v]) => `  ${k.replace(/_/g, ' ')}: ${v}`)
  .join('\n')}`

  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [
    {
      role: 'user',
      content:
        mediaBlocks.length > 0
          ? [...mediaBlocks, { type: 'text', text: opts.userMessage }]
          : opts.userMessage,
    },
  ]

  let droppedMedia = false

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let res
    try {
      res = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system,
        tools: tools as never,
        messages: messages as never,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isMediaIssue = /image|document|media|Could not process/i.test(msg)
      if (isMediaIssue && !droppedMedia && mediaBlocks.length > 0) {
        droppedMedia = true
        messages[0] = {
          role: 'user',
          content:
            `${opts.userMessage}\n\n(العميل بعت ملف مش قادر أفتحه — ` +
            `قوله كده بصراحة واطلب منه يبعت التفاصيل مكتوبة.)`,
        }
        continue
      }
      throw err
    }

    const toolUses = res.content.filter((c) => c.type === 'tool_use')

    if (!toolUses.length) {
      const textPart = res.content.find((c) => c.type === 'text')
      return textPart && textPart.type === 'text' ? textPart.text : ''
    }

    messages.push({ role: 'assistant', content: res.content })

    const results = []
    for (const tu of toolUses) {
      if (tu.type !== 'tool_use') continue
      const isAdminTool = ADMIN_TOOLS.some((t) => t.name === tu.name)

      // 📸 ضمان حفظ صورة العميل في مسودة الإعلان (حتى لو المارد نسي يمرّرها)
      //    عشان الإعلان ينزل الماركتبليس مش يعلق بلا صورة.
      let toolInput = tu.input as Record<string, unknown>
      if (tu.name === 'create_listing_draft' && opts.savedMediaUrl) {
        const existing = Array.isArray(toolInput.image_urls) ? (toolInput.image_urls as string[]) : []
        if (!existing.length) toolInput = { ...toolInput, image_urls: [opts.savedMediaUrl] }
      }

      const out = isAdminTool
        ? await runAdminTool(tu.name, toolInput)
        : await runMaridTool(tu.name, toolInput)
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(out),
      })
    }
    messages.push({ role: 'user', content: results })
  }

  // خلصت اللفّات ولسه بيطلب أدوات — نطلب رد نهائي من غير أدوات
  const final = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: `${system}\n\nخلاص كفاية أدوات — رد على العميل دلوقتي باللي عندك.`,
    messages: messages as never,
  })
  const t = final.content.find((c) => c.type === 'text')
  return t && t.type === 'text' ? t.text : ''
}
