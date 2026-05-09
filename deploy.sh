#!/bin/bash
# ============================================================
# Madmona  -  Git Bash deploy script
# Run this from Git Bash (right-click in C:\madmona-app -> "Git Bash Here")
# ============================================================

set +e  # don't exit on error - we want to see errors

cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-deploy-log.txt"
echo "Madmona Deploy Log - $(date)" > "$LOG"
echo "==========================================================" >> "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  Git Bash Deploy"
echo "=========================================================="
echo ""
echo "Log: $LOG"
echo ""
read -p "Press Enter to start..."

# ----- Step 1: Clean -----
echo ""
echo "[1/8] Cleaning untracked log/trigger files..."
rm -f deploy-log.txt .deploy-trigger
echo "Done."

# ----- Step 2: Stash -----
echo ""
echo "[2/8] Stashing pending work..."
git stash push -u -m "auto-stash before rebase" 2>&1 | tee -a "$LOG"

# ----- Step 3: Fetch -----
echo ""
echo "[3/8] Fetching from origin..."
git fetch origin 2>&1 | tee -a "$LOG"
FETCH_RC=${PIPESTATUS[0]}
echo "Fetch exit code: $FETCH_RC"

if [ $FETCH_RC -ne 0 ]; then
  echo ""
  echo "=========================================================="
  echo "  FETCH FAILED - check log above for the reason"
  echo "  Likely cause: GitHub auth expired"
  echo "=========================================================="
  read -p "Press Enter to view log..."
  notepad.exe "$LOG"
  read -p "Press Enter to close..."
  exit 1
fi

# ----- Step 4: Rebase -----
echo ""
echo "[4/8] Rebasing onto origin/main..."
git rebase origin/main 2>&1 | tee -a "$LOG"
REBASE_RC=${PIPESTATUS[0]}

if [ $REBASE_RC -ne 0 ]; then
  echo ""
  echo "=========================================================="
  echo "  REBASE CONFLICT - aborting safely"
  echo "=========================================================="
  git rebase --abort
  git stash pop 2>/dev/null
  read -p "Press Enter to view log..."
  notepad.exe "$LOG"
  read -p "Press Enter to close..."
  exit 1
fi

echo "Rebase OK."

# ----- Step 5: Pop stash -----
echo ""
echo "[5/8] Restoring stashed changes..."
git stash pop 2>&1 | tee -a "$LOG" || echo "(no stash to pop, that's fine)"

# ----- Step 6: Cleanup dead routes -----
echo ""
echo "[6/8] Cleaning dead routes..."
rm -rf "src/app/api/unit-bookings" 2>/dev/null
rm -rf "src/app/api/units" 2>/dev/null
rm -rf "src/app/api/booking-leads" 2>/dev/null
rm -rf "src/app/units" 2>/dev/null
echo "Done."

# ----- Step 7: Commit -----
echo ""
echo "[7/8] Staging + committing..."
git add -A
git status --short
git commit -m "chore: post-rebase cleanup (gitignore deploy logs, remove dead routes)" 2>&1 | tee -a "$LOG"

# ----- Step 8: Push -----
echo ""
echo "[8/8] Pushing to GitHub..."
git push origin main 2>&1 | tee -a "$LOG"
PUSH_RC=${PIPESTATUS[0]}

echo ""
echo "Push exit code: $PUSH_RC"

if [ $PUSH_RC -eq 0 ]; then
  echo ""
  echo "=========================================================="
  echo "  [SUCCESS] !!"
  echo "=========================================================="
  echo ""
  echo "Vercel will auto-deploy in 1-2 min."
  echo "Check: https://vercel.com/madmonaadmin-1699s-projects/project-ew64j/deployments"
  echo ""
  echo "Latest commits:"
  git log --oneline -7
else
  echo ""
  echo "=========================================================="
  echo "  [FAIL] Push failed - exit $PUSH_RC"
  echo "=========================================================="
  echo ""
  echo "Most common cause: GitHub authentication expired."
fi

echo ""
read -p "Press Enter to view full log..."
notepad.exe "$LOG"
echo ""
read -p "Press Enter to close..."
