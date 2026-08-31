# launch-chrome-debug.ps1 -- Chrome A for personal email (Claude + Facebook) on port 9222
$ProfileDir = "E:\madmona-app\scripts\reels\playwright\chrome-cdp-profile"
$ChromeExe  = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $ChromeExe)) { $ChromeExe = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }
if (-not (Test-Path $ChromeExe)) { Write-Host "Chrome not found." -ForegroundColor Red; exit 1 }
New-Item -Type Directory -Path $ProfileDir -Force | Out-Null

Write-Host "Chrome A on port 9222 - profile: $ProfileDir" -ForegroundColor Cyan
Write-Host "Sign in with PERSONAL email: Claude.ai + Facebook" -ForegroundColor Yellow

$args = @(
  "--remote-debugging-port=9222",
  "--user-data-dir=$ProfileDir",
  "--window-size=1200,900",
  "--autoplay-policy=no-user-gesture-required",
  "--no-first-run",
  "--no-default-browser-check",
  "https://claude.ai/"
)
& $ChromeExe @args
