$O = 'C:\Users\solutions\AppData\Roaming\Claude\local-agent-mode-sessions\b4c8f83c-bfd2-4d1f-a7fa-bfb88a9ebea8\7327d46d-6790-4c13-8b1a-9aee6e2447a3\local_4f4ba56b-2cfb-4d83-8fe8-624b6fdf9a43\outputs'
$B = 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/wa-inbound/'
$m = @{
  'img-glowterra-1.jpg' = '1783844261194-QzM0JERDMA.jpg'
  'img-glowterra-2.jpg' = '1783844260324-NEM0U4NDcA.jpg'
  'img-royal-1.jpg'     = '1783942238168-U0MjMxOQA.jpg'
  'img-royal-2.jpg'     = '1783942238245-I3RDY5RAA.jpg'
  'img-fivepalm.jpg'    = '1783871354208-E2NTg1QTYA.jpg'
  'img-noll.jpg'        = '1783810732014-g4MTQ0QzYA.jpg'
  'img-helio.jpg'       = '1783810441277-VCRjBEQzAA.jpg'
}
foreach ($k in $m.Keys) {
  try {
    Invoke-WebRequest -Uri ($B + $m[$k]) -OutFile (Join-Path $O $k) -ErrorAction Stop
    Write-Host "OK $k"
  } catch { Write-Host "FAIL $k" }
}
