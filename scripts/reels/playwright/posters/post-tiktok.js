// post-tiktok.js — يرفع ريل على TikTok Studio ويقف **قبل النشر**
//
// ليه اتعمل (٢٩/٨/٢٠٢٦): محمد: «نربط الفيديو بمكتبة الصوت بتاعته».
// مافيش بوستر تيك توك أصلاً في posters/ — كان فيه فيسبوك وانستجرام
// ولينكدإن وتويتر بس.
//
// ⛔ السكريبت ده **مابينشرش**. بيرفع الفيديو ويكتب الكابشن ويسيب
//    التبويبة مفتوحة عند خطوة المراجعة. اختيار الصوت والضغط على Post
//    بيتعملوا بإيد محمد — عن قصد، لسببين:
//      ١. النشر قرار بشري.
//      ٢. الصوت لازم يتاخد من مكتبة تيك توك نفسها جوّه الصفحة —
//         ريعنا الفيديوهات صامتة عشان بالظبط الخطوة دي.
//
// 🎵 مهم للحسابات التجارية: تيك توك بيقيّد البيزنس أكاونت على
//    Commercial Music Library. الأغاني الترند العادية ممكن تتشال
//    من الفيديو (mute) لو الحساب تجاري. اختار من المكتبة المتاحة
//    في الصفحة — هي اللي مضمونة قانونيًا.
//
// التشغيل:
//   powershell -File launch-chrome-social.ps1        (بورت 9223)
//   node posters/post-tiktok.js "output/madmona-reel-price.mp4" "الكابشن"

const path = require('path')
const fs = require('fs')

const CDP_URL = process.env.CDP_URL || 'http://localhost:9223'
const UPLOAD_URL = 'https://www.tiktok.com/tiktokstudio/upload'

// جولة تيك توك التعريفية: بنجرب نقفلها بزراير Skip/Got it، ولو فضلت
// بنشيل الأوفرلاي نفسه من الصفحة (بيرجع تاني لو اتعمل ريفريش — مش تعديل دائم).
async function dismissTour(page) {
  const labels = ['Skip', 'Got it', 'Close', 'Done', 'تخطي', 'حسنًا', 'تم']
  for (let i = 0; i < 6; i++) {
    const portal = await page.locator('#react-joyride-portal').count()
    if (!portal) return
    let clicked = false
    for (const l of labels) {
      const b = page.locator(`#react-joyride-portal button:has-text("${l}")`).first()
      if (await b.count()) { await b.click({ timeout: 3000 }).catch(() => {}); clicked = true; break }
    }
    if (!clicked) {
      const x = page.locator('#react-joyride-portal [aria-label*="lose" i], #react-joyride-portal [aria-label*="kip" i]').first()
      if (await x.count()) { await x.click({ timeout: 3000 }).catch(() => {}); clicked = true }
    }
    await page.waitForTimeout(700)
    if (!clicked) break
  }
  if (await page.locator('#react-joyride-portal').count()) {
    console.log('[tt] الجولة التعريفية مش قافلة بالزراير — بشيل الأوفرلاي')
    await page.evaluate(() => {
      document.querySelectorAll('#react-joyride-portal, .react-joyride__overlay').forEach(e => e.remove())
    }).catch(() => {})
  }
}

