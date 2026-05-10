@echo off
cd /d "%~dp0"
echo ================================================================
echo   FIX: Robust JSON parsing for all Vercel agents
echo ================================================================
echo.
echo   ROOT CAUSE: parseJsonResponse failed on truncated Claude output.
echo   * 11 Vercel agents were failing with "Unexpected end of JSON input"
echo   * Examples: ad-designer, content-marketing, seo-agent, trend-spotter
echo.
echo   FIX:
echo   * Bumped max_tokens default 4096 -^> 8192
echo   * parseJsonResponse: 4 repair strategies (was 1)
echo     1. Remove trailing commas
echo     2. Close unclosed strings + brackets
echo     3. Extract last complete top-level object
echo   * Better error messages (first + last chars of response)
echo.
echo   ALSO: Added "الخدمات الخارجية" section in /admin/dashboard
echo   * Resend, Vercel, Supabase, Cloudflare, GitHub, Meta, Canva, Anthropic
echo.
echo   Affected files:
echo   * src/lib/anthropic.ts (parseJsonResponse + max_tokens)
echo   * src/app/admin/dashboard/page.tsx (External Services section)
echo.
echo   Pushing to GitHub now...
echo.
git add .
git commit -m "fix: robust JSON parsing for Vercel agents + dashboard external links" --allow-empty
git pull --rebase origin main
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel deploy, then run agents again.
) else (
  echo   PUSH FAILED.
)
pause
