// 📱 (١٠/٩/٢٠٢٦) محمد: «إعلان يخطف… صور وفيديوهات وحركة ولقطات زي الحاجات اللي بتطلع من شاشة الموبايل».
// مشهد جديد `phone`: موبايل بإطار حقيقي جوّاه لقطة حقيقية من اللوحة بتتحرك (سكرول + دخول بميل)، وفوقه سطر كبير.
const fs = require('fs')
const f = 'E:/madmona-app/scripts/reels/playwright/build-reels.js'
let s = fs.readFileSync(f, 'utf8')
if (!s.includes("case 'phone':")) {
  // 1) render
  s = s.replace("    case 'end':", `    case 'phone':
      // 📱 (١٠/٩) لقطة حقيقية من اللوحة جوّه موبايل — بتسكرول ببطء + دخول بميل. shot من bg/
      return \`<div class="\${cls} phone-sc">
    <p class="big ph-big">\${esc(sc.text)}\${sc.em ? \`<em>\${esc(sc.em)}</em>\` : ''}</p>
    <div class="phone"><span class="notch"></span><div class="screen"><img class="shot" src="\${bgUri(sc.shot)}" alt=""></div></div>
\${sc.cap ? \`    <p class="ph-cap">\${esc(sc.cap)}</p>\` : ''}
  </div>\`

    case 'end':`)
  // 2) timing
  s = s.replace("    if (sc.type === 'end') out.push(", `    if (sc.type === 'phone') {
      out.push(\`body.go .s\${i} .phone{animation-delay:\${(t + 0.25).toFixed(2)}s}\`)
      out.push(\`body.go .s\${i} .shot{animation-delay:\${(t + 1.0).toFixed(2)}s;animation-duration:\${Math.max(sc.len - 1.2, 1).toFixed(2)}s}\`)
      out.push(\`body.go .s\${i} .ph-cap{animation-delay:\${(t + 0.9).toFixed(2)}s}\`)
    }
    if (sc.type === 'end') out.push(`)
  // 3) css — قبل بلوك parties
  s = s.replace("/* parties */", `/* phone (١٠/٩) */
.phone-sc{justify-content:center;align-items:center;text-align:center;gap:3cqw}
.ph-big{font-size:8.6cqw}
.phone{width:64cqw;aspect-ratio:9/18.6;border-radius:7cqw;background:#0b0f0e;padding:1.7cqw;position:relative;
       box-shadow:0 4cqw 9cqw rgba(0,0,0,.35),inset 0 0 0 .5cqw #2a2f2d;opacity:0}
.notch{position:absolute;top:1.7cqw;left:50%;transform:translateX(-50%);width:22cqw;height:3.2cqw;background:#0b0f0e;border-radius:0 0 3cqw 3cqw;z-index:2}
.screen{width:100%;height:100%;border-radius:5.4cqw;overflow:hidden;background:#fff;position:relative}
.shot{width:100%;height:auto;display:block;transform:translateY(0)}
.ph-cap{font-size:4.4cqw;font-weight:800;color:var(--green);opacity:0}
body.go .phone{animation:phonein .8s both cubic-bezier(.2,.9,.25,1.05)}
body.go .shot{animation:shotscroll linear both}
body.go .ph-cap{animation:pop .45s both cubic-bezier(.2,.85,.3,1.05)}
@keyframes phonein{from{opacity:0;transform:translateY(9cqw) rotateX(18deg) scale(.94)}to{opacity:1;transform:none}}
@keyframes shotscroll{from{transform:translateY(0)}to{transform:translateY(-28%)}}
.has-bg .ph-big em{color:var(--mint)}

/* parties */`)
  fs.writeFileSync(f, s)
  console.log('builder patched')
} else console.log('builder already has phone')

// 4) المشاهد: المقاولات + العقارات بلقطات حقيقية
const cf = 'E:/madmona-app/scripts/reels/playwright/reels.config.js'
let c = fs.readFileSync(cf, 'utf8')
const setScenes = (slug, scenes) => {
  const re = new RegExp("(slug: \"" + slug + "\",[\\s\\S]*?scenes: )(\\[[\\s\\S]*?\\]),\\n")
  if (!re.test(c)) throw new Error('scenes anchor ' + slug)
  c = c.replace(re, (m, a) => a + JSON.stringify(scenes) + ',\n')
}
setScenes('contracting-custody', [
  { type: 'big', len: 5, reveal: 1.7, text: 'المشرف صرف العهدة…', em: 'والفواتير في جيبه 🧾' },
  { type: 'big', len: 6, reveal: 2, text: 'مهندس طارق — مقاولات في ٦ أكتوبر', em: 'كل موقع ليه عهدة مع المشرف', note: 'وآخر الشهر محدش عارف اتصرفت في إيه', bg: 'biz2-counting.jpg' },
  { type: 'phone', len: 7, text: 'على مضمونة', em: 'المشرف بيسجّل المصروف بصورة الفاتورة', shot: 'erp-monitor.jpg', cap: 'من موبايله وهو في الموقع' },
  { type: 'phone', len: 7, text: 'والعهدة بتتسوّى لوحدها', em: 'حتى لو صرف أكتر', shot: 'erp-attendance.jpg', cap: 'مستخلصات · جدول كميات · أوامر تغيير' },
  { type: 'phone', len: 6, text: 'ربحية كل مشروع', em: 'قبل ما يخلص', shot: 'erp-crm.jpg', cap: 'تعرف المشروع كسبان ولا لأ' },
  { type: 'big', len: 6, reveal: 2, text: 'برنامج الإدارة كامل', em: 'بـ١٠٠٠ ج بدل كتير', note: 'لعدد محدود من الحسابات' },
  { type: 'end', len: 6, line: 'ضيف شركتك في دقيقتين', sub: 'madmonacairo.com/pro' },
])
setScenes('realestate-agent-left', [
  { type: 'big', len: 5, reveal: 1.7, text: 'المندوب مشي…', em: 'وأخد العملاء معاه في واتسابه 😶' },
  { type: 'big', len: 6, reveal: 2, text: 'أستاذ كريم — تسويق عقاري في التجمع', em: 'كل عميل كان في فون المندوب', note: 'المندوب مشي… والعملاء راحوا معاه', bg: 'biz1-paperwork.jpg' },
  { type: 'phone', len: 7, text: 'على مضمونة', em: 'كل عميل مسجّل على الشركة', shot: 'erp-crm.jpg', cap: 'معايناته · مكالماته · مين شايله' },
  { type: 'phone', len: 7, text: 'قايمة مكالمات يومية', em: 'لكل مندوب', shot: 'erp-atrisk.jpg', cap: 'والأقساط المتأخرة بتتعلّم لوحدها' },
  { type: 'phone', len: 6, text: 'المندوب يمشي', em: 'العميل يفضل', shot: 'erp-monitor.jpg', cap: 'الوحدات: متاحة · محجوزة · مباعة' },
  { type: 'big', len: 6, reveal: 2, text: 'برنامج الإدارة كامل', em: 'بـ١٠٠٠ ج بدل كتير', note: 'لعدد محدود من الحسابات' },
  { type: 'end', len: 6, line: 'ضيف شركتك في دقيقتين', sub: 'madmonacairo.com/pro' },
])
fs.writeFileSync(cf, c)
console.log('scenes ok')
