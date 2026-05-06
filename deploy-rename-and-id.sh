#!/bin/bash
# Madmona  -  Deploy: rename + ID verification system
set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-rename-and-id.txt"
echo "Madmona Deploy: rename + ID verification - $(date)" > "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  Rename + ID Verification System"
echo "=========================================================="
echo ""
echo "  This deploy includes:"
echo ""
echo "  STREAM 1 - RENAME REFACTOR (customer-facing pages):"
echo "    - TopNav, LaunchBanner, WelcomeSupplierBanner"
echo "    - Account, About, Launch pages"
echo "    - Supplier login/signup"
echo "    - Marketplace listing detail + booking"
echo ""
echo "  STREAM 2 - ID VERIFICATION SYSTEM:"
echo "    - ListingForm: 'requires ID' checkbox"
echo "    - auth/signup: optional national_id field"
echo "    - Marketplace cards: verified + ID badges"
echo "    - Listing detail: verified + ID badges"
echo "    - Booking page: ID input + pending approval flow"
echo ""
echo "  =========================================================="
echo "  CRITICAL: BEFORE DEPLOYING - RUN SQL MIGRATION!"
echo "  =========================================================="
echo ""
echo "  Open Supabase SQL Editor and run:"
echo "    migrations/2026-05-id-verification.sql"
echo ""
echo "  If you skip this, marketplace browse + booking pages"
echo "  will crash because they query new columns."
echo ""
read -p "Did you run the SQL migration? (yes/no): " RUN_SQL

if [ "$RUN_SQL" != "yes" ]; then
  echo ""
  echo "  >> Stopping. Run the SQL first, then re-run this script."
  echo ""
  read -p "Press Enter to close..."
  exit 1
fi

echo ""
echo "  OK, proceeding with deploy..."
echo ""
read -p "Press Enter to start..."

rm -f deploy-log.txt .deploy-trigger 2>/dev/null

echo ""
echo "[1/5] Git status:"
git status 2>&1 | tee -a "$LOG"

echo ""
echo "[2/5] Staging changes..."
git add -A 2>&1 | tee -a "$LOG"
git status --short 2>&1 | tee -a "$LOG"

echo ""
echo "[3/5] Committing..."
git commit -m "feat: rename batch 1 + ID verification system (UI + DB integration)" 2>&1 | tee -a "$LOG"

echo ""
echo "[4/5] Pulling latest with rebase..."
git pull --rebase origin main 2>&1 | tee -a "$LOG"
PULL_RC=$?

if [ $PULL_RC -ne 0 ]; then
  echo "Rebase failed. Aborting..."
  git rebase --abort 2>/dev/null
  read -p "Press Enter to view log..."
  notepad.exe "$LOG"
  read -p "Press Enter to close..."
  exit 1
fi

echo ""
echo "[5/5] Pushing to GitHub..."
git push origin main 2>&1 | tee -a "$LOG"
PUSH_RC=$?

echo ""
if [ $PUSH_RC -eq 0 ]; then
  echo "=========================================================="
  echo "  [SUCCESS] Code deployed!"
  echo "=========================================================="
  echo ""
  echo "Vercel will auto-deploy in 1-2 minutes."
  echo "Check:"
  echo "  https://vercel.com/madmonaadmin-1699s-projects/project-ew64j/deployments"
  echo ""
  git log --oneline -5
else
  echo "=========================================================="
  echo "  [FAIL] Push exit: $PUSH_RC"
  echo "=========================================================="
fi

echo ""
read -p "Press Enter to view log..."
notepad.exe "$LOG"
read -p "Press Enter to close..."
