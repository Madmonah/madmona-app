// فويس أوفر مصري (Edge neural ar-EG-ShakirNeural) لأي ريل.
// استخدام: node _vo_edge.cjs <slug>   — بيقرا vo-<slug>.txt وبيطلّع vo-<slug>.mp3
const { MsEdgeTTS, OUTPUT_FORMAT } = require('E:/madmona-app/scripts/node_modules/msedge-tts');
const fs = require('fs');
const slug = process.argv[2];
const TXT = fs.readFileSync(`vo-${slug}.txt`, 'utf8').trim();
(async () => {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('ar-EG-ShakirNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(TXT, { rate: '+18%' });
  const chunks = [];
  await new Promise((res, rej) => { audioStream.on('data', c => chunks.push(c)); audioStream.on('end', res); audioStream.on('error', rej); });
  const out = `vo-${slug}.mp3`;
  fs.writeFileSync(out, Buffer.concat(chunks));
  console.log('vo', out, Math.round(fs.statSync(out).size / 1024), 'KB');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
