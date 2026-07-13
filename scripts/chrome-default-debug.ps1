Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 5
$exe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$dir = "C:\Users\solutions\AppData\Local\Google\Chrome\User Data"
Start-Process -FilePath $exe -ArgumentList @(
  "--remote-debugging-port=9222",
  "--remote-allow-origins=*",
  "--user-data-dir=$dir",
  "--profile-directory=Default",
  "https://web.whatsapp.com/"
)
Start-Sleep -Seconds 12
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:9222/json/version" -UseBasicParsing -TimeoutSec 5
  Write-Output "DEBUG_PORT_OK"
} catch { Write-Output "NO_DEBUG_PORT" }
