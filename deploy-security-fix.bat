@echo off
cd /d "%~dp0"
echo ================================================================
echo   SECURITY: Remove Leaked Service Key from Git Tracking
echo ================================================================
echo.
echo   PROBLEM:
echo   The previous deploy committed REMOVE_LISTING.ps1 which had the
echo   Supabase Service Role Key hardcoded inside it (commit acf2c8ca).
echo   GitHub secret scanning detected and flagged this.
echo.
echo   THIS SCRIPT DOES:
echo   1. Untracks REMOVE_LISTING.ps1 + REMOVE_LISTING.bat from git
echo      (the local files stay — the sanitized .ps1 reads from .env.local)
echo   2. Commits the sanitized version + updated .gitignore
echo   3. Pushes to GitHub
echo.
echo   AFTER THIS SCRIPT FINISHES, YOU MUST:
echo   ----------------------------------------------------------------
echo   *** ROTATE THE SUPABASE SERVICE ROLE KEY *** (CRITICAL)
echo   ----------------------------------------------------------------
echo   The leaked key is still visible in git history at commit acf2c8ca.
echo   The only way to make it harmless is to invalidate it by rotating.
echo.
echo   STEPS:
echo   1. Go to Supabase Dashboard ^> Project Settings ^> API
echo      URL: https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/settings/api
echo   2. Find "service_role" secret ^> click "Reveal" then "Reset"
echo      (this generates a new key, kills the old one immediately)
echo   3. Copy the NEW service role key
echo   4. Update Vercel:
echo      https://vercel.com/dashboard ^> madmona-app ^> Settings ^> Environment Variables
echo      Edit SUPABASE_SERVICE_ROLE_KEY ^> paste new key ^> Save ^> Redeploy
echo   5. Update local .env.local:
echo      Replace the SUPABASE_SERVICE_ROLE_KEY=... line with the new key
echo.
echo   Until you rotate, the OLD key is publicly known and can be used
echo   by anyone to bypass all RLS on your database.
echo.
pause
echo.
echo Untracking the leaked files from git...
git rm --cached REMOVE_LISTING.ps1 REMOVE_LISTING.bat
echo.
echo Staging the .gitignore update + sanitized files...
git add .gitignore
git commit -m "security: untrack admin scripts containing service role key + gitignore them"
echo.
echo Pushing to GitHub...
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   PUSHED. Now rotate the key as described above.
) else (
  echo   PUSH FAILED. Read the error and try again.
)
pause
