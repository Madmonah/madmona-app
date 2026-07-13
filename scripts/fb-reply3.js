const puppeteer = require('puppeteer-core');
const fs = require('fs');
const LOG = 'E:\\madmona-app\\scripts\\fb-reply3.log';
const log = (m) => { console.log(m); try { fs.appendFileSync(LOG, m + '\n'); } catch {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const REPLY = 'أهلاً بيكم 🙌 اتشرفنا! «المارد 🧞» مساعد مضمونة الشخصي شغال ٢٤ ساعة — كلمونا واتساب 01002229982 هيرد عليكم فوراً ويسجّلكم ويجهّز مشروعكم من غير فورمات. عايزين ننزّل مشاريعكم في بورصة مضمونة قدام آلاف الباحثين — ابعتولنا متوسط سعر المتر وأنظمة السداد 🤝';

(async () => {
  const phones = process.argv.slice(2);
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => p.url().includes('1594743139111056'));
  if (!page) { log('NO PAGE'); return b.disconnect(); }
  await page.bringToFront();

  // نضّف أي مسوّدات عالقة
  await page.evaluate(() => {
    document.querySelectorAll('[contenteditable="true"][role="textbox"]').forEach(bx => {
      if ((bx.innerText || '').trim().length > 0) { bx.focus(); document.execCommand('selectAll'); document.execCommand('delete'); }
    });
  });
  await sleep(1000);

  let ok = 0, fail = [];
  for (const ph of phones) {
    try {
      const hit = await page.evaluate((p) => {
        const arts = [...document.querySelectorAll('[role="article"]')];
        const t = arts.find(a => (a.innerText || '').replace(/\D/g, '').includes(p.slice(1)));
        if (!t) return 'NOT_FOUND';
        t.scrollIntoView({ block: 'center' });
        const r = [...t.querySelectorAll('div[role="button"]')].find(s => ['Reply', 'رد'].includes((s.innerText || '').trim()));
        if (!r) return 'NO_BTN';
        r.click();
        return 'OK';
      }, ph);
      if (hit !== 'OK') { log(`${ph}: ${hit}`); fail.push(ph); continue; }
      await sleep(2500);

      // اكتب في الصندوق النشط
      await page.keyboard.type(REPLY, { delay: 5 });
      await sleep(1500);

      // دوس Post comment
      const posted = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[role="button"][aria-label="Post comment"]')];
        if (!btn.length) return false;
        btn[btn.length - 1].click();
        return true;
      });
      if (!posted) { log(`${ph}: NO_POST_BTN`); fail.push(ph); continue; }
      await sleep(4500);
      ok++;
      log(`${ph}: SENT`);
      await sleep(4000);
    } catch (e) { log(`${ph}: ERR ${e.message}`); fail.push(ph); }
  }
  log(`DONE ok=${ok}/${phones.length} failed=${fail.join(',')}`);
  b.disconnect();
})();
