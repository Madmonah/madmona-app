// اختبار: أضغط زرار التحميل في صف RITZ من جدول «Docs from all chats»
const fs = require('fs');
const path = require('path');
const { wa, sleep } = require('./wa-lib');
const DL = 'E:\\madmona-app\\.wa-dl';

(async () => {
  if (!fs.existsSync(DL)) fs.mkdirSync(DL, { recursive: true });
  fs.readdirSync(DL).forEach((f) => { try { fs.unlinkSync(path.join(DL, f)); } catch (_) {} });

  const { p } = await wa();
  await p.bringToFront();
  const cdp = await p.target().createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true });
  cdp.on('Browser.downloadProgress', (e) => { if (e.state !== 'inProgress') console.log('   [CDP]', e.state); });

  // الصف اللي فيه RITZ → زرار التحميل جوّاه
  const btn = await p.evaluate(() => {
    const صف = [...document.querySelectorAll('div')]
      .filter((e) => /RITZ New Zayed Brochure\.pdf/i.test(e.innerText || '') && (e.innerText || '').length < 200)
      .sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)[0];
    if (!صف) return null;
    // اطلع لفوق لحد ما ألاقي صف فيه زراير
    let cur = صف;
    for (let i = 0; i < 8 && cur; i++) {
      const bs = cur.querySelectorAll('[role="button"], button');
      if (bs.length >= 1) {
        const b = bs[0];
        const r = b.getBoundingClientRect();
        if (r.width > 5) return { عدد_زراير: bs.length, x: r.x + r.width / 2, y: r.y + r.height / 2,
                                  نص_الصف: (cur.innerText || '').replace(/\n/g, ' | ').slice(0, 70) };
      }
      cur = cur.parentElement;
    }
    return null;
  });
  console.log('زرار التحميل:', JSON.stringify(btn));
  if (!btn) { await p.screenshot({ path: __dirname + '/wa-now.png' }); process.exit(1); }

  await p.mouse.click(btn.x, btn.y);
  console.log('ضغطت — 64 ميجا، بستنى...');
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    const all = fs.readdirSync(DL);
    const done = all.filter((x) => !x.endsWith('.crdownload'));
    if (done.length) {
      const st = fs.statSync(path.join(DL, done[0]));
      console.log('✅ نزل:', done[0], (st.size / 1048576).toFixed(1), 'MB');
      process.exit(0);
    }
    if (i % 5 === 0) console.log('   ...', all.join(', ') || '(لسه فاضي)');
  }
  await p.screenshot({ path: __dirname + '/wa-now.png' });
  process.exit(1);
})();
