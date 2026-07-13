// يفتح كل الردود المطويّة ثم يحدد بدقة مين مردّناش عليه
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const LOG = 'E:\\madmona-app\\scripts\\fb-expand.log';
const log = (m) => { try { fs.appendFileSync(LOG, m + '\n'); } catch {} };
const safe = async (fn, d = null) => { try { return await fn(); } catch (e) { return d; } };

(async () => {
  fs.writeFileSync(LOG, '');
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => p.url().includes('1594743139111056'));
  if (!page) { log('NO PAGE'); b.disconnect(); return; }

  // افتح كل "View N replies"
  for (let i = 0; i < 60; i++) {
    const clicked = await safe(() => page.evaluate(() => {
      const btns = [...document.querySelectorAll('[role="button"], span')].filter(e => {
        const t = (e.innerText || '').trim();
        return /^View\s+(\d+|all|previous|more)?\s*(repl|more repl)/i.test(t) && t.length < 40;
      });
      if (!btns.length) return 0;
      btns.slice(0, 8).forEach(x => x.click());
      return btns.length;
    }), 0);
    if (!clicked) break;
    log(`expand round ${i}: clicked ${clicked}`);
    await new Promise(r => setTimeout(r, 1800));
  }
  await new Promise(r => setTimeout(r, 3000));

  const rows = await page.evaluate(() => {
    const ME = /Møhamed Nassef|Mohamed Nassef|مضمونة|Madmona/i;
    const arts = [...document.querySelectorAll('[role="article"]')];
    const out = [];
    arts.forEach(a => {
      const raw = (a.innerText || '').trim();
      if (!raw) return;
      const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
      const author = lines[0] || '';
      if (ME.test(author)) return;                 // ده رد بتاعنا مش كومنت
      if (a.closest('[role="article"]') !== a) { } // top-level check below
      const ph = raw.match(/(?<!\d)(?:\+?2)?01[0-25]\d{8}(?!\d)/g) || [];
      // ردودنا بتبقى articles جوّه الـ article ده
      const kids = [...a.querySelectorAll('[role="article"]')];
      const weReplied = kids.some(k => ME.test((k.innerText || '').split('\n')[0] || ''));
      out.push({
        author,
        phone: ph.length ? ph[0].replace(/^\+?2/, '') : null,
        weReplied,
        text: raw.slice(0, 180).replace(/\n/g, ' | ')
      });
    });
    return out;
  });

  fs.writeFileSync('E:\\madmona-app\\scripts\\fb-comments-replies.json', JSON.stringify(rows, null, 2), 'utf8');
  const noReply = rows.filter(r => !r.weReplied);
  log(`DONE total=${rows.length} | replied=${rows.length - noReply.length} | NO_REPLY=${noReply.length} | withPhone=${rows.filter(r => r.phone).length}`);
  console.log(`total=${rows.length} replied=${rows.length - noReply.length} NO_REPLY=${noReply.length}`);
  b.disconnect();
})().catch(e => { log('FATAL ' + e.message); });
