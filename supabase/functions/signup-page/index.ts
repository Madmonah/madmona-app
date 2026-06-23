// Madmona — Hosted Quick Signup Page (HTML Edge Function)
// Serves a complete signup form at /functions/v1/signup-page
// Form posts to /functions/v1/quick-signup (which we already deployed)

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>مضمونة · ابدأ رحلتك</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Cairo', system-ui, sans-serif;
  background: linear-gradient(135deg, #FAFAF7 0%, #F5F5F0 50%, #FAFAF7 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
}
.blob1 { position: fixed; top: -100px; right: -100px; width: 500px; height: 500px; background: rgba(31, 95, 63, 0.05); border-radius: 50%; filter: blur(80px); pointer-events: none; }
.blob2 { position: fixed; bottom: -100px; left: -100px; width: 400px; height: 400px; background: rgba(184, 134, 11, 0.05); border-radius: 50%; filter: blur(80px); pointer-events: none; }
.container { flex: 1; display: flex; align-items: center; justify-content: center; padding: 20px; position: relative; z-index: 1; }
.card-wrap { width: 100%; max-width: 440px; }
.header { text-align: center; margin-bottom: 24px; }
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-radius: 100px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin-bottom: 16px; }
.badge-icon { color: #B8860B; font-size: 12px; }
.badge-text { font-size: 12px; font-weight: 700; color: #444; }
.title { font-size: 36px; font-weight: 900; color: #111; line-height: 1.1; letter-spacing: -0.02em; }
.title .accent { background: linear-gradient(135deg, #1F5F3F 0%, #2d8a5d 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { font-size: 14px; color: #888; margin-top: 8px; }
.card { background: white; border-radius: 24px; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.08); }
@media (min-width: 768px) { .card { padding: 36px; } }
.tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px; background: #FAFAF7; border-radius: 16px; margin-bottom: 24px; }
.tab { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; border-radius: 12px; font-weight: 700; font-size: 13px; transition: all 0.2s; cursor: pointer; border: none; background: transparent; color: #888; font-family: inherit; }
.tab.active { background: white; color: #1F5F3F; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.field { margin-bottom: 16px; }
.field-label { font-size: 11px; font-weight: 700; color: #444; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.field-label .icon { color: #1F5F3F; font-size: 14px; }
.field-input { width: 100%; padding: 14px 16px; background: #FAFAF7; border: 1px solid #f0f0f0; border-radius: 14px; font-size: 15px; font-weight: 500; font-family: inherit; transition: all 0.2s; outline: none; text-align: right; }
.field-input:focus { background: white; border-color: rgba(31, 95, 63, 0.4); box-shadow: 0 0 0 4px rgba(31, 95, 63, 0.1); }
.field-input[type="tel"], .field-input[type="email"] { direction: ltr; }
.field-hint { font-size: 11px; color: #999; margin-top: 6px; line-height: 1.5; }
.error-box { display: flex; align-items: flex-start; gap: 8px; padding: 14px; background: #FEE; border: 1px solid #FCC; border-radius: 14px; color: #B00; font-size: 13px; margin-bottom: 14px; }
.success-box { padding: 32px; text-align: center; background: white; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.08); }
.check-icon { width: 64px; height: 64px; background: #d1fae5; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 32px; }
.btn { width: 100%; padding: 16px; background: #1F5F3F; color: white; border: none; border-radius: 14px; font-weight: 700; font-size: 15px; font-family: inherit; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(31, 95, 63, 0.2); display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(31, 95, 63, 0.3); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.note { font-size: 11px; color: #999; text-align: center; line-height: 1.6; margin-top: 12px; }
.divider { margin-top: 24px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center; }
.divider-text { font-size: 13px; color: #666; margin-bottom: 6px; }
.divider-link { color: #1F5F3F; font-weight: 700; text-decoration: none; }
.divider-link:hover { text-decoration: underline; }
.footer-note { text-align: center; font-size: 11px; color: #888; margin-top: 20px; }
.footer-note a { color: #1F5F3F; font-weight: 600; text-decoration: none; }
.spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.animate-in { animation: scaleIn 0.3s ease-out; }
.hidden { display: none !important; }
</style>
</head>
<body>
<div class="blob1"></div>
<div class="blob2"></div>

<div class="container">
  <div class="card-wrap">
    <!-- Form view -->
    <div id="form-view">
      <div class="header">
        <div class="badge"><span class="badge-icon">✨</span><span class="badge-text">انضم لمضمونة</span></div>
        <h1 class="title">ابدأ <span class="accent">رحلتك</span></h1>
        <p class="subtitle" id="subtitle">3 خطوات بس وابدأ تنشر إعلاناتك</p>
      </div>

      <div class="card">
        <div class="tabs">
          <button type="button" class="tab active" data-intent="supplier">🏢 عندي حاجة أأجرها</button>
          <button type="button" class="tab" data-intent="customer">🔍 عايز أأجر</button>
        </div>

        <form id="signup-form">
          <div class="field">
            <label class="field-label"><span class="icon">👤</span><span id="name-label">الاسم (الشخصي أو اسم الشركة)</span></label>
            <input class="field-input" type="text" name="name" id="name-input" placeholder="محمد أحمد أو شركة المساحات" required>
          </div>
          <div class="field">
            <label class="field-label"><span class="icon">📱</span><span>رقم التليفون</span></label>
            <input class="field-input" type="tel" name="phone" placeholder="01XXXXXXXXX" autocomplete="tel" required>
          </div>
          <div class="field">
            <label class="field-label"><span class="icon">📧</span><span>الإيميل</span></label>
            <input class="field-input" type="email" name="email" placeholder="you@example.com" autocomplete="email" required>
            <p class="field-hint">💡 محتاجينه عشان نتواصل معاك</p>
          </div>

          <div id="error" class="error-box hidden"></div>

          <button type="submit" id="submit-btn" class="btn">
            <span id="submit-text">🚀 ابدأ تنشر إعلاناتي</span>
          </button>

          <p class="note" id="note">🎁 0% عمولة لأول 30 يوم · باقي البيانات بس مع أول حجز</p>
        </form>

        <div class="divider">
          <p class="divider-text">عندك حساب بالفعل؟</p>
          <a href="https://www.madmonacairo.com/auth/login" class="divider-link">سجّل دخولك →</a>
        </div>
      </div>

      <p class="footer-note">محتاج مساعدة؟ <a href="https://wa.me/201002229982">ابعت واتساب</a></p>
    </div>

    <!-- Success view -->
    <div id="success-view" class="hidden">
      <div class="success-box animate-in">
        <div class="check-icon">✅</div>
        <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 8px;">تم إنشاء حسابك! 🎉</h1>
        <p style="color: #666; line-height: 1.6; margin-bottom: 24px;" id="success-msg">
          بعتنالك لينك دخول على الواتساب. اضغطه وابدأ.
        </p>
        <a id="success-link" href="#" class="btn" style="text-decoration: none;">
          📥 ادخل دلوقتي
        </a>
      </div>
    </div>
  </div>
</div>

<script>
let currentIntent = 'supplier';
const SIGNUP_URL = 'https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/quick-signup';

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentIntent = tab.dataset.intent;
    
    // Update labels based on intent
    if (currentIntent === 'supplier') {
      document.getElementById('name-label').textContent = 'الاسم (الشخصي أو اسم الشركة)';
      document.getElementById('name-input').placeholder = 'محمد أحمد أو شركة المساحات';
      document.getElementById('subtitle').textContent = '3 خطوات بس وابدأ تنشر إعلاناتك';
      document.getElementById('submit-text').textContent = '🚀 ابدأ تنشر إعلاناتي';
      document.getElementById('note').textContent = '🎁 0% عمولة لأول 30 يوم · باقي البيانات مع أول حجز';
    } else {
      document.getElementById('name-label').textContent = 'الاسم بالكامل';
      document.getElementById('name-input').placeholder = 'محمد أحمد';
      document.getElementById('subtitle').textContent = '3 خطوات بس وابدأ تحجز فوراً';
      document.getElementById('submit-text').textContent = '✨ إنشاء حسابي';
      document.getElementById('note').textContent = 'الحجز أسرع وأأمن';
    }
  });
});

// Form submission
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const errBox = document.getElementById('error');
  const submitBtn = document.getElementById('submit-btn');
  const submitText = document.getElementById('submit-text');
  
  errBox.classList.add('hidden');
  submitBtn.disabled = true;
  submitText.innerHTML = '<span class="spinner"></span> جاري الإنشاء...';

  try {
    const res = await fetch(SIGNUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: formData.get('phone'),
        name: formData.get('name'),
        email: formData.get('email'),
        intent: currentIntent
      })
    });
    const data = await res.json();

    if (data.ok) {
      // Show success
      document.getElementById('form-view').classList.add('hidden');
      document.getElementById('success-view').classList.remove('hidden');
      
      const successMsg = document.getElementById('success-msg');
      const successLink = document.getElementById('success-link');
      
      if (data.existing) {
        successMsg.textContent = 'أنت معاك حساب بالفعل! بعتنالك لينك دخول على الواتساب.';
      } else {
        successMsg.textContent = 'بعتنالك لينك دخول على الواتساب. اضغطه وابدأ تنشر إعلاناتك.';
      }
      
      if (data.magic_link || data.login_link) {
        successLink.href = data.magic_link || data.login_link;
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          window.location.href = data.magic_link || data.login_link;
        }, 3000);
      }
    } else {
      errBox.textContent = '⚠️ ' + (data.message || 'حصل خطأ');
      errBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitText.textContent = currentIntent === 'supplier' ? '🚀 ابدأ تنشر إعلاناتي' : '✨ إنشاء حسابي';
    }
  } catch (err) {
    errBox.textContent = '⚠️ مفيش انترنت أو حصل خطأ. حاول تاني.';
    errBox.classList.remove('hidden');
    submitBtn.disabled = false;
    submitText.textContent = currentIntent === 'supplier' ? '🚀 ابدأ تنشر إعلاناتي' : '✨ إنشاء حسابي';
  }
});
</script>
</body>
</html>`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
