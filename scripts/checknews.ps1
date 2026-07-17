$r = curl.exe -s 'https://www.madmonacairo.com/api/news-feed?category=madmona'
Write-Output ($r.Substring(0, [Math]::Min(900, $r.Length)))
