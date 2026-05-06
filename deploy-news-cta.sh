#!/bin/bash
# Madmona  -  Deploy: News restructure + Dual CTA (أجر معانا / أجر مننا)
set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-news-cta.txt"
echo "Madmona Deploy: News + Dual CTA - $(date)" > "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  News Restructure + Dual CTA"
echo "=========================================================="
echo ""
echo "  This deploy includes:"
echo ""
echo "  1. NEWS RESTRUCTURE:"
echo "     - Removed EconomicNewsHero from hero section"
echo "     - Hero now has decorative image (no news)"
echo "     - News API supports 7 categories:"
echo "       economy, interior, locals, defense,"
echo "       sports, fashion, trending"
echo "     - All tabs auto-rotate within (5s) like economic news did"
echo "     - Added RSS sources for new categories"
echo ""
echo "  2. DUAL CTA SECTION:"
echo "     - Big green 'أجر مننا' card (customer)"
echo "     - Big gold 'أجر معانا' card (supplier)"
echo "     - Visible right after hero, before news"
echo "     - Clear brand vocabulary, no confusion"
echo ""
echo "  3. NEWS HUB SECTION:"
echo "     - New dedicated section between dual CTA and categories"
echo "     - Centered, max 3xl wide"
echo "     - All 7 tabs in horizontal scroll"
echo "     - Featured news rotates every 5s"
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
git commit -m "feat: news hub with 7 categories + dual CTA (أجر معانا / أجر مننا)" 2>&1 | tee -a "$LOG"

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
