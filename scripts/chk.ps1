$all = @(Get-Process chrome -ErrorAction SilentlyContinue)
Write-Host ("chrome procs: " + $all.Count)

$dbg = @(Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" |
  Where-Object { $_.CommandLine -match 'remote-debugging-port' })
Write-Host ("with debug port: " + $dbg.Count)
if ($dbg.Count -gt 0) { Write-Host $dbg[0].CommandLine }

try {
  Invoke-WebRequest 'http://127.0.0.1:9222/json/version' -UseBasicParsing -TimeoutSec 4 | Out-Null
  Write-Host 'PORT: OK'
} catch { Write-Host 'PORT: CLOSED' }
