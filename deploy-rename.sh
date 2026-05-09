#!/bin/bash
# Madmona  -  Deploy: rename مورد→أجر معانا, عميل→أجر مننا (batch 1)
set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-rename-batch1.txt"
echo "Madmona Deploy: rename batch 1 (customer-facing) - $(date)" > "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  Rename Refactor Batch 1"
echo "=========================================================="
echo ""
echo "  Files renamed (customer-facing):"
echo "  - TopNav (للموردين -> أجر معانا)"
echo "  - LaunchBanner (للعملاء/للموردين)"
echo "  - WelcomeSupplierBanner (كعميل/كمورد)"
echo "  - Account page (sections + supplier label)"
echo "  - About page (story + values)"
echo "  - Launch page (offers + benefits)"
echo "  - Supplier login/signup"
echo "  - Supplier register page"
echo "  - Marketplace listing detail"
echo "  - Marketplace booking page"
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
git commit -m "feat: rename مورد->أجر معانا and عميل->أجر مننا across customer-facing pages" 2>&1 | tee -a "$LOG"

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
