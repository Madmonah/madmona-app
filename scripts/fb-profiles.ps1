$ud = "C:\Users\solutions\AppData\Local\Google\Chrome\User Data"
Get-ChildItem $ud -Directory | ForEach-Object {
  $n = $_.Name
  if ($n -eq "Default" -or $n -like "Profile*") {
    $pref = Join-Path $_.FullName "Preferences"
    $email = ""
    if (Test-Path $pref) {
      try {
        $j = Get-Content $pref -Raw -Encoding UTF8 | ConvertFrom-Json
        $email = $j.account_info[0].email
      } catch {}
    }
    Write-Output ("$n | $email")
  }
}