async function main() {
  const mp4Arg = process.argv[2]
  const caption = process.argv[3] || ''

  if (!mp4Arg) {
    console.error('الاستخدام: node posters/post-tiktok.js "<mp4>" "<caption>"')
    process.exit(1)
  }
  const mp4 = path.resolve(mp4Arg)
  if (!fs.existsSync(mp4)) { console.error(`الفيديو مش موجود: ${mp4}`); process.exit(1) }

  const { chromium } = require('playwright')
  console.log(`[tt] connecting to ${CDP_URL}…`)
  const browser = await chromium.connectOverCDP(CDP_URL)
  const ctx = browser.contexts()[0]
  if (!ctx) throw new Error('مفيش context — شغّل launch-chrome-social.ps1 الأول')

  const page = await ctx.newPage()
  await page.bringToFront()
  console.log(`[tt] opening ${UPLOAD_URL}`)
  await page.goto(UPLOAD_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(6000)

  if (/login|signup/i.test(page.url())) {
    console.error('[tt] ❌ الحساب مش مسجّل دخول في كروم السوشيال. سجّل الأول وبعدين شغّل تاني.')
    await browser.close(); process.exit(1)
  }

  // الرفع — TikTok Studio بيفتكر آخر درافت، فالـinput مش دايمًا موجود.
  // في الحالة دي بيبقى فيه زرار Replace بيفتح نافذة اختيار ملف. (٢٩/٨/٢٠٢٦)
  console.log(`[tt] uploading ${path.basename(mp4)}…`)
  const input = page.locator('input[type="file"]').first()
  const hasInput = await input.count().catch(() => 0)

  if (hasInput) {
    await input.setInputFiles(mp4)
  } else {
    const replace = page.locator('button:has-text("Replace"), div[role="button"]:has-text("Replace")').first()
    if (!(await replace.count())) {
      console.error('[tt] ❌ مفيش خانة رفع ولا زرار Replace — الصفحة في حالة مش متوقعة.')
      await page.screenshot({ path: path.join(__dirname, '..', 'diag', 'tt-no-input.png') }).catch(() => {})
      await browser.close(); process.exit(1)
    }
    console.log('[tt] فيه درافت قديم — بستبدله')
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 20000 }),
      replace.click(),
    ])
    await chooser.setFiles(mp4)
  }

  // استنى المعالجة — بنستنى ظهور محرر الكابشن مش وقت ثابت
  console.log('[tt] waiting for the editor…')
  const editor = page.locator('div[contenteditable="true"]').first()
  await editor.waitFor({ state: 'visible', timeout: 180000 }).catch(() => {
    console.log('[tt] ⚠️ محرر الكابشن ماظهرش في ٣ دقايق — الصفحة سايبة مفتوحة عشان تشوفها')
  })
  await page.waitForTimeout(3000)

  // تيك توك بيفتح جولة تعريفية (react-joyride) وأوفرلاي بتاعها بيبلع
  // كل الكليكات — لازم تتقفل الأول وإلا الكتابة في الكابشن مابتوصلش.
  await dismissTour(page)

  // الكابشن — بمحاولات وتحقق بعد كل واحدة.
  // 🐞 (٢٩/٨) أول مرة الكابشن طلع **فاضي تمامًا**: الكليك على المحرر
  //    مابيضمنش إن الفوكس راح له فعلًا، فـinsertText بيروح في الفراغ.
  //    الحل: نتأكد من document.activeElement قبل الكتابة، ونتحقق من
  //    النتيجة بعدها، ونعيد لحد ٣ مرات.
  if (caption && await editor.count()) {
    const want = caption.replace(/\s+/g, ' ').trim()
    let ok = false

    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      console.log(`[tt] writing caption… (محاولة ${attempt})`)

      // نودّي الفوكس للمحرر من جوّه الصفحة — أضمن من الكليك
      const focused = await page.evaluate(() => {
        const el = document.querySelector('div[contenteditable="true"]')
        if (!el) return false
        el.focus()
        const r = document.createRange(); r.selectNodeContents(el)
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r)
        return document.activeElement === el || el.contains(document.activeElement)
      }).catch(() => false)

      if (!focused) { await editor.click({ timeout: 8000 }).catch(() => {}) }
      await page.waitForTimeout(600)

      await page.keyboard.press('Control+A')
      await page.keyboard.press('Backspace')
      await page.waitForTimeout(400)
      await page.keyboard.insertText(caption)
      await page.waitForTimeout(1800)

      const got = (await editor.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
      if (got === want) {
        ok = true
        console.log('[tt] ✅ الكابشن اتكتب مظبوط (اتقارن حرف بحرف)')
      } else if (got && got.length > want.length * 0.6) {
        ok = true
        console.log('[tt] ⚠️ الكابشن اتكتب بس مش مطابق ١٠٠٪ — راجعه قبل النشر')
        console.log('[tt]    الموجود:', got.slice(0, 80))
      } else {
        console.log(`[tt] ⚠️ الكابشن فاضي أو ناقص (${got.length} حرف) — بعيد`)
      }
    }

    if (!ok) {
      console.log('[tt] ❌ الكابشن مااتكتبش بعد ٣ محاولات — الصقه بإيدك من الكونفيج')
    }
  }

  // 💾 نحفظ درافت بدل ما نسيب الصفحة وفيها زرار Post جاهز.
  // ليه (٢٩/٨/٢٠٢٦): أول تشغيل الفيديو اتنشر فعلًا وهو صامت — وتيك توك
  // **مابيسمحش تغيّر الصوت بعد النشر** (الإجراء الوحيد للبوست المنشور
  // هو Analytics). يعني نشر بالغلط = الفيديو محروق ولازم يتمسح ويترفع
  // تاني. الدرافت بيخلّي الحالة الافتراضية آمنة.
  let saved = false
  const draftBtn = page.locator('button:has-text("Save draft"), div[role="button"]:has-text("Save draft")').first()
  if (await draftBtn.count()) {
    console.log('[tt] saving draft…')
    await draftBtn.click({ timeout: 15000 }).catch(e => console.log('[tt] ⚠️ الحفظ فشل:', e.message))
    await page.waitForTimeout(5000)
    saved = true
  } else {
    console.log('[tt] ⚠️ مالقيتش زرار Save draft — سايب الصفحة زي ما هي')
  }

  const shotDir = path.join(__dirname, '..', 'diag', 'post-tiktok')
  fs.mkdirSync(shotDir, { recursive: true })
  const shot = path.join(shotDir, `${Date.now()}.png`)
  await page.screenshot({ path: shot }).catch(() => {})

  console.log(`
[tt] ${saved ? '💾 اتحفظ كدرافت' : '⚠️ ماتحفظش — راجع الصفحة'}
[tt] 📸 ${shot}

⛔ مانشرش حاجة — ومش هينشر أبدًا. السكريبت ده عمره ما بيدوس Post.

⚠️ الصوت لازم يتحط **قبل** النشر. تيك توك مابيسمحش تغيّره بعد كده
   (الإجراء الوحيد لفيديو منشور هو Analytics) — يعني لو اتنشر صامت،
   الحل الوحيد إنه يتمسح ويترفع من الأول.

افتح الدرافت من TikTok Studio ← Drafts، وبعدين:
  ١. Edit ← Sounds ← اختار من Royalty-free sounds
     (الحساب التجاري مقيّد بالمكتبة دي — أي أغنية من بره ممكن تتشال)
  ٢. راجع الكابشن
  ٣. دوس Post بإيدك`)

  // مابنقفلش الصفحة ولا المتصفح — محمد محتاجها مفتوحة
  await browser.close().catch(() => {})
}

main().catch(e => { console.error('[tt] ERROR:', e.message); process.exit(1) })
