// رسالة نصية لقناة تليجرام @madmona_cairo (قناتنا — مش إرسال بارد) عن اختبار /quiz (١٥/٩/٢٠٢٦)
const token = process.argv[2]
const text = [
  '🧩 اختبار دقيقة واحدة: إنت صاحب بيزنس نوعه إيه؟',
  '',
  '🧠 الشايل كل حاجة في دماغه',
  '🧯 المطافي',
  '🚀 المغامر',
  '📋 المنظّم',
  '',
  '٦ أسئلة من غير تسجيل ومن غير رقم — وشارك نتيجتك مع صحابك اللي عندهم بيزنس 👇',
  'https://www.madmonacairo.com/quiz?utm_source=telegram&utm_medium=channel&utm_campaign=erp1000&utm_content=quiz',
].join('\n')
fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: '@madmona_cairo', text, disable_web_page_preview: false }),
}).then(r => r.json()).then(j => console.log(JSON.stringify({ ok: j.ok, id: j.result && j.result.message_id, err: j.description })))
  .catch(e => console.log('ERR', e.message))
