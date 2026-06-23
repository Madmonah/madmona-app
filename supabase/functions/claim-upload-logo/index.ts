import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS' };
const J = (o:any,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...CORS,'Content-Type':'application/json'}});
const EXT:Record<string,string> = {'image/png':'png','image/jpeg':'jpg','image/jpg':'jpg','image/webp':'webp'};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:CORS});
  if (req.method !== 'POST') return J({ok:false,error:'method'},405);

  const auth = req.headers.get('Authorization') || '';
  if (!auth) return J({ok:false,error:'login_required'},401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global:{ headers:{ Authorization: auth } } });
  const { data: ures } = await anon.auth.getUser();
  const uid = ures?.user?.id;
  if (!uid) return J({ok:false,error:'invalid_session'},401);

  let body:any; try { body = await req.json(); } catch { return J({ok:false,error:'bad_json'},400); }
  const { token, content_base64, content_type } = body || {};
  if (!token || !content_base64) return J({ok:false,error:'missing'},400);
  const ext = EXT[String(content_type||'').toLowerCase()];
  if (!ext) return J({ok:false,error:'type_not_allowed'},400);

  const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: claim } = await svc.from('listing_claims').select('listing_id,status').eq('token', token).maybeSingle();
  if (!claim) return J({ok:false,error:'invalid_token'},404);
  if (claim.status !== 'pending') return J({ok:false,error:'already_'+claim.status},409);

  const bin = Uint8Array.from(atob(content_base64), c=>c.charCodeAt(0));
  if (bin.length > 5*1024*1024) return J({ok:false,error:'too_large'},413);
  const path = `listings/logos/${claim.listing_id}.${ext}`;
  const up = await svc.storage.from('ads').upload(path, bin, { contentType: content_type, upsert: true });
  if (up.error) return J({ok:false,error:up.error.message},500);
  const pub = `${url}/storage/v1/object/public/ads/${path}`;

  const { data: fin, error: ferr } = await svc.rpc('finalize_listing_claim', { p_token: token, p_uid: uid, p_logo_url: pub, p_logo_path: path });
  if (ferr) return J({ok:false,error:ferr.message},500);
  return J({ ...(fin||{}), logo_url: pub });
});
