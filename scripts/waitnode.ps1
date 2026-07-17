for ($i = 0; $i -lt 24; $i++) {
  Start-Sleep -Seconds 5
  $c = @(Get-Process node -ErrorAction SilentlyContinue).Count
  if ($c -eq 0) { break }
}
Write-Host "--- LOG ---"
Get-Content 'E:\madmona-app\scripts\dbg.log' -Raw
