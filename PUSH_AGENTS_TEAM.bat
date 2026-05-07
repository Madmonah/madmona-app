@echo off
setlocal
cd /d "C:\madmona-app"
git add .
git commit -m "feat: 20 virtual agents (10 sales + 10 marketing) + master scheduler"
git push origin main
echo.
echo Pushed. Vercel auto-deploy starting (~2 min).
echo.
echo The scheduler runs hourly and auto-dispatches 5 due agents per run.
echo Agents emails go to madmona.admin@gmail.com.
echo WhatsApp agents need WHATSAPP_* env vars set in Vercel before they work.
echo.
pause
