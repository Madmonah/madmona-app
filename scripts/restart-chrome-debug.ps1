Write-Output "Closing Chrome..."
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 4
Write-Output "Starting Chrome with debug port 9222..."
$exe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$post = "https://www.facebook.com/groups/270091898242860/permalink/1594743139111056/"
Start-Process -FilePath $exe -ArgumentList @(
  "--remote-debugging-port=9222",
  "--profile-directory=Profile 1",
  $post
)
Start-Sleep -Seconds 10
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:9222/json/version" -UseBasicParsing -TimeoutSec 5
  Write-Output "DEBUG_PORT_OK"
  Write-Output $r.Content
} catch {
  Write-Output "NO_DEBUG_PORT"
}
