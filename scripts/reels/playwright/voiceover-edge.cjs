// فويس أوفر مصري مجاني (Edge neural — ar-EG) لريل البراند، ودمجه في الفيديو بـffmpeg
// argv: mp4In mp4Out
const { MsEdgeTTS, OUTPUT_FORMAT } = require('E:/madmona-app/scripts/node_modules/msedge-tts');
const { execFileSync } = require('child_process');
const fs = require('fs');
const ff = require('E:/madmona-app/node_modules/ffmpeg-static');
const [IN, OUT] = [process.argv[2], process.argv[3]];
const TXT = `صاحب بيزنس؟ بتدفع في كام برنامج؟ وبتربطهم بإيدك كل يوم؟
أمازون للبيع، بوكينج للإيجار، فيزيتا للعيادات، فريشا للصالونات،
طلبات للأوردرات، أوبر للدليفري، أودو للحسابات، سي آر إم للعملاء،
إتش آر للحضور والمرتبات، واتساب بوت بيرد بدالك، أب وورك للمحترفين، وشوبيفاي لموقعك.
مضمونة… الاتناشر في أبليكيشن واحد. نفس الداتا، نفس الرقم، من موبايلك.
وإحنا في النص — بنضمن الصفقة للطرفين. السعر اللي بتطلبه هو اللي بتاخده.
جرّبها: مضمونة كايرو دوت كوم.`;
(async () => {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('ar-EG-ShakirNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const mp3 = 'E:/madmona-app/scripts/reels/playwright/vo-brand-12-apps.mp3';
  const { audioStream } = tts.toStream(TXT, { rate: '+24%' });
  const chunks = [];
  await new Promise((res, rej) => { audioStream.on('data', (c) => chunks.push(c)); audioStream.on('end', res); audioStream.on('error', rej); });
  fs.writeFileSync(mp3, Buffer.concat(chunks));
  console.log('vo mp3', Math.round(fs.statSync(mp3).size / 1024), 'KB');
  // دمج: الصوت على الفيديو (الفيديو ٣٨ ث) — لو الصوت أطول بيتقص على الفيديو
  execFileSync(ff, ['-y', '-v', 'error', '-i', IN, '-i', mp3, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', OUT]);
  const probe = require('child_process').spawnSync(ff, ['-i', OUT], { encoding: 'utf8' });
  console.log((probe.stderr.match(/Duration: [0-9:.]+/) || [''])[0], (probe.stderr.match(/Stream #0:1.*Audio.*/) || [''])[0].slice(0, 80));
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
