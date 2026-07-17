// 🎬 تحميل فيديوهات الشات
// ⚠️ الطريق الحقيقي (اتأكد بالعين 15 يوليو 2026):
//    بلاطة الميديا **مالهاش منيو ولا شيفرون**. لازم:
//    اضغط البلاطة → العارض بيفتح → فيه زرار «⬇ 23 MB» (الفيديو لسه على الموبايل)
//    → اضغطه عشان يجيبه → بعدين زرار التحميل الحقيقي
const fs = require('fs');
const path = require('path');
const { wa, sleep } = require('./wa-lib');
const DL = 'E:\\madmona-app\\.wa-dl';

const زرار_الجلب = () => {
  // الزرار اللي مكتوب عليه حجم (زي «23 MB») في نص العارض
  const c = [...document.querySelectorAll('div,span,button')]
    .filter((e) => /^\s*\d+([.,]\d+)?\s*(MB|KB|ميجا)\s*$/i.test((e.innerText || '').trim()))
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 40 && r.width < 400 && r.y > 100; });
  if (!c.length) return null;
  const r = c[0].getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, نص: c[0].innerText.trim() };
};

(async () => {
  if (!fs.existsSync(DL)) fs.mkdirSync(DL, { recursive: true });
  const { p } = await wa();
  await p.bringToFront();
  const cdp = await p.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true });

  for (let n = 0; n < 8; n++) {
    // 1) زرار الجلب لو الفيديو لسه على الموبايل
    const g = await p.evaluate(زرار_الجلب);
    if (g) {
      console.log('⏬ بجلب من الموبايل:', g.نص);
      await p.mouse.click(g.x, g.y);
      // استنى لحد ما الفيديو يوصل
      for (let i = 0; i < 40; i++) {
        await sleep(2000);
        const جه = await p.evaluate(() => !!document.querySelector('video') || !document.querySelector('[data-icon="media-cancel"]'));
        if (جه) break;
      }
      await sleep(2000);
    }

    // 2) دلوقتي المفروض فيه زرار تحميل حقيقي في الهيدر
    const قبل = fs.readdirSync(DL);
    const d = await p.evaluate(() => {
      const c = [...document.querySelectorAll('[data-icon]')]
        .filter((e) => /down|save/i.test(e.getAttribute('data-icon') || ''))
        .filter((e) => e.getBoundingClientRect().width > 5);
      if (!c.length) return null;
      const r = c[0].getBoundingClientRect();
      return { icon: c[0].getAttribute('data-icon'), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    console.log('  زرار التحميل:', JSON.stringify(d));
    if (d) {
      await p.mouse.click(d.x, d.y);
      for (let i = 0; i < 60; i++) {
        await sleep(2000);
        const نزل = fs.readdirSync(DL).filter((f) => !f.endsWith('.crdownload') && !قبل.includes(f));
        if (نزل.length) {
          const mb = (fs.statSync(path.join(DL, نزل[0])).size / 1048576).toFixed(1);
          console.log('  ✅', نزل[0], `(${mb}MB)`);
          break;
        }
      }
    }

    // 3) التالي (السهم الشمال في العارض)
    const nx = await p.evaluate(() => {
      const c = [...document.querySelectorAll('[role="button"], button, div')]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 40 && r.width < 90 && r.height > 40 && r.height < 90 && r.x < 250 && r.y > 400 && r.y < 700; });
      if (!c.length) return null;
      const r = c[0].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!nx) { console.log('مفيش تالي'); break; }
    await p.mouse.click(nx.x, nx.y);
    await sleep(2500);
  }
  console.log('\nعلى الديسك:', fs.readdirSync(DL).filter((f) => !f.endsWith('.crdownload')).length);
  process.exit(0);
})();
