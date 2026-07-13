const puppeteer = require('puppeteer-core');
const fs = require('fs');
const LOG = 'E:\\madmona-app\\scripts\\fb-reply.log';
const log = (m) => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const REPLY = 'أهلاً 🙌 اتشرفنا! مضمونة عايزة تشتغل معاكم كـ بروكر وقناة بيع — بننزّل مشروعكم في «بورصة مضمونة» قدام آلاف الباحثين. كلّمنا على واتساب المارد 🧞 01002229982 وابعتلنا تفاصيل المشروع والـPrice List 🤝';

(async () => {
  const phones = process.argv.slice(2);
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => p.url().includes('1594743139111056'));
  if (!page) { log('NO PAGE'); return b.disconnect(); }
  await page.bringToFront();

  let ok = 0;
  for (const ph of phones) {
    try {
      // 1) هات handle للكومنت
      const handles = await page.$$('[role="article"]');
      let target = null;
      for (const h of handles) {
        const t = await page.evaluate(e => e.innerText || '', h);
        if (t.replace(/\D/g, '').includes(ph.slice(1))) { target = h; break; }
      }
      if (!target) { log(`${ph}: NOT_FOUND`); continue; }

      await target.evaluate(e => e.scrollIntoView({ block: 'center' }));
      await sleep(1000);

      // 2) دوس Reply
      const clicked = await page.evaluate(el => {
        const spans = [...el.querySelectorAll('div[role="button"]')];
        const r = spans.find(s => ['Reply', 'رد'].includes((s.innerText || '').trim()));
        if (!r) return false;
        r.click(); return true;
      }, target);
      if (!clicked) { log(`${ph}: NO_REPLY_BTN`); continue; }
      await sleep(2500);

      // 3) الصندوق النشط
      const box = await page.$('[contenteditable="true"][role="textbox"]');
      if (!box) { log(`${ph}: NO_BOX`); continue; }
      await box.click();
      await sleep(500);
      await page.keyboard.type(REPLY, { delay: 12 });
      await sleep(1200);
      await page.keyboard.press('Enter');
      await sleep(4000);
      ok++;
      log(`${ph}: SENT`);
      await sleep(3000);
    } catch (e) { log(`${ph}: ERR ${e.message}`); }
  }
  log(`DONE ${ok}/${phones.length}`);
  b.disconnect();
})();
