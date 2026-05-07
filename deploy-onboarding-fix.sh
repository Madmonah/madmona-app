#!/bin/bash
# Madmona  -  Deploy: Onboarding fix + Subcategory filter + Clinics
set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-onboarding.txt"
echo "Madmona Deploy: Funnel Fix - $(date)" > "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  CRITICAL Funnel Fix"
echo "=========================================================="
echo ""
echo "  DIAGNOSIS:"
echo "    19 signups in 30 days, 4 real suppliers, 0 listings."
echo "    Suppliers thought registration = posting a listing."
echo "    They registered with listing titles in business_name."
echo ""
echo "  CHANGES (code only):"
echo ""
echo "  1. /supplier/register page rewrite:"
echo "     - Title: 'الخطوة 1 من 2: تسجيل حساب'"
echo "     - Blue info banner: 'دي مش خانة تسجيل إعلان'"
echo "     - Helper text under business_name field"
echo "     - Submit button: 'سجل حسابي وروح لإضافة الإعلان'"
echo "     - SUCCESS state: auto-redirects to /supplier/marketplace/new"
echo "     - has-supplier with 0 listings: PROMINENT gold CTA banner"
echo ""
echo "  2. /marketplace subcategory pills:"
echo "     - Loads ALL active categories (not just root)"
echo "     - When root selected, shows sub pills below in gold"
echo "     - 'كل الأقسام' option to clear sub filter"
echo "     - URL-friendly: /marketplace?category=properties-clinics"
echo ""
echo "  ALREADY DONE (in DB):"
echo "    + عيادات subcategory under عقارات للإيجار"
echo "    + 3 DEMO clinic listings (2,500 / 4,500 / 8,000 EGP)"
echo ""
read -p "Press Enter to deploy..."

echo ""
echo "[1/3] Staging + committing..."
git add -A 2>&1 | tee -a "$LOG"
git commit -m "fix: critical onboarding flow — supplier register now redirects to listing creation + marketplace subcategory pills + clinics category" 2>&1 | tee -a "$LOG"

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
else
  echo "[FAIL] Push exit: $RC"
fi

read -p "Press Enter to view log..."
notepad.exe "$LOG"
read -p "Press Enter to close..."
