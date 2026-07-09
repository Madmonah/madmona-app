$ProgressPreference = 'SilentlyContinue'
$h = @{
  'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyODk5NiwiZXhwIjoyMDkyOTA0OTk2fQ.2hi_UCmFL9Cn4xvQKJRpna_JpWqqEVW8lJzhJ5h6ODw'
  'x-agent-secret' = 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
  'Content-Type' = 'application/json'
}
$r = Invoke-RestMethod -Method Post -Uri 'https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/marid-restaurant-agent?dry=1' -Headers $h -TimeoutSec 120
Write-Host ("ok=" + $r.ok + " dry=" + $r.dry + " template=" + $r.template)
Write-Host ("harvest_candidates=" + $r.harvested)
$r.log | ForEach-Object { Write-Host ($_ | ConvertTo-Json -Compress) }
