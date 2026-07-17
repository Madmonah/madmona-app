// (أ) ثمبنيلات فيديوهات الـ4 البانر — مرشح غلاف · (ب) مرشحين «تجميل» باستعلامات أحسن
const fs = require('fs'), https = require('https');
const OUT = 'E:/madmona-app/scripts/thumbs'; fs.mkdirSync(OUT, { recursive: true });
const VIDS = [
  ['veni', 'EDgetZeZf28'], ['capital-prime', 'x8hX7-_ZIz8'],
  ['noll', 'pmvxkODb4j8'], ['district-palm', 'F9pzfJ6Gwvk'],
];
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
    req.setTimeout(25000, () => { req.destroy(); f.close(); try { fs.unlinkSync(dest) } catch {}; res(false) });
    req.on('error', () => { try { fs.unlinkSync(dest) } catch {}; res(false) });
  });
}
function getJson(url) {
  return new Promise((res, rej) => {
    const req = https.get(url, { headers: { 'user-agent': 'Mozilla/5.0 Chrome/126', accept: 'application/json' } }, (r) => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)) } catch (e) { rej(e) } });
    });
    req.setTimeout(20000, () => { req.destroy(); rej(new Error('timeout')) }); req.on('error', rej);
  });
}
;(async () => {
  // (أ) ثمبنيلات — maxres وإلا hq
  for (const [slug, vid] of VIDS) {
    let ok = await dl(`https://img.youtube.com/vi/${vid}/maxresdefault.jpg`, `${OUT}/${slug}.jpg`);
    if (!ok) ok = await dl(`https://img.youtube.com/vi/${vid}/hqdefault.jpg`, `${OUT}/${slug}.jpg`);
    console.log('thumb', slug, ok ? 'OK' : 'FAIL');
  }
  // (ب) تجميل — استعلامات مركزة على المنتجات (مش الصالونات والحفلات)
  const beautyManifest = {};
  const QUERIES = [['b1', 'makeup brushes cosmetics'], ['b2', 'nail polish bottles colorful'], ['b3', 'lipstick cosmetics products']];
  for (const [tag, q] of QUERIES) {
    try {
      const j = await getJson('https://api.openverse.org/v1/images/?q=' + encodeURIComponent(q) + '&per_page=6&license_type=commercial&aspect_ratio=wide');
      beautyManifest[tag] = [];
      for (let i = 0; i < (j.results || []).slice(0, 6).length; i++) {
        const r = j.results[i];
        beautyManifest[tag].push({ i, regular: r.url, lic: r.license });
        await dl(r.thumbnail, `${OUT}/beauty-${tag}-${i}.jpg`);
      }
      console.log('beauty', tag, beautyManifest[tag].length);
    } catch (e) { console.log('beauty', tag, 'ERR', e.message.slice(0, 40)) }
  }
  fs.writeFileSync(`${OUT}/beauty-manifest.json`, JSON.stringify(beautyManifest, null, 1));
})();
