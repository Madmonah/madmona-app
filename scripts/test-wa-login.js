// 🧪 E2E التوحيد: start → (محاكاة تأكيد بالSQL برة) → finish → madmona_token موجود؟
const B = 'https://www.madmonacairo.com/api/auth/wa'
;(async () => {
  const s = await fetch(B, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({action:'start'}) }).then(r=>r.json())
  console.log('CODE=' + s.code)
})()
