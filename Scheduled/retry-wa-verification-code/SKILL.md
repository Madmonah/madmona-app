---
name: retry-wa-verification-code
description: إعادة طلب كود تفعيل رقم واتساب المارد بعد كولداون ميتا
---

مهمة واحدة محددة: إعادة طلب كود تفعيل رقم واتساب مضمونة بعد انتهاء كولداون ميتا.

الخلفية: ميتا عملت WABA جديد (1026388446418481) بعد أزمة الفوترة، الرقم +201002229982 اتضاف بـphone_number_id جديد = 1281981441657183 وحالته PENDING/NOT_VERIFIED. طلب الكود الأول اترفض بكولداون ساعة (error 136024).

نفذ بأداة mcp__901e42ff-d2f9-4cdc-bdf9-36fb58f09b9c__execute_sql على project_id "mjhflxpxunwycbiquoig":

DO $$
DECLARE tok text;
BEGIN
  SELECT value INTO tok FROM whatsapp_config WHERE key='access_token';
  PERFORM net.http_post(
    url:='https://graph.facebook.com/v21.0/1281981441657183/request_code',
    headers:=jsonb_build_object('Authorization','Bearer '||tok,'Content-Type','application/json'),
    body:=jsonb_build_object('code_method','SMS','language','ar')
  );
END $$;

استنى 5 ثواني وشوف آخر رد في net._http_response (SELECT id, status_code, content FROM net._http_response ORDER BY id DESC LIMIT 1). لو نجح (مفيش error في الرد) — بلّغ محمد: «كود التفعيل اتبعت SMS على رقم المارد 01002229982 — ابعتهولي وأنا أكمل التفعيل». لو لسه كولداون — بلّغه إن ميتا لسه رافضة وإنه ممكن يطلب الكود يدوي من business.facebook.com → WhatsApp accounts → Madmona → Phone numbers → Verify.