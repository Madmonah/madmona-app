// 🚨 openChat بترجع true والشات المفتوح غلط — لازم أتأكد بالرقم في الهيدر
const { wa, openChat, sleep } = require('./wa-lib');
const رقم = (s) => (s || '').replace(/\D/g, '');

(async () => {
  const { p } = await wa();
  await p.bringToFront();
  for (const t of ['01026222337', '01111534331', '01026222337']) {
    await openChat(p, t);
    await sleep(1500);
    const h = await p.evaluate(() => (document.querySelector('#main header')?.innerText || '').split('\n')[0]);
    const مطابق = رقم(h).endsWith(رقم(t).slice(-9));
    console.log(t, '→ الهيدر:', JSON.stringify(h), مطابق ? '✅ مطابق' : '❌ شات غلط!');
  }
  process.exit(0);
})();
