Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 5
$exe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$dir = "C:\Users\solutions\AppData\Local\Google\Chrome\User Data"
$post = "https://www.facebook.com/groups/270091898242860/permalink/1594743139111056/"
# مهم: لازم يكون فيه --remote-debugging-address ومنفذ، وإغلاق كامل قبله
Start-Process -FilePath $exe -ArgumentList @(
  "--remote-debugging-port=9222",
  "--remote-allow-origins=*",
  "--user-data-dir=$dir",
  "--profile-directory=Profile 1",
  $post
)
for ($i=0; $i -lt 10; $i++) {
  Start-Sleep -Seconds 4
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:9222/json/version" -UseBasicParsing -TimeoutSec 4
    Write-Output "DEBUG_PORT_OK after $($i*4)s"
    Write-Output $r.Content
    break
  } catch {
    Write-Output "retry $i ..."
  }
}
