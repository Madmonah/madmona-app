import { redirect } from 'next/navigation'

// الكو-وركينج اتلغى نهائيًا — أي لينك قديم يحوّل على الصفحة الرئيسية.
export default function CoworkingPage() {
  redirect('/')
}
