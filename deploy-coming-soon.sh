#!/bin/bash
# Madmona  -  Deploy: Coming Soon badge for DEMO listings (Option B)
set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-coming-soon.txt"
echo "Madmona Deploy: Coming Soon Badge - $(date)" > "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  Coming Soon Badge for DEMO listings"
echo "=========================================================="
echo ""
echo "  PROBLEM (data-driven):"
echo "    197/205 listings (96%) had 0 views."
echo "    Customers saw 'DEMO ·' prefix, lost trust, didn't browse."
echo "    11/19 customers were dormant."
echo ""
echo "  SOLUTION (Option B - chosen):"
echo "    Keep DEMO listings visible BUT clearly marked"
echo "    as 'قريباً · نموذج' with disabled booking."
echo ""
echo "  FILES CHANGED:"
echo ""
echo "  1. NEW: src/lib/listingHelpers.ts"
echo "     - isDemoListing(title) helper"
echo "     - cleanListingTitle(title) - strips 'DEMO · ' prefix"
echo ""
echo "  2. src/app/marketplace/page.tsx (browse cards)"
echo "     - Amber 'قريباً · نموذج' badge on DEMO cards"
echo "     - Hides price, shows 'متوفر قريباً' instead"
echo "     - Cleaner display title (no DEMO prefix)"
echo ""
echo "  3. src/app/marketplace/[slug]/page.tsx (detail page)"
echo "     - Amber Coming Soon banner under title"
echo "     - Disables booking button for DEMOs"
echo "     - WhatsApp button: 'بلّغني لما يبقى متاح'"
echo "     - Mobile bottom CTA: amber 'قريباً' chip"
echo ""
echo "  4. src/app/marketplace/[slug]/book/page.tsx (booking)"
echo "     - NEW stage 'demo-not-bookable' blocks direct URL access"
echo "     - Amber gate page with WhatsApp CTA"
echo ""
echo "  5. src/components/FeaturedListings.tsx (homepage)"
echo "     - EXCLUDES DEMOs from homepage entirely"
echo "     - Homepage = first impression, only real listings"
echo ""
read -p "Press Enter to deploy..."

echo ""
echo "[1/3] Staging + committing..."
git add -A 2>&1 | tee -a "$LOG"
git commit -m "feat(marketplace): mark DEMO listings as 'قريباً · نموذج' with disabled booking" 2>&1 | tee -a "$LOG"

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
