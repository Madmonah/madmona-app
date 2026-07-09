$ProgressPreference = 'SilentlyContinue'
$h = @{
  'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyODk5NiwiZXhwIjoyMDkyOTA0OTk2fQ.2hi_UCmFL9Cn4xvQKJRpna_JpWqqEVW8lJzhJ5h6ODw'
  'x-agent-secret' = 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
  'Content-Type' = 'application/json'
}
# refresh status first
$b = '{"template_name":"madmona_restaurant_intro_v1"}'
try { $r1 = Invoke-RestMethod -Method Post -Uri 'https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/refresh-template-status' -Headers $h -Body $b -TimeoutSec 60 } catch { $r1 = @{ err = $_.Exception.Message } }

# list templates and extract ours
try {
  $r2 = Invoke-RestMethod -Method Post -Uri 'https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/whatsapp-list-templates' -Headers $h -TimeoutSec 60
} catch {
  $r2 = Invoke-RestMethod -Method Get -Uri 'https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/whatsapp-list-templates' -Headers $h -TimeoutSec 60
}
$templates = if ($r2.templates) { $r2.templates } elseif ($r2.data) { $r2.data } else { $r2 }
$mine = $templates | Where-Object { $_.name -eq 'madmona_restaurant_intro_v1' }
$out = @{ refresh = $r1; template = $mine } | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText('E:\madmona-app\template-check.json', $out, [System.Text.Encoding]::UTF8)
Write-Host 'WRITTEN'
