#!/bin/bash
# ============================================================
# Madmona  -  Deploy News Tabs (sports/fashion/trending)
# ============================================================

set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-news-deploy.txt"
echo "Madmona News Deploy - $(date)" > "$LOG"
echo "==========================================================" >> "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  Deploy News Tabs Section"
echo "=========================================================="
echo ""
echo "What this adds:"
echo "  - /api/news-feed - new API for sports/fashion/trending/economy"
echo "  - NewsTabsSection.tsx - tabbed UI on homepage"
echo "  - Inserted between Categories and Featured Listings"
echo ""
echo "Log: $LOG"
echo ""
read -p "Press Enter to start..."

# Cleanup any stale log files
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
git commit -m "feat: news tabs section (sports + fashion + trending) on homepage" 2>&1 | tee -a "$LOG"
COMMIT_RC=$?
echo "Commit exit: $COMMIT_RC" >> "$LOG"

echo ""
echo "[4/5] Pulling latest from origin (with rebase)..."
git pull --rebase origin main 2>&1 | tee -a "$LOG"
PULL_RC=$?

if [ $PULL_RC -ne 0 ]; then
  echo ""
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
  echo "  [SUCCESS] !!"
  echo "=========================================================="
  echo ""
  echo "Vercel will auto-deploy in 1-2 minutes."
  echo "Check:"
  echo "  https://vercel.com/madmonaadmin-1699s-projects/project-ew64j/deployments"
  echo ""
  echo "After deploy, test:"
  echo "  https://madmonacairo.com/api/news-feed?category=sports"
  echo "  https://madmonacairo.com/api/news-feed?category=fashion"
  echo "  https://madmonacairo.com/api/news-feed?category=trending"
  echo "  https://madmonacairo.com/  (scroll down past categories)"
  echo ""
  echo "Latest commits:"
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
