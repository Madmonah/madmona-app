@echo off
cd /d E:\madmona-app
echo === هل جلسة الواتساب اتكوميتت قبل كده؟ ===
git log --all --oneline -- ".wa-profile" ".wa-dl" 2>nul
echo (فاضي = مااتكوميتتش — تمام)
echo.
echo === ملفات كبيرة متتبّعة في git ===
git ls-files | findstr /I /C:".pdf" /C:".wa-profile" /C:".wa-dl"
echo (فاضي = تمام)
echo.
echo === بعد الـgitignore الجديد ===
git status --short | find /c "??"
