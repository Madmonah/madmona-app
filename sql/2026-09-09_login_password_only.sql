-- 🔑 (٩/٩/٢٠٢٦) محمد: «هنشيل تاب الـPIN نهائي، وهيبقى كله باسورد»
--   + «خلي الرقم 1551 يكون فقط مسؤول عن تسجيل الدخول». مطبّق لايف ٩/٩/٢٠٢٦.
--
-- ١) القياس قبل التعديل: ٧١ من ٧٤ موظف نشط (كل الموردين) كانوا PIN بس.
--    عشان محدش يتقفل: الـPIN الحالي بقى هو باسورده (bcrypt) — مفيش سر جديد.
update business_employees
   set password_hash = crypt(pin_code, gen_salt('bf'))
 where status='active' and pin_code is not null
   and (password_hash is null or password_hash not like '$2%');
-- ٢) login_with_password: فرع الـPIN اتشال — bcrypt بس (التعريف الكامل في الداتابيز؛
--    الخطأ بقى «الباسورد غلط»). employee_login_phone_pin (بصمة الجهاز) زي ما هي.
-- ٣) الدخول بالواتساب من 1551 فقط، والمارد مسكّت عليه:
update whatsapp_config set value='201114621551' where key='auth_wa_order';
update wa_number_configs set enabled=false where session_id in ('201114621551','madmona-1551');
