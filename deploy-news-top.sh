#!/bin/bash
# Madmona  -  Deploy: News at top + Hero=DualCTA + Magazine design
set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-news-top.txt"
echo "Madmona Deploy: News on top + Hero=DualCTA - $(date)" > "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  News on Top + Hero = Registration"
echo "=========================================================="
echo ""
echo "  Major homepage restructure:"
echo ""
echo "  NEW LAYOUT (top to bottom):"
echo "    1. TopNav"
echo "    2. FinancialTicker (currency + gold)"
echo "    3. LaunchBanner"
echo "    4. NEWS HUB - magazine style at TOP"
echo "       - 7 tabs: economy, interior, locals, defense,"
echo "         sports, fashion, trending"
echo "       - Big featured (rotating 5s) + 4 side cards"
echo "       - Auto-refresh every 3 min"
echo "       - Reliable RSS sources for each category"
echo "    5. HERO = DUAL CTA (replaces old hero)"
echo "       - Brand statement: 'خدمتك، وقتك، مضمونة'"
echo "       - Big green card: أجر مننا (للعميل)"
echo "       - Big gold card:  أجر معانا (للمورد)"
echo "    6. Categories"
echo "    7. Featured listings"
echo "    8. How it works"
echo "    9. Contact"
echo "    10. Footer"
echo ""
echo "  REMOVED:"
echo "    - EconomicNewsHero from hero (news now at top)"
echo "    - Original hero title section (replaced by dual CTA)"
echo "    - Redundant Supplier CTA section (was duplicate)"
echo ""
echo "  RSS SOURCES UPGRADED:"
echo "    - More reliable feeds per category"
echo "    - Multiple backup sources per category"
echo "    - Each tab fetches the right type of news"
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
git commit -m "feat: news at top + hero=dual CTA + magazine design + reliable RSS feeds" 2>&1 | tee -a "$LOG"

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
  git log --oneline -5
else
  echo "[FAIL] Push exit: $PUSH_RC"
fi

echo ""
read -p "Press Enter to view log..."
notepad.exe "$LOG"
read -p "Press Enter to close..."
