// (١٦/٩/٢٠٢٦) نسخة تانية بنص مختلف لبوست اختبار /quiz في قناة تليجرام @madmona_cairo (قناتنا — مش إرسال بارد).
// ليه: بوستات الجروب q2/q3 جابت صفر زيارات للاختبار — نجرّب قناة تانية بكابشن مختلف (قاعدة: كابشن مختلف لكل بوست).
const token = process.argv[2]
const text = [
  '❓ سؤال سريع لأصحاب البيزنس:',
  'أصعب حاجة في إدارة شغلك إيه — الموظفين ولا الحسابات ولا الزباين ولا المخزون؟',
  '',
  'الإجابة بتقول عنك أكتر مما تتخيل 👀',
  'اختبار ٦ أسئلة (من غير تسجيل ولا رقم) بيقولك إنت صاحب بيزنس نوعه إيه:',
  '🧠 الشايل كل حاجة في دماغه · 🧯 المطافي · 🚀 المغامر · 📋 المنظّم',
  '',
  'https://www.madmonacairo.com/quiz?utm_source=telegram&utm_medium=channel&utm_campaign=erp1000&utm_content=q3',
].join('\n')
fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ chat_id: '@madmona_cairo', text, disable_web_page_preview: false }),
}).then(r => r.json()).then(j => console.log(j.ok ? 'msg ' + j.result.message_id : 'ERR ' + JSON.stringify(j).slice(0, 200)))
