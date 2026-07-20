---
name: register-wa-3min-retry
description: إعادة محاولة register + verify للرقم +201002229982 بعد ٣ دقائق
---

مهمة لمرة واحدة: أعد محاولة تفعيل رقم واتساب المارد.

استخدم `mcp__901e42ff-d2f9-4cdc-bdf9-36fb58f09b9c__execute_sql` مع `project_id "mjhflxpxunwycbiquoig"`.

1) افحص حالة الرقم:
```sql
DO $$ DECLARE tok text; BEGIN
  SELECT value INTO tok FROM whatsapp_config WHERE key='access_token';
  PERFORM net.http_get(url:='https://graph.facebook.com/v22.0/1281981441657183?fields=code_verification_status,status',
    headers:=jsonb_build_object('Authorization','Bearer '||tok));
END $$;
SELECT pg_sleep(4);
SELECT content::text FROM net._http_response ORDER BY id DESC LIMIT 1;
```

2) لو `code_verification_status = VERIFIED` — اعمل register + subscribed_apps ثم بلّغ محمد بسطر «✅ المارد رجع شغال! ابعت رسالة تجريبية على 01002229982 وأنا هرد».

3) لو لسه NOT_VERIFIED أو register فشل بـ2388001: بلّغه «⚠️ لسه محتاج فاريفكيشن — افتح business.facebook.com/wa/manage/phone-numbers/، اضغط Verify، اختار SMS/Voice، ادخل الكود اللي هيوصلك، وقولي». استخدم mcp__cowork__send_user_message مرة واحدة فقط.