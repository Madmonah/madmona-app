// 📲 (١٣/٩) إضافة مسار واتساب وارد للـCTA في كابشنات قصة — محمد: «لازم يكون فيه تحويل». الرقم = INTAKE_WA الرسمي (وارد بس، مفيش إرسال).
const fs = require('fs'); const slug = process.argv[2]; const D = __dirname + '/output/'
const line = '\n📲 أو ابعت كلمة start واتساب على 01002229982 وهنفتحلك اللوحة'
for (const p of ['youtube', 'tiktok', 'instagram', 'facebook', 'threads', 'telegram']) {
  const f = `${D}caption-${slug}-${p}.txt`; let t = fs.readFileSync(f, 'utf8'); if (t.includes('01002229982')) continue
  if (p === 'tiktok') t = t.replace(' #قصص_بيزنس', line.trim() + ' #قصص_بيزنس')
  else t = t.replace(/(اكتب start في كومنت[^\n]*)/, '$1' + line)
  fs.writeFileSync(f, t); console.log(p, [...t].length)
}
