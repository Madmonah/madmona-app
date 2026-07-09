// Madmona Quick Signup Edge Function v4
// 3 fields only: phone + name + email → creates supplier account + magic link
// v2: Force redirect to production URL (workaround for Supabase Site URL config)
// v4 (4 Jul 2026): New warm welcome messages — unified 10% commission + B2B subscription
// v5 (4 Jul 2026): CRM/ERP is NOT free — monthly subscription (بالاتفاق). Commission separate from subscription.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PROD_URL = "https://www.madmonacairo.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function normalizePhone(p) {
  let phone = (p || "").trim().replace(/[\s\-()]/g, "");
  if (phone.startsWith("00")) phone = "+" + phone.slice(2);
  if (phone.startsWith("0") && !phone.startsWith("+")) phone = "+2" + phone;
  if (phone.startsWith("20") && !phone.startsWith("+")) phone = "+" + phone;
  if (!phone.startsWith("+")) phone = "+" + phone;
  return phone;
}

function generateRandomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let pwd = "";
  for (let i = 0; i < 24; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// Force redirect_to to production URL (works around Supabase Site URL config)
function forceProductionRedirect(magicLink, targetPath) {
  if (!magicLink) return magicLink;
  try {
    const u = new URL(magicLink);
    const target = PROD_URL + (targetPath || "/marketplace");
    u.searchParams.set("redirect_to", target);
    return u.toString();
  } catch (_) {
    return magicLink;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, name, email, intent } = await req.json();

    if (!phone || !name || !email) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "missing_fields",
          message: "محتاج: التليفون، الاسم، والإيميل",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normPhone = normalizePhone(phone);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const userIntent = intent || "supplier";
    const targetPath = userIntent === "supplier" ? "/supplier/marketplace/new?welcome=1" : "/marketplace";

    if (!cleanEmail.includes("@")) {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_email", message: "الإيميل غير صحيح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (normPhone.length < 10) {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_phone", message: "رقم التليفون غير صحيح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if email exists
    const { data: existingByEmail } = await admin
      .from("profiles")
      .select("id, full_name, phone, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingByEmail) {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: cleanEmail,
      });
      const link = forceProductionRedirect(linkData?.properties?.action_link, "/account");

      if (link && existingByEmail.phone) {
        await admin.from("whatsapp_outbound_queue").insert({
          recipient_phone: existingByEmail.phone,
          recipient_name: existingByEmail.full_name || cleanName,
          message: `أهلاً ${existingByEmail.full_name || cleanName}! 👋\n\nإنت أصلاً واحد مننا — عندك حساب على مضمونة. 😄\nاضغط اللينك ده وهتدخل على طول من غير باسورد:\n\n${link}\n\nولو واقف معاك أي حاجة، رد على الرسالة دي وهنساعدك فورًا 🤝\n\n— مضمونة · معاملاتك مضمونة 💚`,
          status: "pending",
          agent_name: "quick-signup",
          campaign: "existing_user_login_link",
          metadata: { user_id: existingByEmail.id },
        });
      }

      return new Response(
        JSON.stringify({
          ok: true,
          existing: true,
          message: "أنت معاك حساب بالفعل! بعتنالك لينك دخول على الواتساب.",
          login_link: link,
          user_id: existingByEmail.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if phone is taken
    const { data: existingByPhone } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("phone", normPhone)
      .maybeSingle();

    if (existingByPhone) {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: existingByPhone.email,
      });
      const link = forceProductionRedirect(linkData?.properties?.action_link, "/account");

      if (link) {
        await admin.from("whatsapp_outbound_queue").insert({
          recipient_phone: normPhone,
          recipient_name: existingByPhone.full_name || cleanName,
          message: `أهلاً ${existingByPhone.full_name || cleanName}! 👋\n\nرقمك ده متسجل عندنا قبل كده بإيميل ${existingByPhone.email} — يعني إنت من أهل البيت. 😄\nاضغط اللينك وهتدخل حسابك على طول:\n\n${link}\n\nمحتاج تغيّر أي بيانات؟ رد على الرسالة دي وإحنا معاك 🤝\n\n— مضمونة · معاملاتك مضمونة 💚`,
          status: "pending",
          agent_name: "quick-signup",
          campaign: "existing_user_login_link",
          metadata: { user_id: existingByPhone.id },
        });
      }

      return new Response(
        JSON.stringify({
          ok: true,
          existing: true,
          message: `الرقم ده مسجل بالفعل. بعتنالك لينك دخول على الواتساب.`,
          existing_email: existingByPhone.email,
          login_link: link,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user
    const password = generateRandomPassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      phone: normPhone,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        phone: normPhone,
        signup_method: "quick_signup_v2",
        signup_intent: userIntent,
      },
    });

    if (createErr || !created.user) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "create_failed",
          message: "حصل خطأ أثناء إنشاء الحساب",
          details: createErr?.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = created.user.id;

    await admin
      .from("profiles")
      .update({ full_name: cleanName, email: cleanEmail })
      .eq("id", userId);

    if (userIntent === "supplier") {
      await admin.from("marketplace_suppliers").insert({
        profile_id: userId,
        business_name: cleanName,
        kyc_status: "pending",
        account_type: "individual",
      });
    }

    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: cleanEmail,
    });

    const magicLink = forceProductionRedirect(linkData?.properties?.action_link, targetPath);

    if (magicLink) {
      await admin.from("whatsapp_outbound_queue").insert({
        recipient_phone: normPhone,
        recipient_name: cleanName,
        message:
          `أهلاً ${cleanName}! 🎉\n\n` +
          `نوّرت مضمونة — حسابك اتعمل وجاهز.\n` +
          `اضغط اللينك ده وهتدخل على طول من غير باسورد:\n\n` +
          `${magicLink}\n\n` +
          `جوه هتنشر إعلانك في دقايق (صور + سعر + مواعيد)، وتاخد معاه:\n` +
          `🛡️ حماية كاملة لكل معاملة — حقك محفوظ\n` +
          `💰 عمولة موحدة 10% بس على الصفقة الناجحة — النشر ببلاش، ومتدفعش غير لما تكسب\n` +
          `⚡ مستحقاتك بتوصلك بسرعة + دعم مستمر 24/7\n\n` +
          `⭐ وعايز تدير شغلك كله من مكان واحد (عملاء، حجوزات، فلوس، فريق، فروع)؟ في نظام إدارة متكامل CRM + ERP باشتراك شهري بالاتفاق — اسألنا عليه.\n\n` +
          `أي سؤال؟ رد على الرسالة دي وهنساعدك فورًا 🤝\n\n— مضمونة · معاملاتك مضمونة 💚`,
        status: "pending",
        agent_name: "quick-signup",
        campaign: "magic_link_welcome",
        metadata: { user_id: userId, intent: userIntent },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user_id: userId,
        message: "تم! بعتنالك لينك دخول على الواتساب. اضغطه وابدأ تنشر إعلاناتك.",
        magic_link: magicLink,
        next_step: targetPath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "exception",
        message: "خطأ غير متوقع",
        details: String(e),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
