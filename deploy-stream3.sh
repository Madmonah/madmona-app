#!/bin/bash
# Madmona  -  Deploy: Stream 3 (supplier ID approval) + DEMO listings SQL
set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-stream3.txt"
echo "Madmona Deploy: Stream 3 + Demo SQL - $(date)" > "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  Stream 3 + Demo Listings"
echo "=========================================================="
echo ""
echo "  Code changes (deployed via Vercel):"
echo ""
echo "  STREAM 3 - SUPPLIER ID APPROVAL WORKFLOW:"
echo "    - bookings page: new 'بطاقة بانتظار' filter tab"
echo "    - bookings page: shows ID badge on cards needing review"
echo "    - bookings detail: ID verification card with"
echo "      customer's national ID displayed clearly"
echo "    - approve button: moves booking to pending_payment"
echo "    - reject button: cancels booking with reason"
echo "    - status badge integration with new state"
echo ""
echo "  =========================================================="
echo "  AFTER DEPLOY - RUN DEMO LISTINGS SQL:"
echo "  =========================================================="
echo ""
echo "  File: migrations/2026-05-demo-listings.sql"
echo ""
echo "  This creates 3 DEMO listings per category under"
echo "  Madmona supplier. Total ~150-165 listings depending on"
echo "  how many categories you have."
echo ""
echo "  Each listing has:"
echo "    - Title with 'DEMO' prefix"
echo "    - Realistic price tied to category type"
echo "    - Themed Unsplash photo"
echo "    - Active pricing rule"
echo "    - Published status"
echo ""
echo "  Open Supabase SQL Editor and paste the file content."
echo "  It's idempotent - safe to run multiple times."
echo ""
read -p "Press Enter to deploy code..."

echo ""
echo "[1/3] Staging + committing..."
git add -A 2>&1 | tee -a "$LOG"
git commit -m "feat: Stream 3 supplier ID approval workflow + demo listings SQL" 2>&1 | tee -a "$LOG"

echo ""
echo "[2/3] Rebase + pull..."
git pull --rebase origin main 2>&1 | tee -a "$LOG"

echo ""
echo "[3/3] Push..."
git push origin main 2>&1 | tee -a "$LOG"
RC=$?

if [ $RC -eq 0 ]; then
  echo ""
  echo "[SUCCESS] Pushed!"
  git log --oneline -5
  echo ""
  echo "=========================================================="
  echo "  NEXT: Run migrations/2026-05-demo-listings.sql"
  echo "        in Supabase SQL Editor to populate listings"
  echo "=========================================================="
else
  echo "[FAIL] Push exit: $RC"
fi

read -p "Press Enter to view log..."
notepad.exe "$LOG"
read -p "Press Enter to close..."
