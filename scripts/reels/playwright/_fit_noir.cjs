// ⏱️ يظبط مدد مشاهد ريل نوار على طول الفويس أوفر (+٠.٦ ث) — noir.config.js (len: X داخل كيان الـslug)
const fs = require('fs'), { spawnSync } = require('child_process')
const D = 'E:/madmona-app/scripts/reels/playwright/'
const slug = process.argv[2]
const vo = D + 'vo-' + slug + '-lahajati.mp3'
const m = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', vo], { encoding: 'utf8' }).stdout.trim()
const target = parseFloat(m) + 0.6
let s = fs.readFileSync(D + 'noir.config.js', 'utf8')
const i = s.indexOf("slug: '" + slug + "'")
if (i < 0) throw new Error('slug not found')
const a = s.indexOf('scenes: [', i), b = s.indexOf('\n    ],', a)
let block = s.slice(a, b)
const lens = [...block.matchAll(/\{ len: ([\d.]+)/g)].map(x => parseFloat(x[1]))
const sum = lens.reduce((p, c) => p + c, 0)
const k = target / sum
block = block.replace(/\{ len: ([\d.]+)/g, (_, v) => '{ len: ' + (parseFloat(v) * k).toFixed(2))
s = s.slice(0, a) + block + s.slice(b)
fs.writeFileSync(D + 'noir.config.js', s)
console.log(slug, 'vo', m, 'scenes', sum.toFixed(1), '->', target.toFixed(1), 'k', k.toFixed(3))
