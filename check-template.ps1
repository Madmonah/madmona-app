$ProgressPreference = 'SilentlyContinue'
$h = @{
  'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyODk5NiwiZXhwIjoyMDkyOTA0OTk2fQ.2hi_UCmFL9Cn4xvQKJRpna_JpWqqEVW8lJzhJ5h6ODw'
  'x-agent-secret' = 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
  'Content-Type' = 'application/json'
}
try {
  $r = Invoke-RestMethod -Method Post -Uri 'https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/whatsapp-list-templates' -Headers $h -TimeoutSec 60
} catch {
  $r = Invoke-RestMethod -Method Get -Uri 'https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/whatsapp-list-templates' -Headers $h -TimeoutSec 60
}
$json = $r | ConvertTo-Json -Depth 10 -Compress
# print only the v3 template section
$templates = $null
if ($r.templates) { $templates = $r.templates } elseif ($r.data) { $templates = $r.data } else { $templates = $r }
foreach ($t in $templates) {
  if ($t.name -like '*intro_outreach_v3*') {
    Write-Host ('NAME: ' + $t.name + ' | STATUS: ' + $t.status + ' | LANG: ' + $t.language)
    foreach ($c in $t.components) {
      Write-Host ('--- ' + $c.type + ' ---')
      if ($c.text) { Write-Host $c.text }
    }
  }
}
