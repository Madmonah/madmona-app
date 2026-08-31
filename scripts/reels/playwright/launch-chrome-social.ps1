# launch-chrome-social.ps1 -- Chrome B for madmona email on port 9223
$ProfileDir = "E:\madmona-app\scripts\reels\playwright\chrome-social-profile"
$ChromeExe  = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $ChromeExe)) { $ChromeExe = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }
if (-not (Test-Path $ChromeExe)) { Write-Host "Chrome not found." -ForegroundColor Red; exit 1 }
New-Item -Type Directory -Path $ProfileDir -Force | Out-Null

Write-Host "Chrome B on port 9223 - profile: $ProfileDir" -ForegroundColor Cyan
Write-Host "Sign in with MADMONA email:" -ForegroundColor Yellow
Write-Host "  Instagram, X, LinkedIn, YouTube, TikTok, Threads, Bluesky, Pinterest" -ForegroundColor White

$args = @(
  "--remote-debugging-port=9223",
  "--user-data-dir=$ProfileDir",
  "--window-size=1400,900",
  "--autoplay-policy=no-user-gesture-required",
  "--no-first-run",
  "--no-default-browser-check",
  "https://www.instagram.com/"
)
& $ChromeExe @args
