$O = 'C:\Users\solutions\AppData\Roaming\Claude\local-agent-mode-sessions\b4c8f83c-bfd2-4d1f-a7fa-bfb88a9ebea8\7327d46d-6790-4c13-8b1a-9aee6e2447a3\local_4f4ba56b-2cfb-4d83-8fe8-624b6fdf9a43\outputs'
$B = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/wa-inbound/'
$m = @{
  'ivy-a.jpg' = '1783844115743-ZEMTQ3NjMA.jpg'
  'ivy-b.jpg' = '1783844179949-Q2NENFMjUA.jpg'
  'ivy-c.jpg' = '1783844182572-g2MjRENUEA.jpg'
  'ivy-d.jpg' = '1783864599643-lENTE3MzkA.jpg'
  'ivy-e.jpg' = '1783948765006-UyQTM3NUQA.jpg'
}
foreach ($k in $m.Keys) {
  try { Invoke-WebRequest -Uri ($B + $m[$k]) -OutFile (Join-Path $O $k) -EA Stop; Write-Host "OK $k" }
  catch { Write-Host "FAIL $k" }
}
