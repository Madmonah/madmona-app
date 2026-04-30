-- ==========================================================================
-- Madmona — Fix booking conflict check
-- 
-- Issue: pending_payment bookings were blocking time slots, causing
-- "conflict" errors on retry attempts even after a failed booking.
-- 
-- Fix: only confirmed/active bookings block. pending_payment is just
-- a request — first to pay wins. Others get auto-cancelled when supplier
-- confirms one (or after timeout).
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.check_booking_conflict()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only confirmed/active bookings block the time slot.
  -- pending_payment is just a request, not a hold.
  IF NEW.status IN ('confirmed', 'active') THEN
    IF EXISTS (
      SELECT 1 FROM marketplace_bookings
      WHERE listing_id = NEW.listing_id
        AND id != NEW.id
        AND status IN ('confirmed', 'active')
        AND tstzrange(start_at, end_at, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)')
    ) THEN
      RAISE EXCEPTION 'Booking conflict: this time slot is already booked'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Clean up any test/abandoned pending_payment bookings older than 5 minutes
-- so they don't hang around forever
DELETE FROM marketplace_bookings
WHERE status = 'pending_payment'
  AND created_at < NOW() - INTERVAL '5 minutes';

SELECT 'Conflict check updated. Pending payments cleaned.' AS status;
