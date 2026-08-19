// src/app/admin/ai-assistant/page.tsx
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — محمد: "نوحد الموديل ونشيل الورك-فلو اللي بين الاجينتس"
// كان المساعد ده بيترجم أوامر بالعامية لخطط تشغيل ضد ٤٦ أجينت وهمي
// (agent_registry) وكان بيكتب في agent_workflows — كلهم اتمسحوا. الصفحة
// بقت إشعار بسيط.
// ============================================================================

export default function AIAssistantRemovedNotice() {
  return (
    <div dir="rtl" style={{
      fontFamily: 'Tahoma, Arial, sans-serif',
      background: '#FAFAF7',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 520,
        background: '#fff',
        border: '1px solid #eee',
        borderRadius: 16,
        padding: 32,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧹</div>
        <h1 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 8px', color: '#111' }}>
          المساعد الذكي اتشال
        </h1>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.8, margin: 0 }}>
          كان بيترجم أوامرك لخطط تشغيل ضد أجينتس وهمية مش موجودة فعليًا.
          اتشال بأمر محمد ١٩ أغسطس ٢٠٢٦ ضمن تنضيف نظام الاجينتس بالكامل.
          للتواصل المباشر مع المارد، استخدم شات الواتساب.
        </p>
        <a href="/admin/hq" style={{
          display: 'inline-block', marginTop: 20, padding: '10px 20px',
          background: '#059669', color: '#fff', borderRadius: 10,
          fontSize: 13, fontWeight: 700, textDecoration: 'none',
        }}>
          الرجوع لمركز القيادة
        </a>
      </div>
    </div>
  )
}
