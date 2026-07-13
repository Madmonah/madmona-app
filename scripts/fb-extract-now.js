// يستخرج الكومنتات الظاهرة دلوقتي من غير سحب إضافي
const puppeteer = require('puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => p.url().includes('1594743139111056'));
  if (!page) { console.log('NO PAGE'); b.disconnect(); return; }

  const rows = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('[role="article"]').forEach(a => {
      const raw = (a.innerText || '').trim();
      if (!raw) return;
      const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
      const author = lines[0] || '';
      if (/^(Møhamed Nassef|Mohamed Nassef|مضمونة|Madmona)/i.test(author)) return; // ده احنا
      const ph = raw.match(/(?<!\d)(?:\+?2)?01[0-25]\d{8}(?!\d)/g) || [];
      // هل مضمونة/محمد رد جوه الكومنت ده؟
      const weReplied = /Møhamed Nassef|Mohamed Nassef|مضمونة|Madmona/i.test(raw);
      out.push({
        author,
        phone: ph.length ? ph[0].replace(/^\+?2/, '') : null,
        weReplied,
        text: raw.slice(0, 200).replace(/\n/g, ' | ')
      });
    });
    return out;
  });
  fs.writeFileSync('E:\\madmona-app\\scripts\\fb-comments-replies.json', JSON.stringify(rows, null, 2), 'utf8');
  const noReply = rows.filter(r => !r.weReplied);
  console.log(`total=${rows.length} | noReply=${noReply.length} | withPhone=${rows.filter(r=>r.phone).length}`);
  b.disconnect();
})().catch(e => console.error('ERR', e.message));
