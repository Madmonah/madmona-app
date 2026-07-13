$p = Get-Process chrome -ErrorAction SilentlyContinue
Write-Output ("COUNT=" + ($p | Measure-Object).Count)
if ($p) { Write-Output ("EXE=" + ($p | Select-Object -First 1).Path) }
Write-Output ("PROFILE=" + $env:LOCALAPPDATA + "\Google\Chrome\User Data")
