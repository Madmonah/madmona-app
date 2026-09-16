// ✏️ تعديل كابشن رسالة في قناة تليجرام — التوكن بييجي من الداتابيز زي _tg_auto.cjs
const fs = require('fs')
function loadEnv(){const env={};for(const f of ['E:/madmona-app/.env.local','E:/madmona-app/.env']){if(!fs.existsSync(f))continue;for(const line of fs.readFileSync(f,'utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'').trim()}}return env}
;(async()=>{
  const env=loadEnv()
  const url=env.NEXT_PUBLIC_SUPABASE_URL||env.SUPABASE_URL, key=env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVICE_KEY
  const rows=await fetch(`${url}/rest/v1/whatsapp_config?key=eq.telegram_bot_token&select=value`,{headers:{apikey:key,authorization:`Bearer ${key}`}}).then(r=>r.json())
  const token=rows[0].value
  for(const pair of process.argv.slice(2)){
    const [id,slug]=pair.split(':')
    const cap=fs.readFileSync(`output/caption-${slug}-telegram.txt`,'utf8')
    const r=await fetch(`https://api.telegram.org/bot${token}/editMessageCaption`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:'@madmona_cairo',message_id:Number(id),caption:cap})})
    const j=await r.json()
    console.log('EDIT',id,slug,j.ok?'OK':String(j.description).slice(0,70))
  }
})().catch(e=>{console.error('ERR',e.message);process.exit(1)})
