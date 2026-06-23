// list-wa-templates: يجيب كل الـ templates وحالاتهم
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const { data: configRows } = await sb.from('whatsapp_config').select('key, value')
  const config = Object.fromEntries((configRows || []).map((r: any) => [r.key, r.value]))
  
  const wabaId = config.waba_id
  const accessToken = config.access_token
  
  const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates?fields=name,status,category,language&limit=100`
  const r = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  const data = await r.json()
  
  // Just return the templates with their statuses
  const templates = (data?.data || []).map((t: any) => ({
    name: t.name,
    status: t.status,
    category: t.category,
    language: t.language
  }))
  
  const summary = {
    total: templates.length,
    approved: templates.filter((t: any) => t.status === 'APPROVED').length,
    pending: templates.filter((t: any) => t.status === 'PENDING').length,
    rejected: templates.filter((t: any) => t.status === 'REJECTED').length,
    templates
  }
  
  return new Response(JSON.stringify(summary, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  })
})
