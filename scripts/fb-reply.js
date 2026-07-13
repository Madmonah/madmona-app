// يرد على كومنتات المطورين اللي مردّناش عليهم (اللي عندهم أرقام) — رد داخل فيسبوك
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const LOG = 'E:\\madmona-app\\scripts\\fb-reply.log';
const log = (m) => { try { fs.appendFileSync(LOG, m + '\n'); } catch {} };
const safe = async (fn, d = null) => { try { return await fn(); } catch (e) { return d; } };

const REPLY = 'أهلاً 🙌 اتشرفنا بكومنتك! مضمونة عايزة تشتغل معاكم كـ بروكر عقاري وقناة بيع وتسويق — بننزّل مشروعكم في «بورصة مضمونة» قدام آلاف الباحثين: madmonacairo.com/real-estate/market ✅ كلّمنا على واتساب 01002229982 (المارد 🧞 بيرد ٢٤ ساعة) أو تشرّفنا في مقرنا: ٧ ش سليمان عزمي — النزهة، مصر الجديدة 🤝';

// الأرقام اللي هنرد على كومنتاتهم (مطورين مردّناش عليهم على فيسبوك)
const TARGETS = process.argv.slice(2); // phones passed as args

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => p.url().includes('1594743139111056'));
  if (!page) { log('NO PAGE'); b.disconnect(); return; }
  await safe(() => page.bringToFront());

  let done = 0;
  for (const phone of TARGETS) {
    const ok = await safe(() => page.evaluate(async (ph, replyText) => {
      const arts = [...document.querySelectorAll('[role="article"]')];
      // دور على الكومنت اللي فيه الرقم ده
      const target = arts.find(a => (a.innerText || '').replace(/\D/g, '').includes(ph.slice(1)));
      if (!target) return 'NOT_FOUND';
      // اضغط Reply جوه الكومنت
      const replyBtn = [...target.querySelectorAll('[role="button"], span, div')].find(e => (e.innerText || '').trim() === 'Reply' || (e.innerText || '').trim() === 'رد');
      if (!replyBtn) return 'NO_REPLY_BTN';
      replyBtn.click();
      await new Promise(r => setTimeout(r, 1500));
      // اكتب في صندوق الرد
      const box = target.querySelector('[contenteditable="true"]') || document.querySelector('[role="dialog"] [contenteditable="true"]') || document.querySelector('form [contenteditable="true"]');
      if (!box) return 'NO_BOX';
      box.focus();
      document.execCommand('insertText', false, replyText);
      return 'TYPED';
    }, phone, REPLY), 'ERR');

    if (ok === 'TYPED') {
      await new Promise(r => setTimeout(r, 800));
      await safe(() => page.keyboard.press('Enter'));
      await new Promise(r => setTimeout(r, 2500));
      done++;
      log(`${phone}: replied`);
    } else {
      log(`${phone}: ${ok}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  log(`DONE replied=${done}/${TARGETS.length}`);
  console.log(`replied=${done}/${TARGETS.length}`);
  b.disconnect();
})().catch(e => { log('FATAL ' + e.message); });
