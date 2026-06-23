// Force HTML rendering by overriding CSP
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const html = (msg = "", error = false) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Madmona</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Tahoma,Arial,sans-serif}
body{background:linear-gradient(135deg,#FAFAF7,#F0EDE5);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.box{background:white;max-width:480px;width:100%;border-radius:20px;padding:32px;box-shadow:0 10px 40px rgba(0,0,0,0.08)}
h1{color:#111;font-size:32px;font-weight:900;text-align:center;margin-bottom:8px}
h1 span{color:#1F5F3F}
.sub{text-align:center;color:#666;margin-bottom:24px;font-size:14px}
label{display:block;font-size:12px;font-weight:700;color:#444;margin:14px 0 6px}
input{width:100%;padding:13px 14px;background:#FAFAF7;border:1px solid #eee;border-radius:12px;font-size:15px;font-family:inherit;text-align:right}
input:focus{outline:none;background:white;border-color:#1F5F3F}
button{margin-top:20px;width:100%;padding:14px;background:#1F5F3F;color:white;border:none;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit}
button:hover{background:#2d8a5d}
.note{font-size:11px;color:#999;text-align:center;margin-top:10px}
.msg{padding:12px;border-radius:10px;margin-bottom:14px;font-size:14px;text-align:center}
.msg.error{background:#FEE;color:#B00}
.msg.success{background:#d1fae5;color:#065}
</style>
</head>
<body>
<div class="box">
<h1>ابدأ <span>رحلتك</span></h1>
<p class="sub">🎁 0% عمولة لأول 30 يوم</p>
${msg ? `<div class="msg ${error ? 'error' : 'success'}">${msg}</div>` : ''}
<form method="POST" action="">
<input type="hidden" name="intent" value="supplier">
<label>👤 الاسم</label>
<input type="text" name="name" placeholder="محمد أحمد أو شركة المساحات" required>
<label>📱 رقم التليفون</label>
<input type="tel" name="phone" placeholder="01XXXXXXXXX" required>
<label>📧 الإيميل</label>
<input type="email" name="email" placeholder="you@example.com" required>
<button type="submit">🚀 ابدأ دلوقتي</button>
<p class="note">باقي البيانات بس مع أول حجز</p>
</form>
</div>
</body>
</html>`;

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; script-src * 'unsafe-inline' 'unsafe-eval'",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return new Response(html(), { headers });
  }
  if (req.method === "POST") {
    try {
      const body = await req.formData();
      const phone = body.get("phone")?.toString() || "";
      const name = body.get("name")?.toString() || "";
      const email = body.get("email")?.toString() || "";
      const intent = body.get("intent")?.toString() || "supplier";

      const res = await fetch(`${SUPABASE_URL}/functions/v1/quick-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name, email, intent }),
      });
      const data = await res.json();

      if (data.ok) {
        const link = data.magic_link || data.login_link || "https://www.madmonacairo.com";
        return new Response(
          `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url=${link}"></head><body><a href="${link}">اضغط هنا</a></body></html>`,
          { headers, status: 200 }
        );
      } else {
        return new Response(html(data.message || "حصل خطأ", true), { headers });
      }
    } catch (e) {
      return new Response(html("خطأ في الاتصال", true), { headers });
    }
  }
  return new Response("Method not allowed", { status: 405 });
});
