-- ============================================================================
-- ٢١ أغسطس ٢٠٢٦ — فريق مضمونة في كل جروب على المارد
-- ============================================================================
-- محمد: «أنا شايف في جروبين لمضمونة وشايف جروبات تانية للعقارات مفيهاش حد من
--        الفريق بتاعنا. أنا عايز الفريق بتاعنا يكون موجود في أي جروب موجود
--        على أي مارد».
--
-- الحالة قبل الشغل ده (متعدودة من الداتابيز، مش تقدير):
--   ١١٠ جروب (١٠٩ `company` + ١ `group`) — و**١٠٠ منهم مفيهمش ولا حد من الفريق**.
--   يعني البيزنس يكتب في جروبه ومحدش عندنا يشوف.
--   جروب واحد بس كان فيه الفريق كامل: «جروب شركة مضمونة».
--
-- السبب: `sync_company_group` كانت بتحط **موظفين البيزنس نفسه بس**
--        (المالك + business_employees + supplier_staff) — ومفيش أي حتة
--        بتحط فريق مضمونة. وكمان مفيش تريجر، فأي جروب جديد كان بيطلع
--        من غيرنا.
--
-- اللي اتعمل:
--   1) madmona_team()               — مين الفريق (مصدر واحد للحقيقة)
--   2) madmona_team_join_room()     — يحط الفريق في جروب واحد (idempotent)
--   3) trg_room_add_madmona_team    — أي جروب جديد → الفريق يدخل تلقائي
--   4) madmona_team_join_all_rooms()— حصر لللي اتعمل قبل التريجر
--   5) sync_company_group           — بقت بتنادي (2) كمان
--   6) chat_rooms_for_me            — الترتيب: اللي فيه كلام الأول
--
-- النتيجة بعد التشغيل: ١١٠ / ١١٠ جروب فيهم الفريق كامل (٥ أفراد).
--   عدد صفوف chat_room_members: ١٩٠ → ٧٢٤ (+٥٣٤).
--   المحادثات الفردية (`direct`) **ماتلمستش**: ٣٠ صف زي ما هي.
--   باك أب: `_backup_chat_members_20260821`
--
-- ⚠️ ملاحظات مهمة:
--   • الجروبات بس — الـ`direct` عمرها ما تتلمس. دي مكالمة بين اتنين، ولو
--     حطينا حد تالت فيها هتبقى مش خاصة، وكمان `chat_rooms_for_me` بيجيب
--     «الطرف التاني» بـ`limit 1` فهيبوظ.
--   • الفريق بيدخل بدور `member` مش `owner` — صاحب البيزنس يفضل هو المالك.
--   • بوليسي `chat_members_delete` بتسمح لمالك الجروب إنه يشيل أعضاء —
--     يعني صاحب بيزنس يقدر يشيلنا من جروبه. سايبينها كده عن قصد؛ مابنرجّعش
--     نفسنا بالعافية. لو اتشالوا، `madmona_team_join_all_rooms()` بترجّعهم.
--   • ٣ موظفين في مضمونة **مالهمش حسابات** فماينفعش يتحطوا في أي جروب:
--     إيمان محمد أحمد · محمد عبدالجابر · مديحة عبدالفتاح.
--     (chat_room_members.profile_id عليه FK على profiles.)
-- ============================================================================

-- 1) الفريق --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.madmona_team()
 RETURNS TABLE(profile_id uuid)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT DISTINCT p.id
    FROM profiles p
   WHERE p.role = 'admin'
      OR EXISTS (
        SELECT 1 FROM business_employees e
          JOIN suppliers s ON s.id = e.supplier_id
         WHERE e.auth_user_id = p.id
           AND e.employee_type = 'human'
           AND e.status = 'active'
           AND coalesce(s.is_platform_owner, false)
      );
$function$;

-- 2) يحط الفريق في جروب واحد ---------------------------------------------
CREATE OR REPLACE FUNCTION public.madmona_team_join_room(p_room_id uuid)
 RETURNS integer
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_added int := 0; v_kind text;
BEGIN
  SELECT kind INTO v_kind FROM chat_rooms WHERE id = p_room_id;
  IF v_kind IS NULL OR v_kind = 'direct' THEN RETURN 0; END IF;

  WITH ins AS (
    INSERT INTO chat_room_members (room_id, profile_id, role)
    SELECT p_room_id, t.profile_id, 'member' FROM madmona_team() t
     WHERE NOT EXISTS (SELECT 1 FROM chat_room_members m
                        WHERE m.room_id = p_room_id AND m.profile_id = t.profile_id)
    ON CONFLICT (room_id, profile_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_added FROM ins;
  RETURN v_added;
END $function$;

-- 3) أي جروب جديد → الفريق يدخل تلقائي ------------------------------------
CREATE OR REPLACE FUNCTION public.tg_room_add_madmona_team()
 RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.kind IS DISTINCT FROM 'direct' THEN
    PERFORM public.madmona_team_join_room(NEW.id);
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_room_add_madmona_team ON public.chat_rooms;
CREATE TRIGGER trg_room_add_madmona_team
AFTER INSERT ON public.chat_rooms
FOR EACH ROW EXECUTE FUNCTION public.tg_room_add_madmona_team();

-- 4) حصر لكل الجروبات الموجودة -------------------------------------------
CREATE OR REPLACE FUNCTION public.madmona_team_join_all_rooms()
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_rooms int := 0; v_added int := 0; v_one int; r record;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  FOR r IN SELECT id FROM chat_rooms WHERE kind IS DISTINCT FROM 'direct' LOOP
    v_one := public.madmona_team_join_room(r.id);
    IF v_one > 0 THEN v_rooms := v_rooms + 1; v_added := v_added + v_one; END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'rooms_touched', v_rooms, 'members_added', v_added);
END $function$;

-- شغّالة يوم ٢١ أغسطس ٢٠٢٦ بحساب محمد:
--   {"ok": true, "rooms_touched": 109, "members_added": 534}
-- SELECT public.madmona_team_join_all_rooms();

-- 5) sync_company_group بقت بتحط الفريق كمان — النسخة الكاملة في الداتابيز.
--    السطر الجديد جوّاها، بعد إدخال موظفين البيزنس:
--      v_team := public.madmona_team_join_room(v_room);

-- 6) الترتيب: اللي فيه كلام الأول -----------------------------------------
--    بعد ما كل موظف بقى عنده ١٠٨ جروب فاضي، الترتيب القديم كان بيرجع لـ
--    `r.created_at` للجروب الفاضي — والجروبات دي كلها اتعملت النهاردة،
--    يعني كانت هتقعد فوق خالص وتدفن كل المحادثات الحقيقية تحتها.
--    الترتيب الجديد في النسختين:
--      ORDER BY (me.pinned_at IS NULL), (lm.created_at IS NULL),
--               coalesce(lm.created_at, r.created_at) DESC
