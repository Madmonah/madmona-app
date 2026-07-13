// سحب كومنتات فيسبوك عبر CDP — بيكتب تقدّم في لوج + النتيجة تدريجياً
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const OUT = 'E:\\madmona-app\\scripts\\fb-comments.json';
const LOG = 'E:\\madmona-app\\scripts\\fb-scrape.log';
const log = (m) => { try { fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${m}\n`); } catch {} };
const safe = async (fn, d = null) => { try { return await fn(); } catch (e) { return d; } };

function extract(page) {
  return safe(() => page.evaluate(() => {
    const out = []; const seen = new Set();
    document.querySelectorAll('[role="article"]').forEach(a => {
      const raw = (a.innerText || '').trim(); if (!raw) return;
      const ph = raw.match(/(?<!\d)(?:\+?2)?01[0-25]\d{8}(?!\d)/g) || [];
      if (!ph.length) return;
      const p = ph[0].replace(/^\+?2/, '');
      if (p === '01002229982' || seen.has(p)) return; seen.add(p);
      const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
      const company = lines.slice(1).find(s =>
        !/^\d+[hmdwسدثيأ]/.test(s) &&
        !/^(Like|Reply|Share|Send message|View|Author|Top contributor|Follow|Remove Preview)/i.test(s) &&
        !/01[0-25]\d{8}/.test(s) && s.length > 2) || '';
      out.push({ phone: p, person: lines[0] || '', company });
    });
    return out;
  }), []);
}

(async () => {
  fs.writeFileSync(LOG, '');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('1594743139111056')) || pages[0];
  await safe(() => page.bringToFront());
  await new Promise(r => setTimeout(r, 4000));
  log('PAGE ' + (await safe(() => page.url(), '')).slice(0, 70));

  let stable = 0, last = 0, best = 0;
  for (let i = 0; i < 300; i++) {
    await safe(() => page.evaluate(() => {
      const b = [...document.querySelectorAll('[role="button"], span')].find(e => {
        const t = (e.innerText || '').trim(); return /more comments?$/i.test(t) && t.length < 45;
      }); if (b) b.click();
    }));
    await new Promise(r => setTimeout(r, 1200));
    const box = await safe(() => page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]') || document.body;
      const r = d.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height * 0.7) };
    }), { x: 760, y: 500 });
    await safe(async () => {
      await page.mouse.move(box.x, box.y);
      for (let k = 0; k < 5; k++) { await page.mouse.wheel({ deltaY: 900 }); await new Promise(r => setTimeout(r, 350)); }
    });
    await new Promise(r => setTimeout(r, 1500));
    const n = await safe(() => page.evaluate(() => document.querySelectorAll('[role="article"]').length), 0);
    if (n > best) best = n;
    if (i % 3 === 0) {
      const rows = await extract(page);
      fs.writeFileSync(OUT, JSON.stringify(rows, null, 2), 'utf8');
      log(`step ${i} | articles=${n} | leads=${rows.length}`);
    }
    if (n <= last) stable++; else { stable = 0; last = n; }
    if (stable >= 15) { log('STOP no-growth'); break; }
  }
  const rows = await extract(page);
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 2), 'utf8');
  log(`DONE best=${best} leads=${rows.length}`);
  browser.disconnect();
})().catch(e => { log('FATAL ' + e.message); process.exit(1); });
