// 🎯 الحصّادة: لوحة «كل الشاتات» → كل صف → منيو (⌄) → Download
// ⚠️ دروس اتعلمتها بالتجربة (15 يوليو 2026):
//   • Escape بيقفل اللوحة نفسها مش المنيو → اضغط في مكان فاضي
//   • أول [role="row"] في نتايج البحث = عنوان «Chats» مش شات
//   • el.click() بتاعة puppeteer مبتفتحش الشات → p.mouse.click على مركز الـrect
//   • قايمة الرسايل افتراضية — البعيد بيتشال من الـDOM → امسح وإنت بتلف
//   • بعد كل تحميل الصفوف بتتحرّك → اتعرّف بالنص مش بالإحداثيات
const fs = require('fs');
const path = require('path');
const { wa, openChat, sleep } = require('./wa-lib');

const DL = 'E:\\madmona-app\\.wa-dl';
const OUT = __dirname + '/harvest-log.json';

async function clickText(p, re, max = 60) {
  const t = await p.evaluate((src, m) => {
    const rx = new RegExp(src, 'i');
    const c = [...document.querySelectorAll('div,button,span,a')]
      .filter((e) => rx.test(e.innerText || '') && (e.innerText || '').length < m && e.getBoundingClientRect().width > 5);
    if (!c.length) return null;
    const r = c[c.length - 1].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, re.source, max);
  if (!t) return false;
  await p.mouse.click(t.x, t.y);
  await sleep(2500);
  return true;
}

async function اللوحة_مفتوحة(p) {
  return p.evaluate(() => [...document.querySelectorAll('*')]
    .some((e) => /from all chats/i.test(e.innerText || '') && e.getBoundingClientRect().y > 0 && (e.innerText || '').length < 60));
}

async function افتح_اللوحة(p, tab) {
  if (!(await اللوحة_مفتوحة(p))) {
    await openChat(p, '01080140401');
    await sleep(1500);
    const h = await p.evaluate(() => {
      const el = document.querySelector('#main header');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + 200, y: r.y + r.height / 2 };
    });
    if (h) { await p.mouse.click(h.x, h.y); await sleep(2500); }
    await clickText(p, /media, links and docs/);
    await clickText(p, /view (docs|media) from all chats/, 50);
  }
  await clickText(p, new RegExp('^' + tab + '$'), 12);
  await sleep(1500);
  return اللوحة_مفتوحة(p);
}

async function اقفل_المنيو(p) { await p.mouse.click(600, 60); await sleep(400); }

// كل الصفوف الظاهرة — من غير حدود y ضيقة
async function صفوف(p) {
  return p.evaluate(() => {
    const out = [];
    document.querySelectorAll('[data-icon="ic-chevron-down-menu"]').forEach((ch) => {
      const r = ch.getBoundingClientRect();
      if (r.width < 3 || r.y < 60 || r.y > window.innerHeight - 20) return;
      let cur = ch, نص = '';
      for (let i = 0; i < 9 && cur; i++) {
        const t = (cur.innerText || '').trim();
        if (t.length > 12 && t.length < 400) { نص = t.replace(/\n+/g, ' | '); break; }
        cur = cur.parentElement;
      }
      out.push({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), نص });
    });
    return out;
  });
}

async function نزّل(p, صف) {
  const قبل = fs.readdirSync(DL);
  await p.mouse.click(صف.x, صف.y);
  await sleep(1500);
  const d = await p.evaluate(() => {
    const it = [...document.querySelectorAll('[role="menuitem"], li, div')]
      .filter((e) => (e.innerText || '').trim() === 'Download' && e.getBoundingClientRect().width > 5);
    if (!it.length) return null;
    const r = it[0].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!d) { await اقفل_المنيو(p); return { ok: false, سبب: 'مفيش Download' }; }
  await p.mouse.click(d.x, d.y);
  for (let i = 0; i < 75; i++) {
    await sleep(2000);
    const n = fs.readdirSync(DL).filter((f) => !f.endsWith('.crdownload') && !قبل.includes(f));
    if (n.length) {
      const st = fs.statSync(path.join(DL, n[0]));
      return { ok: true, ملف: n[0], ميجا: +(st.size / 1048576).toFixed(1) };
    }
  }
  return { ok: false, سبب: 'مااتحملش' };
}

// اللف داخل جسم اللوحة تحديداً
async function لف(p) {
  return p.evaluate(() => {
    const cands = [...document.querySelectorAll('div')]
      .filter((d) => d.scrollHeight > d.clientHeight + 40 && d.clientHeight > 150)
      .sort((a, b) => b.scrollHeight - a.scrollHeight);
    for (const c of cands) {
      const قبل = c.scrollTop;
      c.scrollTop += c.clientHeight * 0.75;
      if (Math.abs(c.scrollTop - قبل) > 2) return true;
    }
    return false;
  });
}

(async () => {
  const tab = process.argv[2] || 'Docs';
  if (!fs.existsSync(DL)) fs.mkdirSync(DL, { recursive: true });
  const { p } = await wa();
  await p.bringToFront();
  const cdp = await p.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true });

  if (!(await افتح_اللوحة(p, tab))) { console.log('✗ اللوحة مافتحتش'); process.exit(1); }

  const سجل = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : [];
  const خلص = new Set(سجل.map((s) => s.نص));
  let فاضي = 0;

  for (let دورة = 0; دورة < 200; دورة++) {
    if (!(await اللوحة_مفتوحة(p))) { console.log('⚠ اللوحة اتقفلت — بفتحها'); await افتح_اللوحة(p, tab); }
    const list = await صفوف(p);
    const باقي = list.filter((s) => !خلص.has(s.نص) && s.نص);
    if (!باقي.length) {
      const تحرّك = await لف(p);
      await sleep(1600);
      if (!تحرّك) { فاضي++; if (فاضي >= 3) { console.log('✔ خلصت:', tab); break; } }
      else فاضي = 0;
      continue;
    }
    فاضي = 0;
    const r = await نزّل(p, باقي[0]);
    console.log(r.ok ? '✅ ' + r.ملف + ' (' + r.ميجا + 'MB)' : '✗ ' + r.سبب, '—', باقي[0].نص.slice(0, 50));
    سجل.push({ tab, ...باقي[0], ...r });
    خلص.add(باقي[0].نص);
    fs.writeFileSync(OUT, JSON.stringify(سجل, null, 1));
    await اقفل_المنيو(p);
  }
  const كله = fs.readdirSync(DL).filter((f) => !f.endsWith('.crdownload'));
  console.log('على الديسك:', كله.length, 'ملف');
  process.exit(0);
})();
