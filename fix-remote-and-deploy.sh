#!/bin/bash
# ============================================================
# Madmona  -  FIX REMOTE URL + DEPLOY
# The remote URL is missing "Madmonah" - need to fix it.
# ============================================================

set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-fix-remote.txt"
echo "Madmona Fix-Remote Log - $(date)" > "$LOG"
echo "==========================================================" >> "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  FIX REMOTE URL + DEPLOY"
echo "=========================================================="
echo ""
echo "Problem detected: Your git remote URL is missing the"
echo "username. It currently looks like:"
echo "  https://github.com//madmona-app.git"
echo ""
echo "Should be:"
echo "  https://github.com/Madmonah/madmona-app.git"
echo ""
echo "This script will fix it and try to push."
echo ""
read -p "Press Enter to start..."

# ----- Step 1: Show current remote -----
echo ""
echo "[1/6] Current remote configuration:"
echo "" >> "$LOG"
echo "=== STEP 1: CURRENT REMOTE ===" >> "$LOG"
git remote -v 2>&1 | tee -a "$LOG"

# ----- Step 2: Fix remote URL -----
echo ""
echo "[2/6] Fixing remote URL..."
echo "" >> "$LOG"
echo "=== STEP 2: FIX REMOTE ===" >> "$LOG"

git remote set-url origin https://github.com/Madmonah/madmona-app.git 2>&1 | tee -a "$LOG"

echo ""
echo "New remote configuration:"
git remote -v 2>&1 | tee -a "$LOG"

# ----- Step 3: Test fetch -----
echo ""
echo "[3/6] Testing fetch with corrected URL..."
echo "" >> "$LOG"
echo "=== STEP 3: FETCH ===" >> "$LOG"

git fetch origin 2>&1 | tee -a "$LOG"
FETCH_RC=${PIPESTATUS[0]}

if [ $FETCH_RC -ne 0 ]; then
  echo ""
  echo "=========================================================="
  echo "  FETCH STILL FAILED"
  echo "=========================================================="
  echo "  This means the URL is correct but auth or repo access"
  echo "  is the issue. Check the log."
  read -p "Press Enter to view log..."
  notepad.exe "$LOG"
  read -p "Press Enter to close..."
  exit 1
fi

echo "Fetch OK."

# ----- Step 4: Restore stashed changes (from previous attempt) -----
echo ""
echo "[4/6] Checking for stashed changes from previous run..."
echo "" >> "$LOG"
echo "=== STEP 4: STASH STATUS ===" >> "$LOG"
git stash list 2>&1 | tee -a "$LOG"

# Try to pop stash, but don't fail if there's nothing
git stash pop 2>&1 | tee -a "$LOG" || echo "(no stash to pop or conflict, continuing)"

# ----- Step 5: Rebase -----
echo ""
echo "[5/6] Rebasing onto origin/main..."
echo "" >> "$LOG"
echo "=== STEP 5: REBASE ===" >> "$LOG"

# Check if we need to rebase
git status 2>&1 | tee -a "$LOG"

# If there are unstaged changes from the stash pop, commit them first
if ! git diff-index --quiet HEAD --; then
  echo "Committing post-stash changes..."
  git add -A
  git commit -m "chore: restore work-in-progress after remote URL fix" 2>&1 | tee -a "$LOG"
fi

git rebase origin/main 2>&1 | tee -a "$LOG"
REBASE_RC=${PIPESTATUS[0]}

if [ $REBASE_RC -ne 0 ]; then
  echo ""
  echo "=========================================================="
  echo "  REBASE CONFLICT - aborting"
  echo "=========================================================="
  git rebase --abort
  read -p "Press Enter to view log..."
  notepad.exe "$LOG"
  read -p "Press Enter to close..."
  exit 1
fi

# ----- Step 6: Push -----
echo ""
echo "[6/6] Pushing to GitHub..."
echo "" >> "$LOG"
echo "=== STEP 6: PUSH ===" >> "$LOG"

git push origin main 2>&1 | tee -a "$LOG"
PUSH_RC=${PIPESTATUS[0]}

echo ""
if [ $PUSH_RC -eq 0 ]; then
  echo "=========================================================="
  echo "  [SUCCESS] !!!"
  echo "=========================================================="
  echo ""
  echo "Vercel will auto-deploy in 1-2 minutes."
  echo "Check:"
  echo "  https://vercel.com/madmonaadmin-1699s-projects/project-ew64j/deployments"
  echo ""
  echo "Latest commits on GitHub now:"
  git log --oneline -7
else
  echo "=========================================================="
  echo "  [FAIL] Push failed - exit $PUSH_RC"
  echo "=========================================================="
  echo ""
  echo "If it's an auth issue:"
  echo "  1. Win+R, paste: rundll32.exe keymgr.dll,KRShowKeyMgr"
  echo "  2. Delete entries with 'github.com'"
  echo "  3. Run this script again - it will prompt for login"
fi

echo ""
read -p "Press Enter to view log..."
notepad.exe "$LOG"
echo ""
read -p "Press Enter to close..."
