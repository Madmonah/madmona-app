// 🎯 الحصّادة النهائية — شات بشات، بتسجّل رقم الباعت مع كل ملف (عشان الربط يبقى آمن)
// بتشتغل لوحدها وبتكمّل من حيث وقفت. شغّلها وسيبها.
//
// ⚠️ الحقيقة اللي اتعلمتها: الميديا القديمة مش على الكمبيوتر — هي على موبايل محمد.
//    العارض بيبيّن زرار «⬇ 23 MB» يعني الملف لسه متجابش. الضغط عليه بيخلّي
//    الموبايل يرفعه (بياخد وقت). وبعدين بس ينفع نحمّله.
const fs = require('fs');
const path = require('path');
const { wa, openChat, sleep } = require('./wa-lib');

const DL = 'E:\\madmona-app\\.wa-dl';
const LOG = __dirname + '/pull-log.json';

// الأولوية: أصحاب أصول عندهم ملفات ضايعة
const أهداف = [
  { رقم: '01026222337', اسم: 'TEST Fix — تجربة' },
  { رقم: '01111534331', اسم: 'Abdo Taha — قوافل' },
  { رقم: '01116694565', اسم: 'Ahmed Badawy — URD/G-Bay' },
  { رقم: '01122655156', اسم: 'Mary Gamil — Glow Terra' },
  { رقم: '01090633436', اسم: 'Ahmed Sabbour — Nedit' },
  { رقم: '01020343538', اسم: 'AmR — أناكاجي' },
  { رقم: '01010909801', اسم: 'Eb Sadek — G-Bay' },
  { رقم: '01116550504', اسم: 'nour — Helio Eye' },
  { رقم: '01111149240', اسم: 'Mahmoud Abdelaziz — IVY' },
  { رقم: '01228788367', اسم: 'Loey Abo Emira — HDP' },
  { رقم: '01008898872', اسم: 'Osama — AMG' },
  { رقم: '01143098889', اسم: 'khaledraouf27' },
];

const سجل = () => (fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : []);
const احفظ = (s) => fs.writeFileSync(LOG, JSON.stringify(s, null, 1));

async function افتح_الميديا(p) {
  const h = await p.evaluate(() => {
    const el = document.querySelector('#main header');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + 200, y: r.y + r.height / 2 };
  });
  if (!h) return false;
  await p.mouse.click(h.x, h.y);
  await sleep(2500);
  const b = await p.evaluate(() => {
    const c = [...document.querySelectorAll('div,button,span')]
      .filter((e) => /media, links and docs/i.test(e.innerText || '') && (e.innerText || '').length < 60);
    if (!c.length) return null;
    const r = c[c.length - 1].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!b) return false;
  await p.mouse.click(b.x, b.y);
  await sleep(3000);
  return true;
}

// بلاطات الميديا في لوحة الشات
async function بلاطات(p) {
  return p.evaluate(() =>
    [...document.querySelectorAll('[data-icon="msg-video"], [data-icon="msg-image"]')]
      .map((ic) => {
        let cur = ic;
        for (let i = 0; i < 6 && cur; i++) {
          const r = cur.getBoundingClientRect();
          if (r.width > 90 && r.height > 90 && r.y > 60)
            return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2),
                     نوع: ic.getAttribute('data-icon'), وسم: (cur.innerText || '').trim().slice(0, 8) };
          cur = cur.parentElement;
        }
        return null;
      }).filter(Boolean));
}

// في العارض: زرار «23 MB» لو الملف لسه على الموبايل
const زرار_الجلب = () => {
  const c = [...document.querySelectorAll('div,span,button')]
    .filter((e) => /^\s*[\d.,]+\s*(MB|KB|GB)\s*$/i.test((e.innerText || '').trim()))
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 40 && r.width < 400 && r.y > 100; });
  if (!c.length) return null;
  const r = c[0].getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, نص: c[0].innerText.trim() };
};

