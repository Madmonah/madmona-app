// صفحة الإيقاف — بتظهر للمورد الموقوف
export default function SuspendedPage() {
  return (
    <div dir="rtl" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FAFAF7', fontFamily: "'Cairo', sans-serif", padding: 16,
    }}>
      <div style={{
        maxWidth: 480, textAlign: 'center', background: 'rgba(255,255,255,.9)',
        borderRadius: 20, padding: '40px 32px', boxShadow: '0 4px 24px rgba(250, 129, 37,.1)',
        border: '1px solid rgba(250, 129, 37,.12)',
      }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>⏸️</div>
        <h1 style={{ color: '#059669', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
          هذا الحساب موقوف مؤقتاً
        </h1>
        <p style={{ color: '#555', lineHeight: 1.8, margin: '0 0 20px' }}>
          الخدمة متوقفة لحين تجديد الاشتراك مع مضمونة.
          <br />لو أنت صاحب النشاط، تواصل معانا لإعادة التفعيل فوراً.
        </p>
        <a href="https://wa.me/201026222337" style={{
          display: 'inline-block', background: 'linear-gradient(90deg,#2FA084,#059669)',
          color: '#fff', borderRadius: 999, padding: '12px 32px', fontWeight: 700,
          textDecoration: 'none',
        }}>تواصل واتساب</a>
        <p style={{ color: '#999', fontSize: 13, marginTop: 20 }}>معاملاتك مضمونة · madmonacairo.com</p>
      </div>
    </div>
  );
}
