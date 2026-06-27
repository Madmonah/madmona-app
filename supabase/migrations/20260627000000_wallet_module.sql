-- ==========================================================================
-- Madmona — Wallet Module (المحفظة الإلكترونية)
-- Hybrid balance: cash (فلوس حقيقية، قابلة للسحب) + credit (كريدت داخلي/نقاط)
-- Idempotent. Run after the core schema (profiles, is_admin(), set_updated_at()).
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 0. ENUMS
-- --------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE wallet_status AS ENUM ('active', 'frozen', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wallet_balance_kind AS ENUM ('cash', 'credit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wallet_txn_type AS ENUM (
    'topup',             -- شحن المحفظة
    'payment',           -- دفع من المحفظة
    'transfer_in',       -- تحويل وارد
    'transfer_out',      -- تحويل صادر
    'withdrawal',        -- طلب سحب (حجز المبلغ)
    'withdrawal_refund', -- استرجاع سحب مرفوض
    'refund',            -- استرجاع دفعة
    'credit_grant',      -- منح كريدت داخلي / مكافأة
    'adjustment'         -- تعديل أدمن (يدوي)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wallet_txn_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wallet_withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wallet_topup_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------------------
-- 1. WALLETS — one per profile
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance_cash    DECIMAL(14, 2) NOT NULL DEFAULT 0 CHECK (balance_cash   >= 0),
  balance_credit  DECIMAL(14, 2) NOT NULL DEFAULT 0 CHECK (balance_credit >= 0),
  currency        TEXT NOT NULL DEFAULT 'EGP',
  status          wallet_status NOT NULL DEFAULT 'active',
  pin_hash        TEXT,                       -- optional spending PIN (future)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_profile ON wallets(profile_id);

-- --------------------------------------------------------------------------
-- 2. WALLET_TRANSACTIONS — immutable ledger
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id           UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                wallet_txn_type   NOT NULL,
  kind                wallet_balance_kind NOT NULL,           -- cash | credit
  direction           TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  amount              DECIMAL(14, 2) NOT NULL CHECK (amount > 0),
  currency            TEXT NOT NULL DEFAULT 'EGP',
  status              wallet_txn_status NOT NULL DEFAULT 'completed',
  balance_cash_after  DECIMAL(14, 2),
  balance_credit_after DECIMAL(14, 2),
  -- linkage to whatever caused the txn (booking, order, withdrawal, transfer...)
  reference_type      TEXT,
  reference_id        TEXT,
  counterparty_id     UUID REFERENCES profiles(id),           -- for transfers
  description         TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by          UUID REFERENCES profiles(id),           -- admin/system actor
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wtxn_wallet    ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wtxn_profile   ON wallet_transactions(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wtxn_type      ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wtxn_reference ON wallet_transactions(reference_type, reference_id);

-- --------------------------------------------------------------------------
-- 3. WALLET_TOPUPS — top-up records (gateway-ready)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id          UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  profile_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount             DECIMAL(14, 2) NOT NULL CHECK (amount > 0),
  kind               wallet_balance_kind NOT NULL DEFAULT 'cash',
  currency           TEXT NOT NULL DEFAULT 'EGP',
  status             wallet_topup_status NOT NULL DEFAULT 'pending',
  provider           TEXT,                       -- 'manual', 'paymob', 'stripe', 'fawry'...
  provider_reference TEXT,
  transaction_id     UUID REFERENCES wallet_transactions(id),
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wtopup_wallet ON wallet_topups(wallet_id, created_at DESC);

-- --------------------------------------------------------------------------
-- 4. WALLET_WITHDRAWALS — payout requests (cash only)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallet_withdrawals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount          DECIMAL(14, 2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'EGP',
  method          TEXT NOT NULL,                 -- 'bank_transfer','instapay','vodafone_cash'...
  details         TEXT NOT NULL,                 -- IBAN / handle / number
  status          wallet_withdrawal_status NOT NULL DEFAULT 'pending',
  hold_txn_id     UUID REFERENCES wallet_transactions(id),  -- the debit that held funds
  admin_notes     TEXT,
  processed_by    UUID REFERENCES profiles(id),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wwd_wallet ON wallet_withdrawals(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wwd_status ON wallet_withdrawals(status);

-- --------------------------------------------------------------------------
-- 5. updated_at trigger on wallets
-- --------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_wallets_updated_at ON wallets;
CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================================================
-- 6. RPCs (SECURITY DEFINER, atomic with row-level locking)
-- ==========================================================================

-- 6.1 ensure a wallet exists for a profile, return it (locked optional)
CREATE OR REPLACE FUNCTION public.wallet_ensure(p_profile UUID)
RETURNS public.wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.wallets;
BEGIN
  IF p_profile IS NULL THEN
    RAISE EXCEPTION 'profile_required';
  END IF;
  INSERT INTO wallets (profile_id)
  VALUES (p_profile)
  ON CONFLICT (profile_id) DO NOTHING;
  SELECT * INTO w FROM wallets WHERE profile_id = p_profile;
  RETURN w;
END $$;

-- 6.2 TOP-UP (cash or credit)
CREATE OR REPLACE FUNCTION public.wallet_topup(
  p_profile     UUID,
  p_amount      DECIMAL,
  p_kind        TEXT DEFAULT 'cash',
  p_provider    TEXT DEFAULT 'manual',
  p_reference   TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_actor       UUID DEFAULT NULL
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w   public.wallets;
  txn public.wallet_transactions;
  k   wallet_balance_kind := p_kind::wallet_balance_kind;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  PERFORM wallet_ensure(p_profile);
  SELECT * INTO w FROM wallets WHERE profile_id = p_profile FOR UPDATE;
  IF w.status <> 'active' THEN RAISE EXCEPTION 'wallet_not_active'; END IF;

  IF k = 'cash' THEN
    UPDATE wallets SET balance_cash = balance_cash + p_amount WHERE id = w.id
      RETURNING * INTO w;
  ELSE
    UPDATE wallets SET balance_credit = balance_credit + p_amount WHERE id = w.id
      RETURNING * INTO w;
  END IF;

  INSERT INTO wallet_transactions(
    wallet_id, profile_id, type, kind, direction, amount,
    balance_cash_after, balance_credit_after,
    reference_type, reference_id, description, created_by, metadata)
  VALUES (
    w.id, p_profile,
    CASE WHEN k = 'credit' THEN 'credit_grant'::wallet_txn_type ELSE 'topup'::wallet_txn_type END,
    k, 'in', p_amount,
    w.balance_cash, w.balance_credit,
    'topup', p_reference, COALESCE(p_description, 'شحن المحفظة'), p_actor,
    jsonb_build_object('provider', p_provider))
  RETURNING * INTO txn;

  INSERT INTO wallet_topups(wallet_id, profile_id, amount, kind, status,
    provider, provider_reference, transaction_id, completed_at)
  VALUES (w.id, p_profile, p_amount, k, 'completed',
    p_provider, p_reference, txn.id, NOW());

  RETURN txn;
END $$;

-- 6.3 PAY from wallet. p_source: 'cash' | 'credit' | 'auto' (credit first, then cash)
CREATE OR REPLACE FUNCTION public.wallet_pay(
  p_profile        UUID,
  p_amount         DECIMAL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id   TEXT DEFAULT NULL,
  p_description    TEXT DEFAULT NULL,
  p_source         TEXT DEFAULT 'auto'
)
RETURNS SETOF public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w           public.wallets;
  use_credit  DECIMAL := 0;
  use_cash    DECIMAL := 0;
  txn         public.wallet_transactions;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  PERFORM wallet_ensure(p_profile);
  SELECT * INTO w FROM wallets WHERE profile_id = p_profile FOR UPDATE;
  IF w.status <> 'active' THEN RAISE EXCEPTION 'wallet_not_active'; END IF;

  IF p_source = 'cash' THEN
    use_cash := p_amount;
  ELSIF p_source = 'credit' THEN
    use_credit := p_amount;
  ELSE -- auto: credit first, then cash
    use_credit := LEAST(w.balance_credit, p_amount);
    use_cash   := p_amount - use_credit;
  END IF;

  IF use_credit > w.balance_credit OR use_cash > w.balance_cash THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  UPDATE wallets
     SET balance_cash   = balance_cash   - use_cash,
         balance_credit = balance_credit - use_credit
   WHERE id = w.id
   RETURNING * INTO w;

  IF use_credit > 0 THEN
    INSERT INTO wallet_transactions(
      wallet_id, profile_id, type, kind, direction, amount,
      balance_cash_after, balance_credit_after,
      reference_type, reference_id, description)
    VALUES (w.id, p_profile, 'payment', 'credit', 'out', use_credit,
      w.balance_cash, w.balance_credit, p_reference_type, p_reference_id,
      COALESCE(p_description, 'دفع من المحفظة'))
    RETURNING * INTO txn;
    RETURN NEXT txn;
  END IF;

  IF use_cash > 0 THEN
    INSERT INTO wallet_transactions(
      wallet_id, profile_id, type, kind, direction, amount,
      balance_cash_after, balance_credit_after,
      reference_type, reference_id, description)
    VALUES (w.id, p_profile, 'payment', 'cash', 'out', use_cash,
      w.balance_cash, w.balance_credit, p_reference_type, p_reference_id,
      COALESCE(p_description, 'دفع من المحفظة'))
    RETURNING * INTO txn;
    RETURN NEXT txn;
  END IF;

  RETURN;
END $$;

-- 6.4 TRANSFER between two wallets (cash by default)
CREATE OR REPLACE FUNCTION public.wallet_transfer(
  p_from        UUID,
  p_to          UUID,
  p_amount      DECIMAL,
  p_kind        TEXT DEFAULT 'cash',
  p_description TEXT DEFAULT NULL
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wf  public.wallets;
  wt  public.wallets;
  k   wallet_balance_kind := p_kind::wallet_balance_kind;
  out_txn public.wallet_transactions;
  ref TEXT := 'tr_' || replace(gen_random_uuid()::text, '-', '');
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF p_from = p_to THEN RAISE EXCEPTION 'same_account'; END IF;

  PERFORM wallet_ensure(p_from);
  PERFORM wallet_ensure(p_to);

  -- lock in a stable order to avoid deadlocks
  IF p_from < p_to THEN
    SELECT * INTO wf FROM wallets WHERE profile_id = p_from FOR UPDATE;
    SELECT * INTO wt FROM wallets WHERE profile_id = p_to   FOR UPDATE;
  ELSE
    SELECT * INTO wt FROM wallets WHERE profile_id = p_to   FOR UPDATE;
    SELECT * INTO wf FROM wallets WHERE profile_id = p_from FOR UPDATE;
  END IF;

  IF wf.status <> 'active' OR wt.status <> 'active' THEN RAISE EXCEPTION 'wallet_not_active'; END IF;

  IF k = 'cash' THEN
    IF wf.balance_cash < p_amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;
    UPDATE wallets SET balance_cash = balance_cash - p_amount WHERE id = wf.id RETURNING * INTO wf;
    UPDATE wallets SET balance_cash = balance_cash + p_amount WHERE id = wt.id RETURNING * INTO wt;
  ELSE
    IF wf.balance_credit < p_amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;
    UPDATE wallets SET balance_credit = balance_credit - p_amount WHERE id = wf.id RETURNING * INTO wf;
    UPDATE wallets SET balance_credit = balance_credit + p_amount WHERE id = wt.id RETURNING * INTO wt;
  END IF;

  INSERT INTO wallet_transactions(
    wallet_id, profile_id, type, kind, direction, amount,
    balance_cash_after, balance_credit_after, reference_type, reference_id,
    counterparty_id, description)
  VALUES (wf.id, p_from, 'transfer_out', k, 'out', p_amount,
    wf.balance_cash, wf.balance_credit, 'transfer', ref, p_to,
    COALESCE(p_description, 'تحويل صادر'))
  RETURNING * INTO out_txn;

  INSERT INTO wallet_transactions(
    wallet_id, profile_id, type, kind, direction, amount,
    balance_cash_after, balance_credit_after, reference_type, reference_id,
    counterparty_id, description)
  VALUES (wt.id, p_to, 'transfer_in', k, 'in', p_amount,
    wt.balance_cash, wt.balance_credit, 'transfer', ref, p_from,
    COALESCE(p_description, 'تحويل وارد'));

  RETURN out_txn;
END $$;

-- 6.5 REQUEST WITHDRAWAL (cash only) — holds funds immediately
CREATE OR REPLACE FUNCTION public.wallet_request_withdrawal(
  p_profile UUID,
  p_amount  DECIMAL,
  p_method  TEXT,
  p_details TEXT
)
RETURNS public.wallet_withdrawals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w   public.wallets;
  txn public.wallet_transactions;
  wd  public.wallet_withdrawals;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF p_method IS NULL OR p_details IS NULL OR length(trim(p_details)) = 0 THEN
    RAISE EXCEPTION 'missing_payout_details';
  END IF;

  PERFORM wallet_ensure(p_profile);
  SELECT * INTO w FROM wallets WHERE profile_id = p_profile FOR UPDATE;
  IF w.status <> 'active' THEN RAISE EXCEPTION 'wallet_not_active'; END IF;
  IF w.balance_cash < p_amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

  UPDATE wallets SET balance_cash = balance_cash - p_amount WHERE id = w.id RETURNING * INTO w;

  INSERT INTO wallet_transactions(
    wallet_id, profile_id, type, kind, direction, amount,
    balance_cash_after, balance_credit_after, reference_type, description, status)
  VALUES (w.id, p_profile, 'withdrawal', 'cash', 'out', p_amount,
    w.balance_cash, w.balance_credit, 'withdrawal', 'طلب سحب رصيد', 'pending')
  RETURNING * INTO txn;

  INSERT INTO wallet_withdrawals(wallet_id, profile_id, amount, method, details, hold_txn_id)
  VALUES (w.id, p_profile, p_amount, p_method, p_details, txn.id)
  RETURNING * INTO wd;

  UPDATE wallet_transactions SET reference_id = wd.id::text WHERE id = txn.id;

  RETURN wd;
END $$;

-- 6.6 PROCESS WITHDRAWAL (admin): action = 'approve' | 'reject' | 'paid'
CREATE OR REPLACE FUNCTION public.wallet_process_withdrawal(
  p_withdrawal UUID,
  p_action     TEXT,
  p_admin      UUID DEFAULT NULL,
  p_notes      TEXT DEFAULT NULL
)
RETURNS public.wallet_withdrawals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wd  public.wallet_withdrawals;
  w   public.wallets;
BEGIN
  SELECT * INTO wd FROM wallet_withdrawals WHERE id = p_withdrawal FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'withdrawal_not_found'; END IF;

  IF p_action = 'approve' THEN
    IF wd.status <> 'pending' THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE wallet_withdrawals
       SET status='approved', admin_notes=p_notes, processed_by=p_admin, processed_at=NOW()
     WHERE id = wd.id RETURNING * INTO wd;

  ELSIF p_action = 'paid' THEN
    IF wd.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE wallet_withdrawals
       SET status='paid', admin_notes=COALESCE(p_notes, admin_notes), processed_by=p_admin, processed_at=NOW()
     WHERE id = wd.id RETURNING * INTO wd;
    UPDATE wallet_transactions SET status='completed' WHERE id = wd.hold_txn_id;

  ELSIF p_action = 'reject' THEN
    IF wd.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    -- refund the held cash
    SELECT * INTO w FROM wallets WHERE id = wd.wallet_id FOR UPDATE;
    UPDATE wallets SET balance_cash = balance_cash + wd.amount WHERE id = w.id RETURNING * INTO w;
    UPDATE wallet_transactions SET status='reversed' WHERE id = wd.hold_txn_id;
    INSERT INTO wallet_transactions(
      wallet_id, profile_id, type, kind, direction, amount,
      balance_cash_after, balance_credit_after, reference_type, reference_id,
      description, created_by, status)
    VALUES (w.id, wd.profile_id, 'withdrawal_refund', 'cash', 'in', wd.amount,
      w.balance_cash, w.balance_credit, 'withdrawal', wd.id::text,
      'استرجاع طلب سحب مرفوض', p_admin, 'completed');
    UPDATE wallet_withdrawals
       SET status='rejected', admin_notes=p_notes, processed_by=p_admin, processed_at=NOW()
     WHERE id = wd.id RETURNING * INTO wd;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;

  RETURN wd;
END $$;

-- 6.7 ADMIN ADJUST — manual credit/debit (cash or credit)
CREATE OR REPLACE FUNCTION public.wallet_admin_adjust(
  p_profile   UUID,
  p_amount    DECIMAL,
  p_kind      TEXT,
  p_direction TEXT,           -- 'in' | 'out'
  p_reason    TEXT,
  p_admin     UUID DEFAULT NULL
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w   public.wallets;
  txn public.wallet_transactions;
  k   wallet_balance_kind := p_kind::wallet_balance_kind;
  sign DECIMAL := CASE WHEN p_direction = 'in' THEN 1 ELSE -1 END;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF p_direction NOT IN ('in','out') THEN RAISE EXCEPTION 'invalid_direction'; END IF;

  PERFORM wallet_ensure(p_profile);
  SELECT * INTO w FROM wallets WHERE profile_id = p_profile FOR UPDATE;

  IF k = 'cash' THEN
    IF w.balance_cash + sign * p_amount < 0 THEN RAISE EXCEPTION 'insufficient_funds'; END IF;
    UPDATE wallets SET balance_cash = balance_cash + sign * p_amount WHERE id = w.id RETURNING * INTO w;
  ELSE
    IF w.balance_credit + sign * p_amount < 0 THEN RAISE EXCEPTION 'insufficient_funds'; END IF;
    UPDATE wallets SET balance_credit = balance_credit + sign * p_amount WHERE id = w.id RETURNING * INTO w;
  END IF;

  INSERT INTO wallet_transactions(
    wallet_id, profile_id, type, kind, direction, amount,
    balance_cash_after, balance_credit_after, reference_type,
    description, created_by)
  VALUES (w.id, p_profile, 'adjustment', k, p_direction, p_amount,
    w.balance_cash, w.balance_credit, 'admin_adjustment',
    COALESCE(p_reason, 'تعديل يدوي'), p_admin)
  RETURNING * INTO txn;

  RETURN txn;
END $$;

-- ==========================================================================
-- 7. ROW LEVEL SECURITY
-- ==========================================================================
ALTER TABLE wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_topups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_withdrawals  ENABLE ROW LEVEL SECURITY;

-- wallets
DROP POLICY IF EXISTS "wallets_owner_read" ON wallets;
CREATE POLICY "wallets_owner_read" ON wallets FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "wallets_admin_all" ON wallets;
CREATE POLICY "wallets_admin_all" ON wallets FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- transactions
DROP POLICY IF EXISTS "wtxn_owner_read" ON wallet_transactions;
CREATE POLICY "wtxn_owner_read" ON wallet_transactions FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "wtxn_admin_all" ON wallet_transactions;
CREATE POLICY "wtxn_admin_all" ON wallet_transactions FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- topups
DROP POLICY IF EXISTS "wtopup_owner_read" ON wallet_topups;
CREATE POLICY "wtopup_owner_read" ON wallet_topups FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "wtopup_admin_all" ON wallet_topups;
CREATE POLICY "wtopup_admin_all" ON wallet_topups FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- withdrawals
DROP POLICY IF EXISTS "wwd_owner_read" ON wallet_withdrawals;
CREATE POLICY "wwd_owner_read" ON wallet_withdrawals FOR SELECT
  USING (profile_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "wwd_admin_all" ON wallet_withdrawals;
CREATE POLICY "wwd_admin_all" ON wallet_withdrawals FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- ==========================================================================
-- 8. GRANTS — allow authenticated users to call user-facing RPCs.
--     (SECURITY DEFINER funcs still enforce their own balance checks.)
-- ==========================================================================
GRANT EXECUTE ON FUNCTION public.wallet_ensure(UUID)                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_request_withdrawal(UUID, DECIMAL, TEXT, TEXT)  TO authenticated;
-- topup / pay / transfer / admin funcs are invoked server-side via service role only.

-- ==========================================================================
-- DONE.
-- ==========================================================================
