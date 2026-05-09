@echo off
title Madmona Dev Server
cd /d "%~dp0"
echo ==============================================
echo   Starting Madmona Dev Server...
echo ==============================================
echo.
echo Once you see "Ready", open this in your browser:
echo   http://localhost:3000/admin/categories
echo.
echo To stop the server: close this window or press Ctrl+C
echo ==============================================
echo.
npm run dev
pause
