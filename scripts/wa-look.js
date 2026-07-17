// أبصّ على الشات نفسه — إيه اللي فيه فعلاً؟
const { wa, openChat, header, sleep } = require('./wa-lib');
(async () => {
  const { p } = await wa();
  await p.bringToFront();
  await openChat(p, process.argv[2] || '01080140401');
  await sleep(2000);
  const t = await p.evaluate(() => {
    const c = [...document.querySelectorAll('#main div')]
      .find((d) => d.scrollHeight > d.clientHeight + 50 && d.clientHeight > 100);
    return {
      عنوان: document.querySelector('#main header')?.innerText?.replace(/\n/g, ' · '),
      رسايل_في_DOM: document.querySelectorAll('#main [data-id]').length,
      ارتفاع_المحتوى: c?.scrollHeight, مكان_اللف: Math.round(c?.scrollTop || 0),
      النص: (document.querySelector('#main')?.innerText || '').slice(0, 1500),
    };
  });
  console.log(JSON.stringify(t, null, 1));
  await p.screenshot({ path: __dirname + '/wa-now.png' });
  process.exit(0);
})();
