const fs=require('fs'); const f='E:/madmona-app/scripts/reels/realestate/build.cjs';
let s=fs.readFileSync(f,'utf8');
const compact = `.devs.compact{gap:18px}
.devs.compact .dev{padding:22px 30px}
.devs.compact .n{font-size:38px}
.devs.compact .a{font-size:26px;margin-top:6px}
.devs.compact .x{font-size:30px;margin-top:8px}
table.compact{font-size:32px}
table.compact td{padding:18px 18px}
`;
// 1) شيل البلوك السايب اللي بره الـliteral
const startStray = s.indexOf('\n\n\n.devs.compact');
if (startStray > -1) {
  const endStray = s.indexOf('`', s.indexOf('table.compact td', startStray));
  s = s.slice(0, startStray) + s.slice(endStray + 1);
}
// 2) حط القواعد جوه الـliteral قبل القفلة
const anchor = '.big{font-size:60px;font-weight:800;color:${BRAND.dark}}\n';
if (!s.split('const esc')[0].includes('.devs.compact')) s = s.replace(anchor, anchor + compact);
fs.writeFileSync(f, s, 'utf8');
console.log('inside_literal', s.split('const esc')[0].includes('.devs.compact'), 'stray_gone', !/\n\n\n\.devs\.compact/.test(s));
