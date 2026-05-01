@echo off
cd /d "%~dp0"
echo ================================================================
echo   Tier 1+2: Permissions wiring + SEO + Analytics + 404
echo ================================================================
echo.
echo   STAFF PERMISSIONS WIRED:
echo   * /supplier/marketplace now reads from supplier_staff table
echo   * Staff members see banner with their role
echo   * Buttons hide based on permissions (publish/delete/manage)
echo   * useSupplierAccess hook for future pages
echo.
echo   SEO IMPROVEMENTS:
echo   * Dynamic sitemap.xml: pulls listings + categories from DB
echo   * robots.txt: blocks admin/private routes
echo   * JSON-LD structured data:
echo     - Per-listing: Product schema with offers + ratings
echo     - Root: LocalBusiness + Organization + WebSite
echo   * Address corrected (سليمان عَزْمي + 30.1134075,31.3655983)
echo   * Per-listing canonical URLs
echo.
echo   ANALYTICS READY:
echo   * GoogleAnalytics component (NEXT_PUBLIC_GA_ID env var)
echo   * MetaPixel component (NEXT_PUBLIC_META_PIXEL_ID env var)
echo   * Helpers: trackingEvents, pixelEvents
echo   * Both render NOTHING if env var not set (safe)
echo.
echo   ERROR HANDLING:
echo   * Premium 404 page with brand styling
echo   * Global error boundary with retry button
echo.
pause
git add .
git commit -m "feat: staff permissions wiring + SEO essentials + analytics + 404"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED.
)
pause
