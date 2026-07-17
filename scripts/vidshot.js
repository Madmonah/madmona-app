// ياخد لقطات من الفيديو عبر المتصفح (مفيش ffmpeg على الجهاز)
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const path = require('path');

(async () => {
  const file = process.argv[2];
  const out = process.argv[3];
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  const url = 'file:///' + file.replace(/\\/g, '/').replace(/ /g, '%20');
  await p.setContent(`<body style="margin:0;background:#000">
    <video id="v" src="${url}" style="width:100%" muted></video>
    <canvas id="c" style="display:none"></canvas></body>`);
  await sleep(3000);
  const shots = await p.evaluate(async () => {
    const v = document.getElementById('v');
    await new Promise((r) => { if (v.readyState >= 2) r(); else v.onloadeddata = r; });
    const c = document.getElementById('c');
    const out = [];
    for (const frac of [0.05, 0.3, 0.6, 0.9]) {
      v.currentTime = v.duration * frac;
      await new Promise((r) => { v.onseeked = r; });
      c.width = 480; c.height = 480 * v.videoHeight / v.videoWidth;
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      out.push(c.toDataURL('image/jpeg', 0.8));
    }
    return { مدة: Math.round(v.duration), أبعاد: v.videoWidth + 'x' + v.videoHeight, لقطات: out };
  });
  console.log('مدة:', shots.مدة, 'ث |', shots.أبعاد);
  // رصّهم في صورة واحدة
  const p2 = await b.newPage();
  await p2.setViewport({ width: 980, height: 700, deviceScaleFactor: 1 });
  await p2.setContent(`<body style="margin:0;background:#111;display:grid;grid-template-columns:1fr 1fr;gap:4px">
    ${shots.لقطات.map((s) => `<img src="${s}" style="width:100%">`).join('')}</body>`);
  await sleep(1500);
  await p2.screenshot({ path: out, fullPage: true });
  await p.close(); await p2.close();
  console.log('اتحفظ:', out);
  process.exit(0);
})();
