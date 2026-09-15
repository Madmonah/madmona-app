# (١٥/٩/٢٠٢٦) قتل كروم السوشيال (chrome-social-profile) بس — بديل الأمر المتهرّب جوّه bash اللي كان بيرمي CommandNotFoundException
Get-CimInstance Win32_Process -Filter "name='chrome.exe'" |
  Where-Object { $_.CommandLine -like '*chrome-social-profile*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
"killed"
