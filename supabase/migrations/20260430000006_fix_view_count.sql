-- ==========================================================================
-- Madmona — Fix increment_view_count to use the correct column name
-- The listings table has `views_count` (not `view_count`).
-- Idempotent — safe to run multiple times.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.increment_view_count(listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE listings
  SET views_count = views_count + 1
  WHERE id = listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO anon, authenticated;

SELECT 'increment_view_count fixed' AS status;
