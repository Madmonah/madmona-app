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

  // الكابشن — نمسح اللي تيك توك بيحطه (اسم الملف) وبعدين نكتب
  if (caption && await editor.count()) {
    console.log('[tt] writing caption…')
    await editor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    // ⚠️ ممنوع keyboard.type هنا. محرر تيك توك (DraftJS) مع العربي RTL
    // بيقلب ترتيب الحروف لما تتكتب واحد واحد — أول تجربة طلعت
    // «مابنخصممش من لالبايع» و«مضمونة سفي النص». insertText بيدخّل
    // النص مرة واحدة كحدث beforeinput فالترتيب بيفضل سليم. (٢٩/٨/٢٠٢٦)
    await page.keyboard.insertText(caption)
    await page.waitForTimeout(1200)

    // تحقق: نقرا اللي اتكتب فعلًا ونقارنه
    const got = (await editor.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
    const want = caption.replace(/\s+/g, ' ').trim()
    if (got === want) {
      console.log('[tt] ✅ الكابشن اتكتب مظبوط (اتقارن حرف بحرف)')
    } else {
      console.log('[tt] ⚠️ الكابشن اللي في الصفحة مش مطابق — راجعه بنفسك قبل النشر')
      console.log('[tt]    المطلوب:', want.slice(0, 90))
      console.log('[tt]    الموجود:', got.slice(0, 90))
    }
  }

  const shotDir = path.join(__dirname, '..', 'diag', 'post-tiktok')
  fs.mkdirSync(shotDir, { recursive: true })
  const shot = path.join(shotDir, `${Date.now()}.png`)
  await page.screenshot({ path: shot }).catch(() => {})

  console.log(`
[tt] ✅ الفيديو اترفع والكابشن اتكتب.
[tt] 📸 ${shot}

⛔ السكريبت وقف هنا عن قصد — مانشرش حاجة.

الخطوتين الباقيين بإيدك في التبويبة المفتوحة:
  ١. اختار الصوت من مكتبة الأصوات في الصفحة
     (لو الحساب تجاري، خد من Commercial Music Library — غير كده
      تيك توك ممكن يشيل الصوت من الفيديو)
  ٢. راجع الكابشن ودوس Post

التبويبة سايبة مفتوحة.`)

  // مابنقفلش الصفحة ولا المتصفح — محمد محتاجها مفتوحة
  await browser.close().catch(() => {})
}

main().catch(e => { console.error('[tt] ERROR:', e.message); process.exit(1) })