async function نزّل_من_العارض(p, مهلة_الجلب = 180) {
  const قبل = fs.readdirSync(DL);
  // (1) اجلب من الموبايل لو لازم
  const g = await p.evaluate(زرار_الجلب);
  if (g) {
    await p.mouse.click(g.x, g.y);
    for (let i = 0; i < مهلة_الجلب / 3; i++) {
      await sleep(3000);
      const خلص = await p.evaluate(() => {
        const c = [...document.querySelectorAll('div,span,button')]
          .some((e) => /^\s*[\d.,]+\s*(MB|KB|GB)\s*$/i.test((e.innerText || '').trim()) && e.getBoundingClientRect().width > 40);
        return !c;
      });
      if (خلص) break;
    }
    await sleep(2000);
  }
  // (2) زرار التحميل في هيدر العارض
  // ⚠️ مالوش data-icon مميّز — بندوّر على أي عنصر aria-label فيه Download،
  //    ولو مفيش نرجع لترتيب أيقونات الهيدر (⬇ ⋮ ✕) = التالت من الآخر
  const d = await p.evaluate(() => {
    const بالاسم = [...document.querySelectorAll('[aria-label], [title], [data-icon]')]
      .filter((e) => /download|تحميل|تنزيل/i.test(
        (e.getAttribute('aria-label') || '') + (e.getAttribute('title') || '') + (e.getAttribute('data-icon') || '')))
      .filter((e) => e.getBoundingClientRect().width > 5);
    if (بالاسم.length) {
      const r = بالاسم[0].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, كيف: 'بالاسم' };
    }
    const cand = [...document.querySelectorAll('[role="button"], button, span[data-icon]')]
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter((o) => o.r.y < 130 && o.r.y > 10 && o.r.width > 15 && o.r.width < 70)
      .sort((a, b) => a.r.x - b.r.x);
    if (cand.length < 3) return null;
    const t = cand[cand.length - 3];
    return { x: t.r.x + t.r.width / 2, y: t.r.y + t.r.height / 2, كيف: 'بالترتيب' };
  });
  if (!d) return { ok: false, سبب: g ? 'الجلب فشل' : 'مفيش زرار تحميل' };
  await p.mouse.click(d.x, d.y);
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    const n = fs.readdirSync(DL).filter((f) => !f.endsWith('.crdownload') && !قبل.includes(f));
    if (n.length) return { ok: true, ملف: n[0], ميجا: +(fs.statSync(path.join(DL, n[0])).size / 1048576).toFixed(1) };
  }
  return { ok: false, سبب: 'مااتحملش' };
}

(async () => {
  if (!fs.existsSync(DL)) fs.mkdirSync(DL, { recursive: true });
  const { p } = await wa();
  await p.bringToFront();
  const cdp = await p.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true });

  let s = سجل();
  const خلص = new Set(s.map((x) => x.مفتاح));

  for (const هدف of أهداف) {
    console.log('\n═══', هدف.اسم, '(' + هدف.رقم + ')');
    let list;
    try {
      if (!(await openChat(p, هدف.رقم))) { console.log('  ✗ الشات مافتحش'); continue; }
      if (!(await افتح_الميديا(p))) { console.log('  ✗ لوحة الميديا مافتحتش'); continue; }
      list = await بلاطات(p);
    } catch (e) { console.log('  ✗ خطأ:', e.message.slice(0, 60)); continue; }
    console.log('  بلاطات:', list.length);

    for (const [i, t] of list.entries()) {
      const مفتاح = هدف.رقم + '#' + i;
      if (خلص.has(مفتاح)) continue;
      let r;
      try {
        await p.mouse.click(t.x, t.y);
        await sleep(3000);
        r = await نزّل_من_العارض(p);
      } catch (e) { r = { ok: false, سبب: 'خطأ: ' + e.message.slice(0, 40) }; }
      console.log('   ', i + 1, r.ok ? `✅ ${r.ملف} (${r.ميجا}MB)` : '✗ ' + r.سبب, t.وسم);
      s.push({ مفتاح, رقم: '+2' + هدف.رقم, صاحبه: هدف.اسم, نوع: t.نوع, ...r });
      خلص.add(مفتاح);
      احفظ(s);
      // ⚠️ Escape بيقفل التاب كله — اقفل العارض بزرار الـX بتاعه
      const x = await p.evaluate(() => {
        const c = [...document.querySelectorAll('[data-icon="x"], [data-icon="x-viewer"], [aria-label="Close"]')]
          .filter((e) => e.getBoundingClientRect().width > 5);
        if (!c.length) return null;
        const r = c[0].getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      if (x) await p.mouse.click(x.x, x.y);
      await sleep(1500);
    }
  }
  const نجح = s.filter((x) => x.ok).length;
  console.log('\n════ نزل:', نجح, 'من', s.length, '| على الديسك:',
              fs.readdirSync(DL).filter((f) => !f.endsWith('.crdownload')).length);
  process.exit(0);
})();
