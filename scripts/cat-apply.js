// 🖼️ نزّل النسخ الكاملة للصور المختارة (بعد المراجعة بالعين) — استعداداً للرفع
const fs = require('fs'), https = require('https');
const OUT = 'E:/madmona-app/scripts/cat-final'; fs.mkdirSync(OUT, { recursive: true });
const man = JSON.parse(fs.readFileSync('E:/madmona-app/scripts/cat-hero/manifest.json', 'utf8'));

// الاختيارات: slug → index المرشح المعتمد (beauty مستبعدة — كل مرشحيها وحشين)
const PICK = {
  'shop-produce': 0,
  'shop-supermarket': 6,
  'sale-furniture-home': 3,
  'sale-furniture-office': 9,
  'shop-pharmacy': 6,
  'shop-hardware': 0,
  'home-services': 0,
  'shop-car-accessories': 7,
  'shop-misc': 8,
  'shop-motorcycle-parts': 3,
};

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
  for (const [slug, idx] of Object.entries(PICK)) {
    const cand = (man[slug] || [])[idx];
    if (!cand) { console.log(slug, 'NO CANDIDATE'); continue }
    const ok = await dl(cand.regular, `${OUT}/${slug}.jpg`);
    console.log(slug, ok ? 'OK' : 'FAIL', '(' + (cand.src || '') + ' | ' + (cand.lic || '') + ')');
  }
})();
