// 🎯 E2E (١٤/٩): محاكاة رسالة واردة «start» على 01002229982 من رقم محمد (201026222337) → الرد الفوري + ليد wa-start + پوش.
// الرد بيتبعت فعلًا لواتساب محمد من 982 — ده الإثبات.
const fs = require('fs');
const SECRET = (fs.readFileSync('E:/madmona-app/.env.vercel-prod', 'utf8').match(/WA_SERVICE_SECRET="([^"]+)"/) || [])[1];
const FROM = process.argv[2] || '201026222337';
(async () => {
  const wh = { event: 'message.received', sessionId: '201002229982', data: { from: FROM + '@c.us', to: '201002229982@c.us', body: 'start', fromMe: false, id: 'e2e-start-' + Date.now(), timestamp: Math.floor(Date.now() / 1000), type: 'chat', chatName: 'E2E start' } };
  const r = await fetch('https://www.madmonacairo.com/api/whatsapp/openwa?token=' + SECRET, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(wh) }).then(x => x.json()).catch(e => ({ err: e.message }));
  console.log(JSON.stringify(r));
})();
