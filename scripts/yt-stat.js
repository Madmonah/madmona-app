const r = require('./yt-report.json');
const e = {};
r.forEach(o => { const k = o.err || (o.best ? 'OK' : 'no-match'); e[k] = (e[k]||0)+1 });
console.log(e);
r.forEach((o,i) => {
  if (!o.best) { console.log(`\n[${i}] ✗ ${o.q}  (${o.err||'no-match'})`); return; }
  const b = o.best;
  console.log(`\n[${i}] ${o.q}`);
  console.log(`  ★${b.score} ${b.vid} | ${b.len} | ${b.views||''}\n    ${b.title}\n    📺 ${b.chan}`);
  (o.alts||[]).forEach(a => console.log(`  ·${a.score} ${a.vid} | ${a.len}\n    ${a.title}\n    📺 ${a.chan}`));
});
