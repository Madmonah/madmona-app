-- ============================================================================
-- Directory-tier listings + admin filter console
-- Mirrors DB changes applied to prod in the OSM-directory session (2026-06-15).
-- Runbook ref: directory_tier_console_and_blank_list_bug
-- ============================================================================

-- 1) Directory tier columns ---------------------------------------------------
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_directory boolean NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS directory_source text;

-- 2) Publish gate: exempt directory-tier listings ----------------------------
--    (directory entries are unverified + badged "غير موثّق"; no photo / phone OTP)
CREATE OR REPLACE FUNCTION public.enforce_listing_publish_requirements()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public','extensions','pg_catalog'
AS $function$
BEGIN
  IF NEW.status = 'published' THEN
    IF NEW.is_directory THEN
      RETURN NEW;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM listing_photos WHERE listing_id = NEW.id) THEN
      RAISE EXCEPTION 'Cannot publish: at least one photo is required (listing=%)', NEW.id
        USING HINT = 'Add at least one photo before publishing';
    END IF;

    IF NEW.supplier_id NOT IN (
      SELECT id FROM suppliers WHERE id IN (
        '147cd904-c8d7-4234-86d4-388b5e1f5694'::uuid,
        '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'::uuid,
        'c8b7b9d7-0000-0000-0000-000000000000'::uuid,
        '69ccb608-151d-46e0-9bc4-9b023cab529e'::uuid
      )
    ) THEN
      IF NEW.phone_verified_at IS NULL OR NEW.contact_phone IS NULL THEN
        RAISE EXCEPTION 'Cannot publish: phone number must be verified via WhatsApp first (listing=%)', NEW.id
          USING HINT = 'Verify the contact phone number via WhatsApp OTP before publishing';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Indexes (directory grows large) -----------------------------------------
CREATE INDEX IF NOT EXISTS idx_listings_status       ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_is_directory ON public.listings(is_directory);
CREATE INDEX IF NOT EXISTS idx_listings_category     ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_supplier     ON public.listings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_listings_city         ON public.listings(city);

-- 4) Admin filter console RPCs (all gated on is_admin()) ----------------------
CREATE OR REPLACE FUNCTION public.admin_listings_search(
  p_tier text DEFAULT 'all', p_status text DEFAULT 'all',
  p_category uuid DEFAULT NULL, p_city text DEFAULT NULL,
  p_has_phone text DEFAULT 'all', p_claimed text DEFAULT 'all',
  p_search text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_catalog' AS $$
DECLARE v_trustee uuid := '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'; v_out jsonb;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
  p_limit := least(greatest(coalesce(p_limit,50),1),200);
  p_offset := greatest(coalesce(p_offset,0),0);
  WITH base AS (
    SELECT l.id,l.title,l.slug,l.status,l.is_directory,l.directory_source,
           l.category_id,c.name_ar AS category_name,l.city,l.district,
           l.contact_phone,(l.phone_verified_at IS NOT NULL) AS phone_verified,
           (l.supplier_id=v_trustee) AS unclaimed,l.created_at,l.published_at
    FROM listings l LEFT JOIN categories c ON c.id=l.category_id
    WHERE (p_tier='all' OR (p_tier='directory' AND l.is_directory) OR (p_tier='real' AND NOT l.is_directory))
      AND (p_status='all' OR l.status::text=p_status)
      AND (p_category IS NULL OR l.category_id=p_category)
      AND (p_city IS NULL OR p_city='' OR l.city=p_city)
      AND (p_has_phone='all' OR (p_has_phone='yes' AND l.contact_phone IS NOT NULL) OR (p_has_phone='no' AND l.contact_phone IS NULL))
      AND (p_claimed='all' OR (p_claimed='unclaimed' AND l.supplier_id=v_trustee) OR (p_claimed='claimed' AND l.supplier_id<>v_trustee))
      AND (p_search IS NULL OR p_search='' OR l.title ILIKE '%'||p_search||'%' OR l.contact_phone ILIKE '%'||p_search||'%' OR l.city ILIKE '%'||p_search||'%')
  ), page AS (
    SELECT *, count(*) OVER() AS total FROM base
    ORDER BY created_at DESC NULLS LAST LIMIT p_limit OFFSET p_offset )
  SELECT jsonb_build_object(
    'total', coalesce((SELECT max(total) FROM page),0),
    'limit', p_limit, 'offset', p_offset,
    'rows', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id',id,'title',title,'slug',slug,'status',status::text,
        'is_directory',is_directory,'directory_source',directory_source,
        'category_id',category_id,'category',category_name,'city',city,'district',district,
        'phone',contact_phone,'phone_verified',phone_verified,'unclaimed',unclaimed,
        'created_at',created_at,'published_at',published_at) ) FROM page),'[]'::jsonb)
  ) INTO v_out;
  RETURN v_out;
END$$;

CREATE OR REPLACE FUNCTION public.admin_listings_facets()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_catalog' AS $$
DECLARE v_out jsonb;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT jsonb_build_object(
    'total',(SELECT count(*) FROM listings),
    'by_tier',jsonb_build_object(
       'real',(SELECT count(*) FROM listings WHERE NOT is_directory),
       'directory',(SELECT count(*) FROM listings WHERE is_directory)),
    'by_status',(SELECT coalesce(jsonb_object_agg(s,n),'{}'::jsonb) FROM (SELECT status::text s,count(*) n FROM listings GROUP BY 1) q),
    'cities',(SELECT coalesce(jsonb_agg(city ORDER BY city),'[]'::jsonb) FROM (SELECT DISTINCT city FROM listings WHERE city IS NOT NULL AND city<>'') c),
    'categories',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name_ar) ORDER BY name_ar),'[]'::jsonb)
                  FROM (SELECT DISTINCT c.id,c.name_ar FROM categories c JOIN listings l ON l.category_id=c.id) x)
  ) INTO v_out; RETURN v_out;
END$$;

CREATE OR REPLACE FUNCTION public.admin_bulk_set_status(p_ids uuid[], p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','pg_catalog' AS $$
DECLARE v_id uuid; v_updated int:=0; v_failed jsonb:='[]'::jsonb;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'admin only'; END IF;
  IF p_status NOT IN ('draft','pending_review','published','paused','rejected') THEN
    RAISE EXCEPTION 'invalid status %',p_status; END IF;
  IF p_ids IS NULL OR array_length(p_ids,1) IS NULL THEN
    RETURN jsonb_build_object('updated',0,'failed','[]'::jsonb); END IF;
  FOREACH v_id IN ARRAY p_ids LOOP
    BEGIN
      UPDATE listings SET status=p_status::listing_status,
        published_at=CASE WHEN p_status='published' THEN coalesce(published_at,now()) ELSE published_at END,
        updated_at=now()
      WHERE id=v_id;
      IF FOUND THEN v_updated:=v_updated+1; END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed:=v_failed||jsonb_build_object('id',v_id,'error',SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('updated',v_updated,'failed',v_failed);
END$$;

REVOKE ALL ON FUNCTION public.admin_listings_search(text,text,uuid,text,text,text,text,int,int) FROM public;
REVOKE ALL ON FUNCTION public.admin_listings_facets() FROM public;
REVOKE ALL ON FUNCTION public.admin_bulk_set_status(uuid[],text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_listings_search(text,text,uuid,text,text,text,text,int,int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_listings_facets() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_bulk_set_status(uuid[],text) TO authenticated, service_role;
