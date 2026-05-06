#!/bin/bash
# Madmona  -  Deploy: news tabs in hero + Rate us + rename + individual reg
set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-deploy-features.txt"
echo "Madmona Deploy: hero news + rate us + rename + individual reg - $(date)" > "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  Deploy 4 features"
echo "=========================================================="
echo ""
echo "  1. Compact news tabs IN hero (beside economic news)"
echo "  2. Rate us on Google card in contact section"
echo "  3. Rename: مورد → أجر معانا, عميل → أجر مننا"
echo "  4. Individual/Business toggle in registration"
echo ""
read -p "Press Enter to start..."

# Cleanup
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
git commit -m "feat: news tabs in hero + Rate us link + rename mawared/3ameel + individual registration" 2>&1 | tee -a "$LOG"

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
  echo "  [SUCCESS] !!"
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
