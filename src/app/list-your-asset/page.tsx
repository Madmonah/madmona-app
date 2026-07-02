// app/list-your-asset/page.tsx
// =====================================================================
// LEGACY URL — redirects to /add-listing.
// We unified the supplier funnel: one route, one wizard, one source of truth.
// This file used to host an older "guest flow" that wrote to cold_leads;
// it's been replaced by /add-listing (which writes to listing_drafts and
// is wired into the WhatsApp pipeline).
// =====================================================================
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'إضافة منتج — مضمونة',
  description: 'أضف عقارك أو سيارتك أو معداتك على مضمونة في 5 خطوات.',
};

export default function ListYourAssetRedirect() {
  redirect('/add-listing');
}
