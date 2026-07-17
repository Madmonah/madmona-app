$src = 'E:\madmona-app\skills\linkedin-outreach'
$zip = 'E:\madmona-app\skills\linkedin-outreach.zip'
$skl = 'E:\madmona-app\skills\linkedin-outreach.skill'
if (Test-Path $zip) { Remove-Item $zip -Force }
if (Test-Path $skl) { Remove-Item $skl -Force }
Compress-Archive -Path $src -DestinationPath $zip -Force
Move-Item $zip $skl
Get-Item $skl | Select-Object FullName, Length
