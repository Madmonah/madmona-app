// 📤 رسالة طلب تحديث الوحدات — للمطورين اللي جوه نافذة الـ24 ساعة بس
const MSG = (project) => `أهلاً بحضرتك 🧞 معاك المارد من مضمونة

خبر حلو: فعّلنا خدمة جديدة لمشروع ${project} — العميل بقى يقدر يحجز وحدته من الماستر بلان على موقعنا *حجز مؤكد ٤٨ ساعة* لحد ما يتم التعاقد.

عشان نشغّلها لحضرتك محتاجين:
1️⃣ قايمة الوحدات المتاحة دلوقتي (كود الوحدة · النوع · المساحة · السعر)
2️⃣ لو حابب تفعّل الحجز الفوري — تكلفة الحجز إيه؟ (وهل بتتخصم من المقدم؟)

ابعتلي القايمة هنا وأنا أظبطها لحضرتك، أو حدّثها بنفسك من لوحة التحكم:
https://www.madmonacairo.com/my-projects

كل حجز هيوصلك إشعاره فوراً — معاملاتك مضمونة 💚`

;(async () => {
  const r = await fetch('https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/whatsapp-test-send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ to: '201111534331', mode: 'text', message: MSG('TRI HUB') }),
  })
  console.log(r.status, JSON.stringify(await r.json()).slice(0, 300))
})()
