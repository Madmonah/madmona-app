// إسلام خيري (+201080140401): بروشور RITZ New Zayed + IBP
const { wa, openChat, header, harvest } = require('./wa-lib');
(async () => {
  const { p } = await wa();
  await p.bringToFront();
  if (!(await openChat(p, '01080140401'))) { console.log('✗ الشات مافتحش'); process.exit(1); }
  console.log('الشات:', await header(p));
  console.log('بجمّع الميديا وأنا بلف...');
  const media = await harvest(p);
  const منه = media.filter((m) => m.وارد);
  console.log('\nالإجمالي:', media.length, '| منه:', منه.length);
  media.forEach((m, i) => console.log(' ', i + 1, m.وارد ? '⬅ منه' : '➡ مننا', m.نوع, m.اسم || ''));
  require('fs').writeFileSync(__dirname + '/harvest-01080140401.json', JSON.stringify(media, null, 1));
  process.exit(0);
})();
