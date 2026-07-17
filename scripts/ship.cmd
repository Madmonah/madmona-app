@echo off
cd /d E:\madmona-app
git add -A src
git commit -m "fix(home): surface what you own on the landing screen. Owners of 14 assets were landing on 'your day is empty' with their projects buried in /account; MyAssetsCard now renders on /home too (auto-hides for customers). Also correct the account-switcher help text — it claimed a password was needed, but login is WhatsApp-only" > scripts\commit.log 2>&1
git push origin main > scripts\push.log 2>&1
echo PUSH_EXIT=%errorlevel%
git log --oneline -1
echo ---DONE---
