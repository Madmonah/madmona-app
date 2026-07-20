---
name: retry-wa-verification-30min
description: فحص الرقم كل نص ساعة + إعادة طلب كود التفعيل من ميتا لحد ما يشتغل
---

مهمة دورية: تحقق من حالة رقم واتساب المارد وحاول تطلب كود التفعيل. أنت في مضمونة (madmonacairo.com) وأداة Supabase الأساسية هي `mcp__901e42ff-d2f9-4cdc-bdf9-36fb58f09b9c__execute_sql` مع `project_id "mjhflxpxunwycbiquoig"`.

## الخلفية
ميتا عملت WABA جديد **1026388446418481** بعد أزمة دفع ١٨ يوليو. رقم الشركة **+201002229982** اتضاف بـphone_number_id **1281981441657183** وحالته PENDING/NOT_VERIFIED. الكولداون بيرفض طلب SMS ساعة أول مرة (error 136024). المطلوب: نتحقق كل نص ساعة ونعيد الطلب لحد ما ميتا تبعت الكود.

## الخطوات (لكل تشغيل)

### 1) اتأكد حالة الرقم أولاً — لو اتفعل من غيرنا يبقى خلاص
```sql
DO $$ DECLARE tok text; BEGIN
  SELECT value INTO tok FROM whatsapp_config WHERE key='access_token';
  PERFORM net.http_get(
    url:='https://graph.facebook.com/v21.0/1281981441657183?fields=id,display_phone_number,verified_name,code_verification_status,status',
    headers:=jsonb_build_object('Authorization','Bearer '||tok)
  );
END $$;
SELECT pg_sleep(4);
SELECT id, status_code, content::text FROM net._http_response ORDER BY id DESC LIMIT 1;
```

لو `code_verification_status` = `VERIFIED` و `status` = `CONNECTED`: خلاص! اعمل test send + وقف الكرون + بلّغ محمد. اقفز للقسم (4).

لو status_code = 400 (Object does not exist / Missing permissions): ميتا لسه ما ثبتتش الصلاحيات — بلّغ محمد باختصار «لسه بشتغل عليها» وسيبها للجولة الجاية.

### 2) لو الحالة لسه PENDING → اطلب الكود من ميتا
```sql
DO $$ DECLARE tok text; BEGIN
  SELECT value INTO tok FROM whatsapp_config WHERE key='access_token';
  PERFORM net.http_post(
    url:='https://graph.facebook.com/v21.0/1281981441657183/request_code',
    headers:=jsonb_build_object('Authorization','Bearer '||tok,'Content-Type','application/json'),
    body:=jsonb_build_object('code_method','SMS','language','ar')
  );
END $$;
SELECT pg_sleep(5);
SELECT id, status_code, content::text FROM net._http_response ORDER BY id DESC LIMIT 1;
```

### 3) فسر النتيجة وبلّغ محمد بأقصر رسالة
- **status 200** (success): بلّغه «✅ كود التفعيل اتبعت SMS على 01002229982 — ابعتهولي هنا وأنا أكمل التفعيل والربط والتمبلتس فورًا». **مهم:** بعد النجاح احذف الكرون لأنه خلص شغله (استخدم `mcp__scheduled-tasks__delete_scheduled_task` مع `taskId: "retry-wa-verification-30min"`).
- **status 400 + error 136024** (كولداون لسه): متبلغش محمد — بس اسجّل كوقت آخر محاولة وسيبها للجولة الجاية.
- **أي error تاني** (مش 136024): بلّغه بالخطأ الفعلي المختصر عشان يقدر يشوفه من البيزنس مانجر.

### 4) لو الحالة اتفعّلت بالفعل (VERIFIED) قبل ما نطلب كود
سجّل التوكن (SUBSCRIBE) للـwebhook:
```sql
DO $$ DECLARE tok text; BEGIN
  SELECT value INTO tok FROM whatsapp_config WHERE key='access_token';
  PERFORM net.http_post(
    url:='https://graph.facebook.com/v21.0/1026388446418481/subscribed_apps',
    headers:=jsonb_build_object('Authorization','Bearer '||tok,'Content-Type','application/json'),
    body:='{}'::jsonb
  );
END $$;
SELECT pg_sleep(4);
SELECT id, status_code, content::text FROM net._http_response ORDER BY id DESC LIMIT 1;
```
بعدها بلّغ محمد: «✅ رجع شغال! ابعتلي رسالة تجريبية من موبايلك على المارد للتأكد من الاستقبال، وأنا هعيد تقديم التمبلتس وأبعت رسايل التأكيد للمطاعم الجداد». احذف الكرون.

## قواعد الرسالة لمحمد
- بالعربي المصري ومختصر جدًا (سطرين max)
- كل جولة تبعت **رسالة واحدة بس** (استخدم mcp__cowork__send_user_message)
- لو الحالة لسه كولداون (136024) → **متبعتش رسالة خالص** (عشان مانضايقوش كل نص ساعة)