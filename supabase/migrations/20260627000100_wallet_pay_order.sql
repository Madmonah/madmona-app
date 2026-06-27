-- ==========================================================================
-- Madmona — Wallet ↔ Orders integration
-- wallet_pay_order: دفع أوردر من المحفظة بشكل ذرّي (atomic).
-- Depends on: 20260627000000_wallet_module.sql (wallet_pay, wallets...)
--             + marketplace_orders / create_order (existing).
-- Idempotent.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.wallet_pay_order(
  p_profile  UUID,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o        marketplace_orders%ROWTYPE;
  v_txn    public.wallet_transactions;
  v_first  UUID;
BEGIN
  IF p_profile IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  -- اقفل صف الأوردر لمنع أي دفع متزامن مكرر
  SELECT * INTO o FROM marketplace_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF o.customer_id IS DISTINCT FROM p_profile THEN RAISE EXCEPTION 'not_your_order'; END IF;
  IF o.status <> 'pending_payment' THEN RAISE EXCEPTION 'order_not_payable'; END IF;
  IF o.total_amount IS NULL OR o.total_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  -- اخصم من المحفظة (كريدت الأول ثم كاش). لو الرصيد مش كافٍ wallet_pay بترفع
  -- 'insufficient_funds' فالمعاملة كلها بتترجع (الأوردر يفضل pending_payment).
  FOR v_txn IN
    SELECT * FROM wallet_pay(
      p_profile,
      o.total_amount,
      'order',
      p_order_id::text,
      'دفع أوردر ' || COALESCE(o.reference_code, ''),
      'auto'
    )
  LOOP
    IF v_first IS NULL THEN v_first := v_txn.id; END IF;
  END LOOP;

  -- علّم الأوردر مدفوع
  UPDATE marketplace_orders
     SET status            = 'paid',
         paid_at           = NOW(),
         payment_method    = 'wallet',
         payment_reference = COALESCE(v_first::text, payment_reference)
   WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'order_id', p_order_id,
    'reference_code', o.reference_code,
    'status', 'paid',
    'amount', o.total_amount
  );
END $$;

-- يُستدعى من السيرفر بمفتاح الخدمة فقط (مش متاح للـ authenticated مباشرة).
REVOKE ALL ON FUNCTION public.wallet_pay_order(UUID, UUID) FROM PUBLIC;
