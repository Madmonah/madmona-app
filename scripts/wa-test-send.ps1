# اختبار إرسال تمبلت على رقم الأدمن نفسه للتأكد من الخطأ الحالي
$TOKEN = 'EAATn1voFkUwBR7UGluPFf8f4Y6HQhrKtxHnVgmZCvRlP3ZB36okeYK8I0glsc0gOc98SAQs567Om7PL14qHxjJbZCTkLqCpLk96ZBO2pphcqFu2TfafJ0G4VLK81g10fZCMGMh9az7KErgTtnZCShoFfopZBNiFUPMYCNcyPB1YdRTQGTzeJyosCgVtTqEEfQZDZD'
$PHONE = '1084433138092430'
$TO    = '201026222337'

$body = @{
  messaging_product = 'whatsapp'
  to = $TO
  type = 'template'
  template = @{
    name = 'madmona_supplier_intro_v1'
    language = @{ code = 'ar' }
    components = @(
      @{ type = 'body'; parameters = @( @{ type = 'text'; text = 'اختبار' } ) }
    )
  }
} | ConvertTo-Json -Depth 8 -Compress

$tmp = Join-Path $env:TEMP 'wa_test.json'
[System.IO.File]::WriteAllText($tmp, $body, [System.Text.UTF8Encoding]::new($false))

Write-Output '--- REQUEST ---'
Write-Output $body
Write-Output ''
Write-Output '--- RESPONSE ---'
& curl.exe -s -X POST ('https://graph.facebook.com/v21.0/' + $PHONE + '/messages') `
  -H ("Authorization: Bearer " + $TOKEN) `
  -H 'Content-Type: application/json' `
  --data-binary ('@' + $tmp)
Write-Output ''
