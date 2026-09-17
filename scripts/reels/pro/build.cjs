// 🎬 تركيب ريل «ديمو حقيقي» (١٧/٩/٢٠٢٦) — لقطات حقيقية من الموقع جوّه موكاب موبايل متحرك + عناوين + انتقالات.
// محمد: «الريلز جودتها مش أحسن حاجة… كلها شبه بعض… مفيش تنويع وجرافيك احترافي».
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const D = __dirname, A = p => path.join(D, 'assets', p), S = p => path.join(D, 'shots', p)
const OUT = path.join(D, 'out'); fs.mkdirSync(OUT, { recursive: true })
const ff = args => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
const ENC = ['-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', '30']

// ١) الخطاف: تلات سطور بتنط بميل مختلف على خلفية فاتحة
function hook(file, dur = 4.6) {
  const lines = [['h1a.png', 0, -0.05, 700], ['h1b.png', 1.35, 0.035, 960], ['h1c.png', 2.65, -0.03, 1220]]
  const inputs = ['-loop', '1', '-t', dur, '-i', A('bg-light.png')]
  let fc = '[0]format=rgba[b0];'
  lines.forEach(([png, st, ang], i) => {
    inputs.push('-loop', '1', '-t', dur, '-itsoffset', st, '-i', A(png))
    fc += `[${i + 1}]format=rgba,rotate=a=${ang}:c=none:ow=rotw(${ang}):oh=roth(${ang}),` +
      `scale=w='2*trunc(iw*max(0.05,min(1,${st === 0 ? 0.6 : 0}+(t-${st})*7)*(1+0.18*exp(-9*max(0,t-${st}))*sin(22*max(0,t-${st}))))/2)':h='2*trunc(ih*max(0.05,min(1,${st === 0 ? 0.6 : 0}+(t-${st})*7)*(1+0.18*exp(-9*max(0,t-${st}))*sin(22*max(0,t-${st}))))/2)':eval=frame[l${i}];`
  })
  fc += `[b0][l0]overlay=x='(W-w)/2':y='${lines[0][3]}-h/2':eval=frame[o0];` +
        `[o0][l1]overlay=x='(W-w)/2':y='${lines[1][3]}-h/2':eval=frame[o1];` +
        `[o1][l2]overlay=x='(W-w)/2':y='${lines[2][3]}-h/2':eval=frame,format=yuv420p[v]`
  ff([...inputs.map(String), '-filter_complex', fc, '-map', '[v]', '-t', String(dur), ...ENC, file])
}

// ٢) مشهد الموبايل: لقطات حقيقية + إطار + دخول بميل + طفو + عنوان + شارة
function phone(file, { seq, fps, dur, head, chip }) {
  const inputs = ['-loop', '1', '-t', dur, '-i', A('bg-dark.png'),
    '-loop', '1', '-t', dur, '-i', A('phone-frame.png'),
    '-loop', '1', '-t', dur, '-i', A('screen-mask.png'),
    '-framerate', fps, '-i', path.join(S(seq), '%04d.png'),
    '-loop', '1', '-t', dur, '-i', A(head + '.png'),
    '-loop', '1', '-t', dur, '-itsoffset', 1.1, '-i', A(chip + '.png')]
  const fc =
    `[0]scale=1200:-2,crop=1080:1920:x='60+50*sin(t/2.2)':y='(ih-1920)/2'[bg];` +
    `[3]fps=30,scale=660:1428,format=rgba[scr];[2]format=gray,scale=660:1428[m];[scr][m]alphamerge[sm];` +
    `[1]format=rgba[fr];[fr][sm]overlay=26:26:eof_action=repeat[ph0];` +
    `[ph0]scale=640:-2,rotate=a='-0.07*pow(max(0,1-t/0.8),2)':c=none:ow=700:oh=1380[ph];` +
    `[4]format=rgba,fade=in:st=0.15:d=0.45:alpha=1[hd];` +
    `[5]format=rgba,scale=w='2*trunc(iw*max(0.05,min(1,(t-1.1)*6))/2)':h='2*trunc(ih*max(0.05,min(1,(t-1.1)*6))/2)':eval=frame[ch];` +
    `[bg][ph]overlay=x='(W-w)/2':y='320+1400*pow(max(0,1-t/0.7),3)+9*sin(t*1.7)':eval=frame[v1];` +
    `[v1][hd]overlay=x='(W-w)/2':y='70-50*max(0,1-(t-0.15)/0.45)':eval=frame[v2];` +
    `[v2][ch]overlay=x='(W-w)/2':y=1745:eval=frame,format=yuv420p[v]`
  ff([...inputs.map(String), '-filter_complex', fc, '-map', '[v]', '-t', String(dur), ...ENC, file])
}

