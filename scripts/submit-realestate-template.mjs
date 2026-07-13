// يبعت تمبلت العقارات لميتا للاعتماد.
// مبني على madmona_supplier_intro_v1 (اللي جابت 50.9% رد) — نفس المبدأ:
// رسالة قصيرة + طلب رد بكلمة واحدة، مش لينك ولا كلام كتير.
const body =
  'أهلاً {{1}} 🧞 أنا المارد — مساعد منصة مضمونة.\n\n' +
  'مضمونة قناة بيع وتسويق لمشروعك: فريق سيلز + منصة + عملاء جاهزين. ' +
  'بننزّل مشروعك في بورصة مضمونة ببلاش، والعمولة بتتحدد بالاتفاق معاك.\n\n' +
  'رد عليّا بكلمة «مشروعي» وابعتلي الـPrice List صورة زي ما هي — ' +
  'وأنا أجهّز صفحة مشروعك من غير ما تكتب ولا حرف.';

const payload = {
  template: {
    name: 'madmona_realestate_broker_v1',
    language: 'ar',
    category: 'MARKETING',
    components: [
      { type: 'BODY', text: body, example: { body_text: [['حضرتك']] } },
    ],
  },
};

const r = await fetch(
  'https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/create-wa-template',
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
);
console.log(JSON.stringify(await r.json(), null, 2));
