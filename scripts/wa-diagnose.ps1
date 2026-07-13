# تشخيص واتساب API - خطأ 131042
$TOKEN = 'EAATn1voFkUwBR7UGluPFf8f4Y6HQhrKtxHnVgmZCvRlP3ZB36okeYK8I0glsc0gOc98SAQs567Om7PL14qHxjJbZCTkLqCpLk96ZBO2pphcqFu2TfafJ0G4VLK81g10fZCMGMh9az7KErgTtnZCShoFfopZBNiFUPMYCNcyPB1YdRTQGTzeJyosCgVtTqEEfQZDZD'
$WABA  = '808213428675221'
$BIZ   = '2149017578577732'
$PHONE = '1084433138092430'
$G     = 'https://graph.facebook.com/v21.0/'

function Ask($label, $url) {
  Write-Output ''
  Write-Output ('===== ' + $label + ' =====')
  & curl.exe -s -H ("Authorization: Bearer " + $TOKEN) $url
  Write-Output ''
}

Ask 'TOKEN' ($G + 'debug_token?input_token=' + $TOKEN)
Ask 'WABA STATUS' ($G + $WABA + '?fields=id,name,account_review_status,status,currency,timezone_id')
Ask 'PHONE STATUS' ($G + $PHONE + '?fields=id,display_phone_number,verified_name,quality_rating,status,platform_type,code_verification_status')
Ask 'WABA FUNDING' ($G + $WABA + '?fields=primary_funding_id,account_review_status,owner_business_info')
Ask 'BUSINESS' ($G + $BIZ + '?fields=id,name,verification_status')
Ask 'PHONE NUMBERS + LIMITS' ($G + $WABA + '/phone_numbers?fields=display_phone_number,quality_rating,messaging_limit_tier,status,name_status')
Ask 'SUBSCRIBED APPS' ($G + $WABA + '/subscribed_apps')
