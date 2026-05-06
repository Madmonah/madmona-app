#!/bin/bash
# Madmona  -  Deploy: Rename Batch 2 (admin + supplier dashboard pages)
set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-rename2.txt"
echo "Madmona Deploy: Rename Batch 2 - $(date)" > "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  Rename Batch 2"
echo "=========================================================="
echo ""
echo "  Admin & supplier dashboard rename to new vocabulary:"
echo ""
echo "  CHANGES:"
echo "    - supplier/dashboard: header + body text"
echo "    - admin/marketplace-suppliers: page headers, dialogs"
echo "    - admin/marketplace-bookings: pricing breakdown label"
echo "    - admin/dashboard: tool cards, metrics, recent bookings"
echo "    - supplier/marketplace: dashboard subtitle"
echo "    - supplier/marketplace/reviews: empty states + customer fallback"
echo "    - supplier/marketplace/new: admin mode + no-supplier states"
echo ""
echo "  TERMS RENAMED:"
echo "    - مورد → أجر معانا"
echo "    - الموردين → أجر معانا"
echo "    - عميل → أجر مننا"
echo "    - عملاء → اللي بيأجروا مننا"
echo ""
echo "  NOT TOUCHED (low priority - admin-only pages):"
echo "    - admin/bookings, leads, listings, payouts"
echo "    - admin/suppliers, units, notifications"
echo "    - admin/site-settings, categories"
echo "    - supplier/marketplace/[id]/edit"
echo "    - components/AccountSwitcher, UnitForm, BookingToast"
echo ""
read -p "Press Enter to deploy..."

echo ""
echo "[1/3] Staging + committing..."
git add -A 2>&1 | tee -a "$LOG"
git commit -m "feat: rename batch 2 - admin + supplier dashboard pages (مورد→أجر معانا, عميل→أجر مننا)" 2>&1 | tee -a "$LOG"

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
  echo "  Vercel auto-deploy will start now"
  echo "  Check: https://vercel.com/madmonaadmin-1699s-projects/project-ew64j/deployments"
  echo "=========================================================="
else
  echo "[FAIL] Push exit: $RC"
fi

read -p "Press Enter to view log..."
notepad.exe "$LOG"
read -p "Press Enter to close..."
