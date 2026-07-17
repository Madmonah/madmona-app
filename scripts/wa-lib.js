// أدوات مشتركة لواتساب ويب عبر بورت الديباج (كروم --remote-debugging-port=9222)
// ⚠️ دروس من الـDOM الحالي (15 يوليو 2026):
//    • البحث = input#_r_a_[data-tab="3"] — الـaria-label بيختفي أول ما تكتب فيه
//    • نتايج البحث في grid[aria-label="Search results."]
//    • el.click() بتاعة puppeteer مبتفتحش الشات — لازم p.mouse.click على مركز الصف
//    • #main مبيظهرش غير لما الشات يتفتح فعلاً — استخدمه كتأكيد
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wa() {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const p = pages.find((x) => x.url().includes('web.whatsapp.com'));
  if (!p) throw new Error('واتساب ويب مش مفتوح');
  return { b, p };
}

async function openChat(p, phone) {
  const box = await p.$('input[data-tab="3"]');
  if (!box) throw new Error('خانة البحث مش موجودة');
  await box.click();
  await sleep(300);
  await p.keyboard.down('Control'); await p.keyboard.press('A'); await p.keyboard.up('Control');
  await p.keyboard.press('Backspace');
  await sleep(600);
  await p.keyboard.type(phone, { delay: 40 });
  await sleep(3500);

  // ⚠️ أول [role="row"] هو عنوان «Chats» مش شات — لازم أتخطاه
  const box2 = await p.evaluate(() => {
    const g = document.querySelector('[aria-label="Search results."]');
    if (!g) return null;
    const cell = [...g.querySelectorAll('[role="gridcell"]')]
      .find((c) => c.getBoundingClientRect().height > 50 && !/^(Chats|Messages|Contacts)$/i.test((c.innerText || '').trim()));
    if (!cell) return null;
    const r = cell.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  });
  if (!box2 || box2.h < 10) return false;
  await p.mouse.click(box2.x, box2.y);
  await sleep(3500);

  // 🚨 (15 يوليو 2026) سباق توقيت: نتايج البحث بتتحدّث متأخر، فالضغطة بتفتح
  // الشات بتاع الهدف **اللي قبله**. لو مأكدتش بالرقم، الملفات هتترّبط لناس غلط.
  const عايز = phone.replace(/\D/g, '').slice(-9);
  for (let i = 0; i < 6; i++) {
    const h = await p.evaluate(() => (document.querySelector('#main header')?.innerText || '').split('\n')[0]);
    if (h.replace(/\D/g, '').endsWith(عايز)) return true;
    await sleep(1500);   // استنى النتايج تلحق
  }
  return false;   // فتح شات غلط — أحسن نفشل من إننا نلوّث
}

async function header(p) {
  return p.evaluate(() => document.querySelector('#main header')?.innerText?.replace(/\n/g, ' · ') || '(مفيش)');
}

async function scanMedia(p) {
  return p.evaluate(() => {
    const out = [];
    document.querySelectorAll('#main [data-id]').forEach((el) => {
      const img = el.querySelector('img[src^="blob:"]');
      const t = el.innerText || '';
      const docName = (t.match(/[^\n]+\.(pdf|PDF|docx?|xlsx?|pptx?)/) || [])[0] || '';
      if (img || docName) out.push({
        id: el.getAttribute('data-id'),
        نوع: img ? 'صورة' : 'ملف',
        اسم: docName.trim(),
        وارد: (el.getAttribute('data-id') || '').startsWith('false_'),
      });
    });
    return out;
  });
}

// ⚠️ واتساب بيستخدم قايمة افتراضية — الرسايل البعيدة بتتشال من الـDOM.
// فلازم نمسح الميديا وإحنا بنلف، مش بعد ما نوصل لفوق.
async function harvest(p, maxRounds = 60) {
  const كله = new Map();
  let ثابت = 0;
  for (let i = 0; i < maxRounds; i++) {
    (await scanMedia(p)).forEach((m) => كله.set(m.id, m));
    const قبل = كله.size;
    await p.evaluate(() => {
      const c = [...document.querySelectorAll('#main div')]
        .find((d) => d.scrollHeight > d.clientHeight + 50 && d.clientHeight > 100);
      if (c) c.scrollTop = Math.max(0, c.scrollTop - c.clientHeight * 0.8);
    });
    await sleep(1400);
    (await scanMedia(p)).forEach((m) => كله.set(m.id, m));
    const فوق = await p.evaluate(() => {
      const c = [...document.querySelectorAll('#main div')]
        .find((d) => d.scrollHeight > d.clientHeight + 50 && d.clientHeight > 100);
      return !c || c.scrollTop < 5;
    });
    if (كله.size === قبل && فوق) { ثابت++; if (ثابت >= 3) break; } else ثابت = 0;
  }
  return [...كله.values()];
}

module.exports = { wa, openChat, scanMedia, header, harvest, sleep };
