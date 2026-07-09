$ProgressPreference = 'SilentlyContinue'
$h = @{
  'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyODk5NiwiZXhwIjoyMDkyOTA0OTk2fQ.2hi_UCmFL9Cn4xvQKJRpna_JpWqqEVW8lJzhJ5h6ODw'
  'x-agent-secret' = 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
  'Content-Type' = 'application/json; charset=utf-8'
}

$bodyText = @"
أهلاً {{1}} 🍕 معاك المارد من مضمونة!

مطعمك يستاهل عملاء أكتر — مضمونة بتوفرلك: منيو أونلاين بالصور والأحجام، أوردرات على الواتساب، حماية كاملة، ودفع مستحقات سريع مع دعم 24/7.

التسجيل مجاني 100% والعمولة موحدة 10% على الأوردر الناجح بس.

سجّل مطعمك من هنا: madmonacairo.com/add-listing
أو رد بكلمة "مهتم" والمارد يمشيك خطوة بخطوة ✨

للإيقاف: STOP
"@

$payload = @{
  payload = @{
    name = 'madmona_restaurant_intro_v1'
    language = 'ar'
    category = 'MARKETING'
    components = @(
      @{ type = 'BODY'; text = $bodyText.Trim(); example = @{ body_text = ,@(,'حضرتك') } },
      @{ type = 'FOOTER'; text = 'Madmona Cairo' }
    )
  }
}
$json = $payload | ConvertTo-Json -Depth 8
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
try {
  $r = Invoke-RestMethod -Method Post -Uri 'https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/whatsapp-create-template' -Headers $h -Body $bytes -TimeoutSec 60
  Write-Host ('RESULT: ' + ($r | ConvertTo-Json -Depth 6 -Compress))
} catch {
  Write-Host ('ERROR: ' + $_.Exception.Message)
  if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message }
}
