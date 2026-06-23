import { createClient } from 'jsr:@supabase/supabase-js@2';
const KEY = 'sk_util_7b2f91ce4a';
const GV = 'v21.0';
const TPL = 'madmona_claim_invite_v1';
const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST, OPTIONS' };
function j(o:any,s=200){ return new Response(JSON.stringify(o),{status:s,headers:{...CORS,'Content-Type':'application/json'}}); }

Deno.serve(async (req) => {
  if (req.method==='OPTIONS') return new Response('ok',{headers:CORS});
  if (req.headers.get('x-util-key')!==KEY) return j({ok:false,error:'forbidden'},403);
  let b:any={}; try{ b=await req.json(); }catch{}
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: rows } = await sb.from('whatsapp_config').select('key,value');
  const m:Record<string,string> = Object.fromEntries((rows||[]).map((r:any)=>[r.key,r.value]));
  const token=m['access_token'], phone=m['phone_number_id'], waba=m['waba_id'];
  if (!token||!phone||!waba) return j({ok:false,error:'config_missing'},500);

  async function tplStatus(name:string){
    const r=await fetch(`https://graph.facebook.com/${GV}/${waba}/message_templates?limit=300`,{headers:{Authorization:`Bearer ${token}`}});
    const d=await r.json(); const t=(d.data||[]).find((x:any)=>x.name===name); return t?t.status:null;
  }
  async function sendClaim(to:string,name:string,tok:string){
    const payload={messaging_product:'whatsapp',to,type:'template',template:{name:TPL,language:{code:'ar'},components:[
      {type:'body',parameters:[{type:'text',text:name}]},
      {type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:tok}]}
    ]}};
    const r=await fetch(`https://graph.facebook.com/${GV}/${phone}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    return {ok:r.ok,data:await r.json()};
  }

  if (b.action==='templates'){
    const r=await fetch(`https://graph.facebook.com/${GV}/${waba}/message_templates?limit=300`,{headers:{Authorization:`Bearer ${token}`}});
    const data=await r.json();
    let list=(data.data||[]).map((t:any)=>({name:t.name,status:t.status,language:t.language,category:t.category,components:t.components}));
    if (Array.isArray(b.names)&&b.names.length) list=list.filter((t:any)=>b.names.includes(t.name));
    return j({ok:true,count:list.length,templates:list});
  }

  if (b.action==='create_template'){
    const r=await fetch(`https://graph.facebook.com/${GV}/${waba}/message_templates`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(b.template)});
    return j({ok:r.ok,status:r.status,response:await r.json()});
  }

  if (b.action==='send'){
    const payload={messaging_product:'whatsapp',to:b.to,type:'template',template:{name:b.template,language:{code:b.lang||'ar'},components:b.components||[]}};
    const r=await fetch(`https://graph.facebook.com/${GV}/${phone}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    return j({ok:r.ok,status:r.status,to:b.to,response:await r.json()});
  }

  if (b.action==='autosend'){
    const st=await tplStatus(TPL);
    if (st==='REJECTED'){ await sb.rpc('claim_autosend_cleanup'); return j({ok:false,rejected:true}); }
    if (st!=='APPROVED'){ return j({ok:true,waiting:true,status:st}); }
    const { data: pend } = await sb.from('claim_outreach_log').select('*').eq('sent',false);
    const results:any[]=[];
    for (const row of (pend||[])){
      try{
        const res=await sendClaim(row.phone,row.name,row.token);
        if (res.ok){
          const mid=res.data?.messages?.[0]?.id||null;
          await sb.from('claim_outreach_log').update({sent:true,wa_message_id:mid,sent_at:new Date().toISOString(),error:null}).eq('id',row.id);
          results.push({name:row.name,ok:true,id:mid});
        } else {
          const err=JSON.stringify(res.data?.error||res.data).slice(0,400);
          await sb.from('claim_outreach_log').update({error:err}).eq('id',row.id);
          results.push({name:row.name,ok:false,error:err});
        }
      }catch(e){ results.push({name:row.name,ok:false,error:String(e).slice(0,200)}); }
    }
    const { count } = await sb.from('claim_outreach_log').select('*',{count:'exact',head:true}).eq('sent',false);
    if ((count||0)===0){ await sb.rpc('claim_autosend_cleanup'); }
    return j({ok:true,sent_now:results.filter(r=>r.ok).length,results,remaining:count||0});
  }

  return j({ok:false,error:'unknown_action'},400);
});
