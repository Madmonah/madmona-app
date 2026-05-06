#!/bin/bash
# Madmona  -  Deploy: Supplier CTA text → "هتأجر ايه؟"
set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-cta.txt"
echo "Madmona Deploy: CTA Text - $(date)" > "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  CTA Text Update"
echo "=========================================================="
echo ""
echo "  Updated supplier register CTA across all 4 places:"
echo ""
echo "    1. TopNav desktop dropdown"
echo "    2. TopNav mobile drawer"
echo "    3. LaunchBanner (rotating offer banner)"
echo "    4. Homepage Dual CTA (أجر معانا card)"
echo ""
echo "  OLD text variations:"
echo "    - سجّل عرضك"
echo "    - سجّل دلوقتي"
echo ""
echo "  NEW unified text:"
echo "    → هتأجر ايه؟"
echo ""
read -p "Press Enter to deploy..."

echo ""
echo "[1/3] Staging + committing..."
git add -A 2>&1 | tee -a "$LOG"
git commit -m "feat: update supplier register CTA to 'هتأجر ايه؟' across all entry points" 2>&1 | tee -a "$LOG"

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
