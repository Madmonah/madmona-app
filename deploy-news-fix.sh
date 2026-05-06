#!/bin/bash
# Madmona  -  Deploy: news keyword filter + dark CTA + better section title
set +e
cd "$(dirname "$0")" || exit 1

LOG="/tmp/madmona-news-fix.txt"
echo "Madmona Deploy: news fix + dark CTA - $(date)" > "$LOG"

clear
echo "=========================================================="
echo "  Madmona  -  News Fix + Dark Slate CTA"
echo "=========================================================="
echo ""
echo "  Changes in this deploy:"
echo ""
echo "  1. NEWS RELEVANCE FIX:"
echo "     - Added keyword filter per category"
echo "     - economy: 30+ economy/finance keywords"
echo "     - interior: 27+ police/security/crime keywords"
echo "     - locals: 30+ governorate/services keywords"
echo "     - defense: 27+ political/military keywords"
echo "     - sports/fashion/trending: stay loose (no filter)"
echo "     - Falls back to unfiltered if filter is too strict"
echo ""
echo "  2. NEWS SECTION TITLE:"
echo "     - Replaced 'EST. 2026' caption with proper section title"
echo "     - Big visible 'آخر الأخبار' header above the widget"
echo "     - Live red dot icon for visual coherence"
echo "     - Subtitle explaining update frequency"
echo ""
echo "  3. اجر معانا CARD - DARK SLATE INSTEAD OF GOLD:"
echo "     - From: gold gradient (#B8860B -> #D4A12A)"
echo "     - To:   slate gradient (#1F2937 -> #374151)"
echo "     - Sophisticated, elegant, professional"
echo "     - Subtle gold accent in the corner blur"
echo ""
echo "  4. CTA TEXT CHANGE:"
echo "     - 'سجّل عرضك' -> 'سجّل دلوقتي'"
echo "     - Clearer call to action"
echo ""
read -p "Press Enter to start..."

echo ""
echo "[1/3] Staging + committing..."
git add -A 2>&1 | tee -a "$LOG"
git commit -m "fix: news keyword filter + dark slate CTA + 'سجل دلوقتي' + better news section title" 2>&1 | tee -a "$LOG"

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
