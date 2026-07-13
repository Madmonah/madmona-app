const d = require('E:\\madmona-app\\scripts\\fb-final.json');
const seen = new Set(['01125222203']); // Ali اترد عليه
const out = [];
for (const c of d) {
  if (c.isMe || c.weReplied || !c.phone) continue;
  if (seen.has(c.phone)) continue;
  seen.add(c.phone);
  out.push({ phone: c.phone, author: c.author, text: c.text.slice(0, 70) });
}
console.log(JSON.stringify(out, null, 1));
console.log('TOTAL=', out.length);
console.log('PHONES=', out.map(o => o.phone).join(' '));
