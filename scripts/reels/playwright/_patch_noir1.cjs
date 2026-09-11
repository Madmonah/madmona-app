// 🐞 (١١/٩) CSS transform animations على <g> ليه transform attribute بتلغي الـtranslate → الشخصيات والفقاعات بتقفز لأصل اللوحة.
// الحل: مجموعة خارجية للموضع (transform attr) ومجموعة داخلية للحركة (class). + رفع الأرض لفوق عشان الترجمة ماتغطيش الشخصيات.
const fs = require('fs')
const D = 'E:/madmona-app/scripts/reels/playwright/'
let b = fs.readFileSync(D + 'build-noir.js', 'utf8')
b = b.replace(
  "return `<g class=\"fig pose-${pose} ${cls}\" transform=\"${t}\" style=\"animation-delay:${delay}s\">",
  "return `<g class=\"fig-pos\" transform=\"${t}\"><g class=\"fig pose-${pose} ${cls}\" style=\"animation-delay:${delay}s\">")
b = b.replace("    ${pose === 'headdown' ? '<circle class=\"sweat\" cx=\"44\" cy=\"-300\" r=\"6\"/>' : ''}\n  </g>`", "    ${pose === 'headdown' ? '<circle class=\"sweat\" cx=\"44\" cy=\"-300\" r=\"6\"/>' : ''}\n  </g></g>`")
b = b.replace(
  "bubble: (x, y, text, w = 420) => `<g class=\"bubble\" transform=\"translate(${x} ${y})\">",
  "bubble: (x, y, text, w = 420) => `<g transform=\"translate(${x} ${y})\"><g class=\"bubble\">")
b = b.replace("<text x=\"0\" y=\"8\" text-anchor=\"middle\">${esc(text)}</text></g>`,", "<text x=\"0\" y=\"8\" text-anchor=\"middle\">${esc(text)}</text></g></g>`,")
// الترجمة أقرب للأسفل + العنوان أعلى
b = b.replace('.sub{position:absolute;bottom:14cqw;', '.sub{position:absolute;bottom:5cqw;')
if (!b.includes('class="fig-pos"') || !b.includes('bottom:5cqw')) throw new Error('builder patch failed')
fs.writeFileSync(D + 'build-noir.js', b)

let c = fs.readFileSync(D + 'noir.config.js', 'utf8')
c = c.replace(/1500/g, '1240').replace(/p\.desk\(330, 1370/g, 'p.desk(330, 1110').replace(/p\.papers\(540, 1330/g, 'p.papers(540, 1070')
  .replace("p.bigphone(760, 1000,", "p.bigphone(760, 700,").replace("p.bigphone(540, 800,", "p.bigphone(540, 620,")
  .replace("p.bubble(200, 1120", "p.bubble(200, 860").replace("p.bubble(540, 1120", "p.bubble(540, 860").replace("p.bubble(880, 1120", "p.bubble(880, 860")
  .replace("p.ring(330, 1180)", "p.ring(330, 920)").replace("p.flash(470, 1180)", "p.flash(470, 920)").replace("p.qmark(540, 1000)", "p.qmark(540, 760)")
  .replace("p.calendar(540, 900)", "p.calendar(540, 760)")
  .replace("f({ x: 640, y: 1240, pose: 'phone' })", "f({ x: 640, y: 1240, h: 380, pose: 'phone' })")
fs.writeFileSync(D + 'noir.config.js', c)
console.log('patched')
