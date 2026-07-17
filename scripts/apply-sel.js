const fs = require('fs');
const S = 'E:\\madmona-app\\scripts\\';
let raw = fs.readFileSync(S + 'clip.json', 'utf8').replace(/^﻿/, '').trim();
let sel;
try { sel = JSON.parse(raw); }
catch (e) { console.log('BAD JSON:', e.message, '\nHEAD:', raw.slice(0, 200)); process.exit(1); }

const ids = Object.keys(sel);
console.log('SELECTED:', ids.length);

const projects = JSON.parse(fs.readFileSync(S + 'proj-list.json', 'utf8'));
const byId = Object.fromEntries(projects.map(p => [p.id, p]));

const rows = ids.map(id => ({
  id,
  title: byId[id] ? byId[id].title : '?',
  url: sel[id],
}));
rows.forEach((r, i) => console.log(`${i + 1}. ${r.title} -> ${r.url.slice(0, 70)}`));

fs.writeFileSync(S + 'selected.json', JSON.stringify(rows, null, 1), 'utf8');
console.log('\n-> selected.json');
