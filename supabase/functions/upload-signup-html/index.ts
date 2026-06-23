import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    // Build the simple HTML form (basic, no JS, posts directly to quick-signup)
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Madmona</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Tahoma,sans-serif}
body{background:linear-gradient(135deg,#FAFAF7,#F0EDE5);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.box{background:white;max-width:480px;width:100%;border-radius:20px;padding:32px;box-shadow:0 10px 40px rgba(0,0,0,0.08)}
h1{color:#111;font-size:32px;font-weight:900;text-align:center;margin-bottom:8px}
h1 span{color:#1F5F3F}
.sub{text-align:center;color:#666;margin-bottom:24px;font-size:14px}
label{display:block;font-size:12px;font-weight:700;color:#444;margin:14px 0 6px}
input{width:100%;padding:13px 14px;background:#FAFAF7;border:1px solid #eee;border-radius:12px;font-size:15px;text-align:right}
input:focus{outline:none;background:white;border-color:#1F5F3F}
button{margin-top:20px;width:100%;padding:14px;background:#1F5F3F;color:white;border:none;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer}
.note{font-size:11px;color:#999;text-align:center;margin-top:10px}
#msg{padding:12px;border-radius:10px;margin-top:14px;font-size:14px;text-align:center;display:none}
#msg.show{display:block}
#msg.error{background:#FEE;color:#B00}
#msg.success{background:#d1fae5;color:#065}
</style>
</head>
<body>
<div class="box">
<h1>ابدأ <span>رحلتك</span></h1>
<p class="sub">🎁 سجل في 30 ثانية · 0% عمولة لأول 30 يوم</p>
<form id="f">
<label>👤 الاسم (الشخصي أو اسم الشركة)</label>
<input type="text" name="name" placeholder="محمد أحمد أو شركة..." required>
<label>📱 رقم التليفون</label>
<input type="tel" name="phone" placeholder="01XXXXXXXXX" required>
<label>📧 الإيميل</label>
<input type="email" name="email" placeholder="you@example.com" required>
<button type="submit" id="btn">🚀 ابدأ دلوقتي</button>
<div id="msg"></div>
<p class="note">باقي البيانات بس مع أول حجز</p>
</form>
</div>
<script>
document.getElementById('f').onsubmit=async e=>{
  e.preventDefault();
  const btn=document.getElementById('btn');
  const msg=document.getElementById('msg');
  btn.disabled=true;btn.textContent='جاري الإنشاء...';
  msg.className='';
  const fd=new FormData(e.target);
  try{
    const r=await fetch('${SUPABASE_URL}/functions/v1/quick-signup',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({phone:fd.get('phone'),name:fd.get('name'),email:fd.get('email'),intent:'supplier'})
    });
    const d=await r.json();
    if(d.ok){
      msg.className='show success';msg.textContent='✅ '+d.message;
      if(d.magic_link||d.login_link){setTimeout(()=>location.href=d.magic_link||d.login_link,2500)}
    }else{
      msg.className='show error';msg.textContent='❌ '+(d.message||'حصل خطأ');
      btn.disabled=false;btn.textContent='🚀 ابدأ دلوقتي';
    }
  }catch(err){
    msg.className='show error';msg.textContent='❌ خطأ في الاتصال';
    btn.disabled=false;btn.textContent='🚀 ابدأ دلوقتي';
  }
};
</script>
</body>
</html>`;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Try uploading to content-images (allows ALL mimetypes)
    const { data, error } = await admin.storage
      .from("content-images")
      .upload("signup.html", new Blob([html], { type: "text/html" }), {
        contentType: "text/html; charset=utf-8",
        upsert: true,
      });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
    }

    // Force update mimetype in storage.objects via RPC if possible
    return new Response(
      JSON.stringify({
        ok: true,
        url: `${SUPABASE_URL}/storage/v1/object/public/content-images/signup.html`,
        size: html.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
