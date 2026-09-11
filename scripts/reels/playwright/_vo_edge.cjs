// 🎙️ فويس أوفر احتياطي مجاني (Edge ar-EG) — يُستخدم بس لما لهجتي خارجة/رصيدها خلص، ويتقال لمحمد صراحةً.
// argv: <slug>  → يقرا output/vo-<slug>.txt ويكتب vo-<slug>-lahajati.mp3 (نفس اسم الملف اللي السكريبتات بتتوقعه) + يطبع المدة
const { MsEdgeTTS, OUTPUT_FORMAT } = require('E:/madmona-app/scripts/node_modules/msedge-tts')
const fs = require('fs'), { spawnSync } = require('child_process')
const D = 'E:/madmona-app/scripts/reels/playwright/'
const slug = process.argv[2]
const rate = process.argv[3] || '+8%'
const TXT = fs.readFileSync(D + 'output/vo-' + slug + '.txt', 'utf8').split('\n').join(' … ')
;(async () => {
  const tts = new MsEdgeTTS()
  await tts.setMetadata('ar-EG-ShakirNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
  const { audioStream } = tts.toStream(TXT, { rate })
  const chunks = []
  await new Promise((res, rej) => { audioStream.on('data', c => chunks.push(c)); audioStream.on('end', res); audioStream.on('error', rej) })
  const out = D + 'vo-' + slug + '-lahajati.mp3'
  fs.writeFileSync(out, Buffer.concat(chunks))
  const d = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', out], { encoding: 'utf8' }).stdout.trim()
  console.log('edge vo', slug, Math.round(fs.statSync(out).size / 1024), 'KB', d, 's')
})().catch(e => { console.error('ERR', e.message); process.exit(1) })
