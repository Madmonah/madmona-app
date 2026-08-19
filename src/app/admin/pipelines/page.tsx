// src/app/admin/pipelines/page.tsx
// ============================================================================
// ١٩ أغسطس ٢٠٢٦ — محمد: "نوحد الموديل ونشيل الورك-فلو اللي بين الاجينتس"
// كانت الصفحة دي (Pipelines Command Center) بتورّي سيناريوهات JSON بتربط
// ١٨ "أجينت" وهمي من agent_registry (اتمسح مع تنضيف الاجينتس). صفر تشغيل
// حقيقي من ١١ يونيو ٢٠٢٦. اتمسح agent_pipelines/pipeline_runs/
// pipeline_step_runs بالكامل من الداتابيز، والصفحة بقت إشعار بسيط.
// ============================================================================

export default function PipelinesRemovedNotice() {
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
          الـ Pipelines اتشالت
        </h1>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.8, margin: 0 }}>
          كانت الصفحة دي بتدير سيناريوهات مربوطة بأجينتس وهمية (agent_registry) —
          مفيش تشغيل حقيقي فيها من شهرين. اتشالت بأمر محمد ١٩ أغسطس ٢٠٢٦ ضمن
          تنضيف "الورك-فلو اللي بين الاجينتس".
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
