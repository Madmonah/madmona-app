import { redirect } from 'next/navigation'

// تم دمج كونسول الفلتر داخل /admin/listings — ده تحويل للتوافق مع أي لينك قديم.
export default function ManageRedirect() {
  redirect('/admin/listings')
}
