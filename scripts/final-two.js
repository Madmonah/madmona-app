// نزّل النسخة الكاملة لفرشة المكياج (تجميل) — capital-prime موجود maxres بالفعل
const fs = require('fs'), https = require('https');
const man = JSON.parse(fs.readFileSync('E:/madmona-app/scripts/thumbs/beauty-manifest.json', 'utf8'));
function dl(url, dest, depth = 0) {
  return new Promise((res) => {
    if (depth > 4) return res(false);
    const f = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { 'user-agent': 'Mozilla/5.0 Chrome/126' } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        f.close(); try { fs.unlinkSync(dest) } catch {}
        return dl(r.headers.location, dest, depth + 1).then(res);
      }
      if (r.statusCode !== 200) { f.close(); try { fs.unlinkSync(dest) } catch {}; return res(false) }
      r.pipe(f); f.on('finish', () => { f.close(); res(true) });
    });
    req.setTimeout(30000, () => { req.destroy(); f.close(); try { fs.unlinkSync(dest) } catch {}; res(false) });
    req.on('error', () => { try { fs.unlinkSync(dest) } catch {}; res(false) });
  });
}
;(async () => {
  const c = man.b1[0];
  const ok = await dl(c.regular, 'E:/madmona-app/scripts/final-two/beauty.jpg');
  console.log('beauty', ok ? 'OK' : 'FAIL', c.lic);
})();
