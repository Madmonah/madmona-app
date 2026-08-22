-- =====================================================================
-- 🔔 (٢٢ أغسطس ٢٠٢٦) ربط شاشات المهام ببعض — ريل-تايم
-- =====================================================================
-- محمد: «عايز الشات يسمع في تاب تاسكات وتاب تاسكات يسمع في الشات».
--
-- الوضع قبل كده: نفس المهام بتتعرض في شاشتين بيقروا من مصدرين مختلفين
--     · تاب Task في الشات  (/chat/tasks)   → /api/team/tasks
--     · «مهامي» في «شغلي»   (/account/work) → get_my_work_home()
-- فلما مهمة تتقفل في واحدة، التانية مكانتش تعرف غير لما تتفتح من جديد.
--
-- الإصلاح هنا (الداتابيز): بنضيف الجدولين لـpublication الريل-تايم عشان
-- أي تغيير في صف يتبعت لكل الشاشات المفتوحة — حتى على موبايل تاني.
--
-- ⚠️ REPLICA IDENTITY FULL مهمة: من غيرها حدث الـUPDATE بيوصل من غير قيم
--    الأعمدة، فالواجهة مش هتعرف الصف بتاع مين.
--
-- 🔒 الأمان: الـRLS شغّالة على الجدولين، والريل-تايم بيحترمها — كل مستخدم
--    بيسمع صفوفه هو بس.
--
-- الجزء التاني (الواجهة) في: src/lib/useTasksLive.ts — وبيسمع من تلات
-- مصادر عشان لو واحد وقع التاني يغطّيه:
--     ١) ريل-تايم Supabase (بين الأجهزة)
--     ٢) BroadcastChannel  (بين تابات نفس المتصفح)
--     ٣) الرجوع للشاشة     (شبكة أمان أخيرة)
-- =====================================================================

ALTER TABLE public.daily_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.flow_tasks  REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.flow_tasks;

-- للتأكيد:
--   select tablename from pg_publication_tables where pubname='supabase_realtime';
