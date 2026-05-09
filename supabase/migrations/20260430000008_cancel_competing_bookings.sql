-- ==========================================================================
-- Madmona — Auto-cancel competing pending bookings on confirm
-- 
-- When supplier confirms a booking, any other pending_payment bookings for
-- the same listing+overlapping time window are automatically cancelled.
-- This gives competing customers immediate feedback that their request is
-- no longer viable, instead of leaving them in limbo.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.cancel_competing_pending_bookings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only fire when status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status <> 'confirmed') THEN
    UPDATE marketplace_bookings
    SET status = 'cancelled',
        cancellation_reason = 'تم تأكيد حجز آخر لنفس الوقت',
        cancelled_by = NEW.supplier_id,
        cancelled_at = NOW()
    WHERE listing_id = NEW.listing_id
      AND id <> NEW.id
      AND status = 'pending_payment'
      AND tstzrange(start_at, end_at, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_competing_bookings ON marketplace_bookings;
CREATE TRIGGER trg_cancel_competing_bookings
  AFTER UPDATE OF status ON marketplace_bookings
  FOR EACH ROW EXECUTE FUNCTION cancel_competing_pending_bookings();

SELECT 'Auto-cancel competing bookings trigger installed' AS status;
