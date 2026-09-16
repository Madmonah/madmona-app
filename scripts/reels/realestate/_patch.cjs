const fs=require('fs'); const f='E:/madmona-app/scripts/reels/realestate/build.cjs';
let s=fs.readFileSync(f,'utf8');
const cssAdd = `
.devs.compact{gap:18px}
.devs.compact .dev{padding:22px 30px}
.devs.compact .n{font-size:38px}
.devs.compact .a{font-size:26px;margin-top:6px}
.devs.compact .x{font-size:30px;margin-top:8px}
table.compact{font-size:32px}
table.compact td{padding:18px 18px}
`;
if(!s.includes('.devs.compact')){ s=s.replace("const esc = s =>", cssAdd.replace(/`/g,'')+"`\n\nconst esc = s =>"); s=s.replace(/`\n\n`/,'`\n'); }
// حقن الكلاس المضغوط
s=s.replace("if (c.kind === 'rows') return `<h2>${esc(c.title)}</h2><table>",
            "if (c.kind === 'rows') return `<h2>${esc(c.title)}</h2><table class=\"${c.rows.length > 5 ? 'compact' : ''}\">");
s=s.replace("if (c.kind === 'devs') return `<h2>${esc(c.title)}</h2><div class=devs>",
            "if (c.kind === 'devs') return `<h2>${esc(c.title)}</h2><div class=\"devs ${c.devs.length > 3 ? 'compact' : ''}\">");
fs.writeFileSync(f,s,'utf8'); console.log('patched', s.includes('.devs.compact'), s.includes("c.rows.length > 5"), s.includes("c.devs.length > 3"));
