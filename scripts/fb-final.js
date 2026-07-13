const puppeteer = require('puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const page = pages.find(p => p.url().includes('1594743139111056'));
  if (!page) { console.log('NO PAGE'); b.disconnect(); return; }

  const data = await page.evaluate(() => {
    const ME = /Møhamed Nassef|Mohamed Nassef|مضمونة|Madmona/i;
    const arts = [...document.querySelectorAll('[role="article"]')];
    const seq = arts.map(a => {
      const raw = (a.innerText || '').trim();
      const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
      const author = lines[0] || '';
      const ph = raw.match(/(?<!\d)(?:\+?2)?01[0-25]\d{8}(?!\d)/g) || [];
      return {
        author,
        isMe: ME.test(author),
        phone: ph.length ? ph[0].replace(/^\+?2/, '') : null,
        text: raw.slice(0, 170).replace(/\n/g, ' | '),
      };
    });
    // أي رد بتاعنا => الكومنت اللي قبله اترد عليه
    const comments = [];
    for (let i = 0; i < seq.length; i++) {
      if (seq[i].isMe) continue;
      const nextIsMine = seq[i + 1] && seq[i + 1].isMe;
      const next2IsMine = seq[i + 2] && seq[i + 2].isMe;
      comments.push({ ...seq[i], weReplied: !!(nextIsMine || next2IsMine) });
    }
    return { totalArticles: seq.length, mine: seq.filter(s => s.isMe).length, comments };
  });

  fs.writeFileSync('E:\\madmona-app\\scripts\\fb-final.json', JSON.stringify(data.comments, null, 2), 'utf8');
  const no = data.comments.filter(c => !c.weReplied);
  console.log(`articles=${data.totalArticles} | ourReplies=${data.mine} | comments=${data.comments.length} | NOT_REPLIED=${no.length} | notReplied_withPhone=${no.filter(c=>c.phone).length}`);
  b.disconnect();
})().catch(e => console.error('ERR', e.message));
