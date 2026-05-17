'use client'

import Link from 'next/link'
import {
  Building,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

// ============================================================
// Supplier dashboard — placeholder/coming-soon page.
// Full supplier auth flow + unit CRUD will be Iteration 4.
// For now this just gives suppliers a confirmation that we received
// their signup and explains next steps.
// ============================================================

export default function SupplierDashboardPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-[#1F6F5F]">مضمونة | للي بيأجروا معانا</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
          <div className="flex items-center justify-center w-14 h-14 bg-[#1F6F5F]/10 rounded-full mx-auto mb-4">
            <Clock className="w-7 h-7 text-[#1F6F5F]" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">قريباً</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            لوحة تحكم أجر معانا قيد التطوير. لو سجلت معانا، فريقنا هيتواصل معاك على الواتساب لتفعيل حسابك وإضافة وحداتك.
          </p>

          <div className="bg-[#FAFAF7] rounded-xl p-4 mb-6 text-right">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 justify-end">
              <span>الخطوات الجاية</span>
              <CheckCircle className="w-4 h-4 text-[#1F6F5F]" />
            </h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-[#1F6F5F]">١.</span>
                <span>هنراجع طلبك خلال ٢٤ ساعة</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[#1F6F5F]">٢.</span>
                <span>هنتواصل معاك لتأكيد البيانات</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[#1F6F5F]">٣.</span>
                <span>هنضيف وحداتك على الموقع</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[#1F6F5F]">٤.</span>
                <span>تبدأ تستقبل حجوزات</span>
              </li>
            </ol>
          </div>

          <div className="space-y-2 text-sm">
            <a
              href="https://wa.me/201002229982"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3 rounded-xl font-semibold hover:bg-[#25D366]/90 no-underline"
            >
              <Phone className="w-4 h-4" />
              تواصل عبر واتساب
            </a>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full text-gray-600 py-3 rounded-xl hover:bg-gray-50 no-underline"
            >
              العودة للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
