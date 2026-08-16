// 🧞 مخ المارد — **المصدر الوحيد** لتعليمات وأدوات المارد في كل القنوات.
//
// ⚠️ (٢٥ يوليو ٢٠٢٦ — محمد: «راجع المسارات وراجع التعليمات بتاعة المارد
//    وطبّقها على الكل، ومش عايز تداخل يوقف النظام بأي شكل»)
//
//    كان فيه **نسختين** من الدالة دي: واحدة هنا للشات، وواحدة متكرّرة جوه
//    `api/whatsapp/baileys/route.ts` للواتساب. والنسختين اتفرّقوا فعلاً —
//    نسخة الشات كانت **أضعف**: ناقصة `get_referral_code` و
//    `record_job_application`، وناقصة أهم سطر («اقرا التاريخ وكمّل من حيث
//    انتهيتوا») وتفاصيل `manage_order`/`manage_meeting`/`record_unmet_demand`.
//    يعني «المارد الرسمي» على الموقع كان بيرد أقل كفاءة من مارد الواتساب،
//    ومحدش واخد باله.
//
//    دلوقتي **نسخة واحدة**: أي مارد — قديم أو جديد أو مارد المنصة نفسها —
//    بينادي من هنا وياخد نفس التعليمات ونفس الأدوات بالظبط. أي تعليمة
//    جديدة تتكتب هنا **مرة واحدة** وتسري على الكل فورًا.
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { logAiUsage } from '@/lib/ai-usage'
import { supabaseUntyped as db } from '@/lib/supabase'
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
  // 📊 للقياس بس — اختياريين، ولو مابعتّهمش مفيش أي فرق في السلوك
  channel?: string | null
  conversationId?: string | null
}): Promise<string> {
  const mediaBlocks = opts.mediaBlocks ?? []
  const MAX_TURNS = opts.admin ? 6 : 4
  const tools = opts.admin ? [...MARID_TOOLS, ...ADMIN_TOOLS] : MARID_TOOLS

  // 🪪 كارت المتكلّم (٣ أغسطس ٢٠٢٦) — بدل ما المارد ينادي who_is_this كأداة
  //    في كل رسالة (نداء كامل لكلود = ٢٢ ألف توكن عشان ١٥٠ توكن معلومة)،
  //    بنقراه من الداتابيز هنا في استعلام واحد (~20ms) ونحقنه في البرومبت.
  //    الجدول marid_contact_card بيتعبّى أوتوماتيك بتريجرات — زي asset_owners.
  //    لو الاستعلام وقع، بنكمّل من غيره والمارد هيرجع ينادي الأداة زي الأول.
  let contactBlock = ''
  try {
    const { data } = await db.rpc('marid_contact_block', {
      p_phone: opts.senderPhone,
      p_name: opts.senderName,
    })
    if (typeof data === 'string' && data.trim()) contactBlock = data
    else console.warn('[marid] الكارت رجع فاضي — هنرجع لـ who_is_this')
  } catch (e) {
    console.warn('[marid] كارت المتكلّم مش متاح — بنكمّل بالأداة:', e instanceof Error ? e.message : String(e))
  }

  // ⚠️ (٣ أغسطس ٢٠٢٦) لو الكارت فشل لأي سبب، **لازم** ترجع تعليمة who_is_this.
  //    من غير ده بيحصل أوحش سيناريو: لا كارت ولا أداة — فالمارد يتعامل مع كل
  //    عميل قديم كأنه أول مرة. النسخة اللي قبل دي كانت بتقول «ماتنادّيش
  //    who_is_this» حتى لما الكارت فاضي.

  const systemRaw = `${opts.systemPrompt}${opts.admin ? ADMIN_PROMPT : ''}<<<CACHE_SPLIT>>>

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
«بكرة» و«بعد بكرة» و«الأسبوع الجاي» احسبهم بنفسك من التاريخ ده.

⛔ التاريخ اللي فوق **لمعرفتك بس** — ماتقارنهوش بوقت رسالة العميل ولا بأي
رسالة قديمة في المحادثة، وماتستنتجش منه إن فيه تأخير حصل.
ممنوع تعتذر عن التأخير خالص: لا «آسف على التأخير» ولا «آسفين جدًا على
التأخير في الرد» ولا «معلش على التأخير» ولا أي صيغة تلفت نظر العميل لوقت
الرد. ابدأ الرد بالمفيد على طول.
(٣٠ يوليو ٢٠٢٦: الاعتذار ده كان طالع في ١٩٪ من ردود المارد — العميل مكانش
شاكي من حاجة، والمارد هو اللي بيفتح الموضوع ويورّي إن فيه مشكلة.)

═══════════════════════════════════════════════════════════
معلومات المتكلّم دلوقتي
═══════════════════════════════════════════════════════════
${contactBlock || `رقمه: ${opts.senderPhone}${opts.senderName ? `\nاسمه: ${opts.senderName}` : ''}`}

استخدم الرقم ده مباشرة في الأدوات — ماتسألهوش عليه.
${opts.savedMediaUrl ? `\n📎 الملف اللي بعته اتحفظ هنا:\n${opts.savedMediaUrl}\nلو هتسجّل إعلان أو مشروع، مرّر الرابط ده في image_urls كصورة.\n\n🧾 لو الصورة فيها منيو أو قائمة أسعار: اقرا كل صنف وسعره من الصورة نفسها (إنت شايفها)، وسجّلهم بـ create_listing_draft صنف صنف — كل صنف باسمه وسعره اللي في الصورة، مش صورة واحدة بلا تفاصيل. الأسعار اللي في الصورة هي المصدر، متخترعش.\n` : ''}

═══════════════════════════════════════════════════════════
عندك أدوات — استخدمها
═══════════════════════════════════════════════════════════
• أي سؤال عن حاجة معينة → search_catalog قبل ما ترد
• «عندكم إيه؟» → list_categories
${contactBlock
  ? `• **بيانات المتكلّم فوق جاهزة — ماتنادّيش who_is_this عليها.**
  اقرا كارت المتكلّم كويس وكمّل من حيث انتهيتوا. الناس بتزعل جدًا لما تسأل
  عن حاجة شرحوها قبل كده، وبتزعل أكتر لما تعامل عميل قديم كأنه أول مرة.
  نادِ who_is_this **بس** في حالتين: الكارت قال «مُعرّف مخفي ومفيش ربط»،
  أو الكلام مش متطابق مع الكارت وعايز تتأكد.`
  : `• **أول حاجة دايمًا: who_is_this** — ابعتله الرقم *والاسم*.
  لو رجّعلك تاريخ سابق، اقراه كويس وكمّل من حيث انتهيتوا.
  الناس بتزعل جدًا لما تسأل عن حاجة شرحوها قبل كده.`}
• «فين حجزي؟» → get_my_orders
• عايز يضيف منتج/خدمة → اجمع البيانات، **نادِ list_categories الأول لو مش متأكد من التصنيف
  الصح**، وبعدين create_listing_draft بالـslug الحقيقي اللي رجعلك.
  ⛔ ممنوع تخترع category_slug من دماغك (زي "restaurants" أو "real-estate") —
  لو مش لاقي تصنيف مناسب في list_categories سيب category_slug فاضي والأداة
  هتتصرف صح (تدوّر بالمعنى وتعمل تصنيف جديد لو محتاج، مش تحط حاجة عشوائية).
• أي سؤال عن **سعر الذهب** (عيار 24/21/18) أو **الدولار/اليورو/الاسترليني/الريال** → get_financial_prices
  الأسعار لحظية على الموقع — ماتقولش «مش متاح» وماتخترعش سعر، نادِ الأداة.
• عايز يشتغل معانا أو بعت سيرة ذاتية → record_job_application
• أي كلام عن **أوردر** (قبول/رفض/إلغاء/استفسار) → manage_order
  الأداة بتتأكد من الصلاحية بنفسها. ماتأكّدش على حاجة قبل ما ترجّع ok.
• أي كلام عن **ميعاد** (حجز/إلغاء/استفسار) → manage_meeting
  ⛔ ممنوع تقول ميعاد من دماغك ولا توعد بحاجة مش مسجّلة
• **search_catalog مارجّعش حاجة مناسبة** → نادِ record_unmet_demand
  **فورًا وقبل ما ترد**. ماتستأذنش وماتقولش «تحب أسجّلهولك؟» —
  سجّله وبعدين قول للعميل إنك سجّلته وهترجعله.
  الطلب اللي مايتسجّلش بيضيع للأبد.
• أي سؤال عن **سعر الذهب** (عيار 24/21/18) أو **الدولار/اليورو/الاسترليني/الريال** → get_financial_prices
  الأسعار لحظية. ماتخترعش سعر من دماغك — الأداة بترجّع نفس اللي ظاهر فوق في الموقع.
• أي سؤال عن **سعر عقار/شقة/فيلا/محل** في منطقة (العاصمة/التجمع/الساحل/أكتوبر...) → get_property_prices
  ابعت اسم المنطقة لو حدّدها. ماتخترعش سعر عقار — الأداة بترجّع أسعار بورصة مضمونة الحقيقية.

⚠️ ممنوع تخترع إعلان أو سعر أو لينك. لو الأداة مارجعتش حاجة،
قول للعميل بصراحة إن ده مش متاح — ده أحسن ألف مرة من معلومة غلط.

الروابط الرسمية:
${Object.entries(MADMONA_LINKS)
  .map(([k, v]) => `  ${k.replace(/_/g, ' ')}: ${v}`)
  .join('\n')}`

  // 💰 Prompt caching (28 Jul 2026) — نكاش الجزء الثابت (البرومبت + تعريفات الأدوات).
  // حلقة الأدوات بتنادي Claude لحد ٤ مرات لكل رسالة بنفس الـsystem+tools — فالكاش
  // بيتقري ٣ مرات جوّه الرسالة الواحدة (توفير مضمون مهما كان معدّل الرسايل). دمج
  // الجزئين بيرجّع البرومبت الأصلي بالحرف (العلامة بتتشال) فسلوك المارد زيّه بالظبط.
  const _sp = systemRaw.split('<<<CACHE_SPLIT>>>')
  const system: Array<Record<string, unknown>> =
    _sp.length === 2
      ? [
          // ⏱️ (٣ أغسطس ٢٠٢٦) TTL ساعة بدل ٥ دقايق. البادئة (الأدوات + البرومبت)
          //    ~٢٢ ألف توكن، وكتابتها من أول وجديد أغلى ١٢٫٥ مرة من قراءتها.
          //    بـ٥ دقايق كانت بتموت بين العناقيد فبندفع كتابة جديدة كل شوية.
          //    القراءة نفسها بتجدّد الـTTL ببلاش — فالمحادثة النشطة بتفضل دافية.
          { type: 'text', text: _sp[0], cache_control: { type: 'ephemeral', ttl: '1h' } },
          { type: 'text', text: _sp[1] },
        ]
      : [{ type: 'text', text: _sp.join('') }]

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
    const _t0 = Date.now()
    try {
      res = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        // 💸 (١٦ أغسطس ٢٠٢٦ — محمد: «تكلفة المارد عالية شوية»)
        //
        //    الإخراج أغلى توكن عندنا ($15/مليون مقابل $3 للإدخال و$0.30
        //    للكاش). كان ٢٠٤٨، وفعلاً اتوصل للسقف: رد واحد يوم ١٦ أغسطس
        //    طلع ٢٠٤٨ توكن كامل — ده مش رد واتساب، ده مقال.
        //
        //    ١٢٠٠ توكن ≈ ٦٠٠+ كلمة عربي، أكتر من كفاية لرد واتساب
        //    (متوسط الرد الحالي ٣٦٧ توكن)، وبيقفل الباب على الردود
        //    اللي بتخرج عن السيطرة.
        //
        // ⚠️ مانزلناش أكتر من كده عن قصد: أدوار استخدام الأدوات بتحتاج
        //    مساحة للـinputs، وقصّها بيكسر النداء مش بس يقصّر الرد.
        max_tokens: 1200,
        system: system as never,
        tools: tools as never,
        messages: messages as never,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isMediaIssue = /image|document|media|Could not process/i.test(msg)
      if (isMediaIssue && !droppedMedia && mediaBlocks.length > 0) {
        console.warn('[marid] الميديا مش مقروءة — بنكمّل من غيرها:', msg.slice(0, 120))
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

    // 📊 قياس بس — fire-and-forget، مايأخّرش الرد ولا بيقدر يكسره
    logAiUsage({
      agentName: 'المارد',
      channel: opts.channel ?? null,
      conversationId: opts.conversationId ?? null,
      model: CLAUDE_MODEL,
      turn,
      cacheTtl: '1h',
      latencyMs: Date.now() - _t0,
      usage: res.usage as never,
    })

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
      console.log('[marid-tool]', tu.name, JSON.stringify(out).slice(0, 160))
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(out),
      })
    }
    messages.push({ role: 'user', content: results })
  }

  // خلصت اللفّات ولسه بيطلب أدوات — نطلب رد نهائي من غير أدوات
  //
  // 🐛 إصلاح (٣ أغسطس ٢٠٢٦): كان مكتوب `system: \`${system}\n\n…\``
  //    و `system` مصفوفة كائنات — فالـ template literal كان بيحوّلها للنص
  //    الحرفي "[object Object],[object Object]". يعني النداء الأخير ده كان
  //    بيروح لكلود **من غير برومبت المارد خالص**: لا شخصية، لا روابط، ولا
  //    قاعدة «ماتخترعش سعر ولا إعلان». وده بيحصل تحديدًا في المحادثات
  //    الطويلة اللي استهلكت كل اللفّات — أكتر وقت العميل محتاج فيه رد مضبوط.
  //
  //    بنبعت البلوكات زي ما هي + التعليمة كبلوك أخير. وبنشيل cache_control
  //    لأن النداء ده من غير أدوات فبادئته مختلفة عن المكاشة أصلاً — كتابة
  //    كاش هنا هتتدفع وماحدش هيقراها.
  const finalSystem = system.map((b) => ({ type: 'text', text: b.text }))
  finalSystem.push({ type: 'text', text: 'خلاص كفاية أدوات — رد على العميل دلوقتي باللي عندك.' })

  const _tf = Date.now()
  const final = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: finalSystem as never,
    messages: messages as never,
  })

  logAiUsage({
    agentName: 'المارد',
    channel: opts.channel ?? null,
    conversationId: opts.conversationId ?? null,
    model: CLAUDE_MODEL,
    turn: MAX_TURNS,
    isFinal: true,
    cacheTtl: '1h',
    latencyMs: Date.now() - _tf,
    usage: final.usage as never,
  })

  const t = final.content.find((c) => c.type === 'text')
  return t && t.type === 'text' ? t.text : ''
}
