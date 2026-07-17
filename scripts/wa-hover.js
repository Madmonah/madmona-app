// العارض مفتوح — أستنى الفيديو يوصل من الموبايل وأشوف زرار التحميل
const { wa, sleep } = require('./wa-lib');
(async () => {
  const { p } = await wa();
  await p.bringToFront();
  for (let i = 0; i < 12; i++) {
    const s = await p.evaluate(() => ({
      أيقونات: [...new Set([...document.querySelectorAll('[data-icon]')].map((e) => e.getAttribute('data-icon')))]
        .filter((k) => /down|save|cancel|play|video/i.test(k)),
      فيه_فيديو: !!document.querySelector('video'),
      src: (document.querySelector('video') || {}).src || '',
    }));
    console.log(i * 3 + 's', JSON.stringify(s));
    if (s.فيه_فيديو) break;
    await sleep(3000);
  }
  await p.screenshot({ path: __dirname + '/wa-now.png' });
  process.exit(0);
})();
