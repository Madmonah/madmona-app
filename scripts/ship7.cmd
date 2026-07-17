@echo off
cd /d E:\madmona-app
git add src/app/api/auth/wa/route.ts
git commit -m "fix(auth): clean unused ts-expect-error in wa route"
git push origin main
echo EXIT=%ERRORLEVEL%
