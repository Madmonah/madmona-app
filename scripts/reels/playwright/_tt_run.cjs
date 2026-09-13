// 🎵 مشغّل تيك توك: بيقرا الكابشن من الملف وبيشغّل post-tiktok.js بـTT_POST=1 (argv يونيكود سليم عبر spawn). argv: <slug>
const { spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path')
const D = __dirname; const slug = process.argv[2]
const cap = fs.readFileSync(path.join(D, 'output', `caption-${slug}-tiktok.txt`), 'utf8').trim()
const r = spawnSync(process.execPath, [path.join(D, 'posters', 'post-tiktok.js'), path.join(D, 'output', `reel-${slug}.mp4`), cap], { stdio: 'inherit', env: { ...process.env, TT_POST: '1' } })
process.exit(r.status || 0)
