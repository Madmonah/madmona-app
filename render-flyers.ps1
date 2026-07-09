$ProgressPreference = 'SilentlyContinue'
$edge = @(
  "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { Write-Host 'NO_BROWSER_FOUND'; exit 1 }

$dir = 'E:\madmona-app\marketing\flyers-a5'

# 1) A5 flyers (1748x2480)
foreach ($pair in @(@('owner','A5-flyer-restaurant-owner'), @('customer','A5-flyer-customer'))) {
  $htmlPath = Join-Path $dir ($pair[0] + '.html')
  $outPath  = Join-Path $dir ($pair[1] + '.png')
  & $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1748,2480 --virtual-time-budget=12000 --screenshot="$outPath" ("file:///" + $htmlPath.Replace('\','/')) 2>$null | Out-Null
  Start-Sleep 2
  if (Test-Path $outPath) { Write-Host ($pair[1] + '.png OK ' + [math]::Round((Get-Item $outPath).Length/1KB) + 'KB') } else { Write-Host ($pair[1] + ' FAILED') }
}

# 2) A4 print sheets (2480x3508, 4x per page)
foreach ($pair in @(@('sheet-owner','A4-sheet-owner-x4'), @('sheet-customer','A4-sheet-customer-x4'))) {
  $htmlPath = Join-Path $dir ($pair[0] + '.html')
  $outPath  = Join-Path $dir ($pair[1] + '.png')
  & $edge --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=2480,3508 --virtual-time-budget=12000 --screenshot="$outPath" ("file:///" + $htmlPath.Replace('\','/')) 2>$null | Out-Null
  Start-Sleep 2
  if (Test-Path $outPath) { Write-Host ($pair[1] + '.png OK ' + [math]::Round((Get-Item $outPath).Length/1KB) + 'KB') } else { Write-Host ($pair[1] + ' FAILED') }
}