// ٣) الختام
function cta(file, dur = 3.6) {
  const fc = `[0]scale=1200:-2,crop=1080:1920:x='60-40*t/3':y='(ih-1920)/2'[bg];` +
    `[1]format=rgba,scale=w='2*trunc(iw*(0.9+0.1*min(1,t/0.6))/2)':h='2*trunc(ih*(0.9+0.1*min(1,t/0.6))/2)':eval=frame,fade=in:st=0:d=0.5:alpha=1[c];` +
    `[bg][c]overlay=x='(W-w)/2':y='(H-h)/2':eval=frame,format=yuv420p[v]`
  ff(['-loop', '1', '-t', String(dur), '-i', A('bg-dark.png'), '-loop', '1', '-t', String(dur), '-i', A('cta.png'),
    '-filter_complex', fc, '-map', '[v]', '-t', String(dur), ...ENC, file])
}

const parts = [
  [path.join(OUT, 's1.mp4'), 4.6, () => hook(path.join(OUT, 's1.mp4'))],
  [path.join(OUT, 's2.mp4'), 3.9, () => phone(path.join(OUT, 's2.mp4'), { seq: 'start-type', fps: 26, dur: 3.9, head: 't2', chip: 'chip2' })],
  [path.join(OUT, 's3.mp4'), 4.7, () => phone(path.join(OUT, 's3.mp4'), { seq: 'clinics', fps: 26, dur: 4.7, head: 't3', chip: 'chip3' })],
  [path.join(OUT, 's4.mp4'), 5.7, () => phone(path.join(OUT, 's4.mp4'), { seq: 'store', fps: 20, dur: 5.7, head: 't4', chip: 'chip4' })],
  [path.join(OUT, 's5.mp4'), 3.0, () => cta(path.join(OUT, 's5.mp4'), 3.0)],
]
for (const [, , fn] of parts) fn()

const X = 0.4, trans = ['slideup', 'smoothleft', 'zoomin', 'fadeblack']
let fc = '', last = '[0:v]', t = 0
for (let i = 1; i < parts.length; i++) {
  t += parts[i - 1][1] - X
  fc += `${last}[${i}:v]xfade=transition=${trans[i - 1]}:duration=${X}:offset=${t.toFixed(2)}[x${i}];`
  last = `[x${i}]`
}
const total = parts.reduce((s, p) => s + p[1], 0) - X * (parts.length - 1)
const music = path.join(D, '..', 'music', 'exmusichqlibre518664.mp3')
const final = path.join(OUT, 'demo-clinic-pro.mp4')
// صوت بهجت (لهجتي V2 · dialect 7) فوق موسيقى منخفضة — محمد ١٧/٩: «ضيف صوت بهجت»
const vo = path.join(D, '..', 'playwright', 'output', 'vo-demo-clinic-pro-lahajati.mp3')
ff([...parts.flatMap(p => ['-i', p[0]]), '-i', music, '-i', vo,
  '-filter_complex', fc + `[${parts.length}:a]atrim=0:${total.toFixed(2)},afade=t=in:d=0.4,afade=t=out:st=${(total - 1.2).toFixed(2)}:d=1.2,volume=0.16[m];` +
    `[${parts.length + 1}:a]adelay=150|150,volume=1.35[v];[m][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]`,
  '-map', last, '-map', '[a]', ...ENC, '-c:a', 'aac', '-b:a', '160k', '-t', total.toFixed(2), final])
console.log(JSON.stringify({ final, seconds: +total.toFixed(2) }))
