// يسحب الكومنتات + يعرف مين إحنا ردينا عليه ومين لأ
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const OUT = 'E:\\madmona-app\\scripts\\fb-comments-replies.json';
const LOG = 'E:\\madmona-app\\scripts\\fb-replies.log';
const log = (m) => { try { fs.appendFileSync(LOG, m + '\n'); } catch {} };
const safe = async (fn, d = null) => { try { return await fn(); } catch (e) { return d; } };

(async () => {
  fs.writeFileSync(LOG, '');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('1594743139111056'));
  if (!page) { page = await browser.newPage(); await page.goto('https://www.facebook.com/groups/270091898242860/permalink/1594743139111056/', { waitUntil: 'networkidle2', timeout: 90000 }); }
  await safe(() => page.bringToFront());
  await new Promise(r => setTimeout(r, 5000));

  let stable = 0, last = 0;
  for (let i = 0; i < 200; i++) {
    await safe(() => page.evaluate(() => {
      const b = [...document.querySelectorAll('[role="button"], span')].find(e => {
        const t = (e.innerText || '').trim(); return /more (comments|replies)/i.test(t) && t.length < 45;
      }); if (b) b.click();
    }));
    await new Promise(r => setTimeout(r, 1100));
    const box = await safe(() => page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]') || document.body;
      const r = d.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height * 0.7) };
    }), { x: 760, y: 500 });
    await safe(async () => {
      await page.mouse.move(box.x, box.y);
      for (let k = 0; k < 5; k++) { await page.mouse.wheel({ deltaY: 900 }); await new Promise(r => setTimeout(r, 320)); }
    });
    await new Promise(r => setTimeout(r, 1400));
    const n = await safe(() => page.evaluate(() => document.querySelectorAll('[role="article"]').length), 0);
    if (i % 5 === 0) log(`step ${i} articles=${n}`);
    if (n <= last) stable++; else { stable = 0; last = n; }
    if (stable >= 15) break;
  }

  const rows = await safe(() => page.evaluate(() => {
    const out = [];
    const arts = [...document.querySelectorAll('[role="article"]')];
    arts.forEach((a) => {
      const raw = (a.innerText || '').trim();
      if (!raw) return;
      const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
      const author = lines[0] || '';
      const isOurs = /^(Møhamed Nassef|Mohamed Nassef|مضمونة|Madmona)/i.test(author);
      const ph = raw.match(/(?<!\d)(?:\+?2)?01[0-25]\d{8}(?!\d)/g) || [];
      // هل فيه رد من مضمونة جوه نفس الكومنت (الردود بتبقى articles جوه بعض)?
      const repliedInside = /Møhamed Nassef|مضمونة|Madmona/i.test(raw.slice(author.length));
      out.push({
        author,
        isOurs,
        phone: ph.length ? ph[0].replace(/^\+?2/, '') : null,
        repliedInside,
        hasReplyLink: /View \d+ (repl|more)/i.test(raw),
        text: raw.slice(0, 220).replace(/\n/g, ' | ')
      });
    });
    return out;
  }), []);

  fs.writeFileSync(OUT, JSON.stringify(rows, null, 2), 'utf8');
  log(`DONE total=${rows.length} ours=${rows.filter(r => r.isOurs).length} withPhone=${rows.filter(r => r.phone).length}`);
  browser.disconnect();
})().catch(e => { log('FATAL ' + e.message); process.exit(1); });
