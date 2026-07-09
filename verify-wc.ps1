$ProgressPreference = 'SilentlyContinue'
$h = Invoke-WebRequest -Uri 'https://www.madmonacairo.com/' -TimeoutSec 30 -UseBasicParsing
$m = [regex]::Matches($h.Content, 'src="(/_next/static/chunks/[^"]+\.js)"')
$urls = @()
foreach ($x in $m) { $urls += $x.Groups[1].Value }
$urls = $urls | Select-Object -Unique
Write-Host ("chunks=" + $urls.Count)
$found = 'NOT_FOUND'
foreach ($c in $urls) {
  try {
    $js = Invoke-WebRequest -Uri ('https://www.madmonacairo.com' + $c) -TimeoutSec 20 -UseBasicParsing
    if ($js.Content -like '*world-cup*') { $found = 'FOUND_IN ' + $c; break }
  } catch {}
}
Write-Host $found

# also verify the API still returns matches
try {
  $r = Invoke-RestMethod -Uri 'https://www.madmonacairo.com/api/world-cup' -TimeoutSec 30
  Write-Host ("api_ok=" + $r.ok + " matches=" + $r.matches.Count)
} catch { Write-Host "api_FAIL" }
