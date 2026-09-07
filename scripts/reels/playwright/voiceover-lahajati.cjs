// 🎙️ فويس أوفر من lahajati.ai (الديمو المجاني — ٢٥٠ حرف/مرة، من غير تسجيل) — محمد: «استخدم لهجتي للصوت»
// صوت «بدر» (رجّالي احترافي) · المصرية القاهرية (7) · إعلاني (102). الرد base64 WAV.
// argv: mp4In mp4Out
const { chromium } = require('E:/madmona-app/node_modules/playwright');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const ff = require('E:/madmona-app/node_modules/ffmpeg-static');
const [IN, OUT] = [process.argv[2], process.argv[3]];
const DIR = 'E:/madmona-app/scripts/reels/playwright/';
const CHUNKS = [
  'صاحب بيزنس؟ بتدفع في كام برنامج وبتربطهم بإيدك كل يوم؟ أمازون للبيع، بوكينج للإيجار، فيزيتا للعيادات، فريشا للصالونات، طلبات للأوردرات، أوبر للدليفري، أودو للحسابات، سي آر إم للعملاء، إتش آر للحضور والمرتبات.',
  'واتساب بوت بيرد بدالك، أب وورك للمحترفين، وشوبيفاي لموقعك. مضمونة… الاتناشر في أبليكيشن واحد. نفس الداتا، نفس الرقم، من موبايلك. وإحنا في النص بنضمن الصفقة للطرفين. السعر اللي بتطلبه هو اللي بتاخده. جرّبها: مضمونة كايرو دوت كوم.',
];
(async () => {
  for (const c of CHUNKS) if (c.length > 250) throw new Error('chunk > 250: ' + c.length);
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9223', { timeout: 30000 });
  const ctx = browser.contexts()[0];
  const page = await ctx.newPage();
  await page.goto('https://lahajati.ai/en', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  const token = await page.evaluate(() => { for (const s of document.scripts) { const m = (s.textContent || '').match(/_token',\s*'([A-Za-z0-9]+)'/); if (m) return m[1]; } return null; });
  if (!token) throw new Error('csrf token مش لاقيه');
  const wavs = [];
  for (let i = 0; i < CHUNKS.length; i++) {
    const res = await page.evaluate(async ({ text, token }) => {
      const fd = new FormData();
      fd.append('text', text); fd.append('voice_id', '1408'); fd.append('dialect_id', '7'); fd.append('performance_id', '102'); fd.append('_token', token);
      const r = await fetch(window.guestDemoEndpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
      const raw = await r.text(); let j = {}; try { j = JSON.parse(raw) } catch {}
      return { ok: r.status, status: j.status, msg: j.message, keys: Object.keys(j).join(','), head: raw.slice(0, 300), b64: j.stream_url || j.audio || j.data || null };
    }, { text: CHUNKS[i], token });
    console.log(`[lahajati] chunk ${i + 1}: http ${res.ok} status ${res.status} ${res.msg || ''} keys=${res.keys} b64 ${res.b64 ? String(res.b64).length : 0}`); if (!res.b64) console.log('[raw]', res.head);
    if (!res.b64) throw new Error('no audio for chunk ' + (i + 1));
    const f = `${DIR}vo-lahajati-${i + 1}.wav`; fs.writeFileSync(f, Buffer.from(res.b64, 'base64')); wavs.push(f);
    await page.waitForTimeout(2500);
  }
  await page.close();
  // دمج المقطعين + وقفة نص ثانية بينهم
  const list = `${DIR}vo-lahajati-list.txt`;
  fs.writeFileSync(list, wavs.map((w) => `file '${w.replace(/\\/g, '/')}'`).join('\n'));
  const mp3 = `${DIR}vo-brand-12-apps-lahajati.mp3`;
  execFileSync(ff, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-af', 'apad=pad_dur=0.3', '-c:a', 'libmp3lame', '-b:a', '128k', mp3]);
  const d = spawnSync(ff, ['-i', mp3], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const voSec = d ? (+d[2]) * 60 + parseFloat(d[3]) : 0;
  const v = spawnSync(ff, ['-i', IN], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const vidSec = v ? (+v[2]) * 60 + parseFloat(v[3]) : 0;
  const pad = Math.max(0, voSec + 0.6 - vidSec);
  console.log('[vo] seconds', voSec.toFixed(1), 'video', vidSec.toFixed(1), 'pad', pad.toFixed(1));
  execFileSync(ff, ['-y', '-v', 'error', '-i', IN, '-i', mp3, '-filter_complex', `[0:v]tpad=stop_mode=clone:stop_duration=${pad.toFixed(2)}[v]`, '-map', '[v]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-shortest', OUT]);
  console.log('[out]', OUT, (spawnSync(ff, ['-i', OUT], { encoding: 'utf8' }).stderr.match(/Duration: [\d:.]+/) || [''])[0]);
  process.exit(0);
})().catch((e) => { console.error('ERR', e.message.slice(0, 300)); process.exit(1); });
