/* ============================================================================
   arDateTime — تنسيق واحد للتاريخ والوقت في كل المنصة
   ============================================================================
   🎯 (٢١ أغسطس ٢٠٢٦) محمد: «وعايز وقت وتاريخ كل إعلان سواء منشور أو درافت
      أو أي إعلان عمومًا».

   المشكلة قبل كده: كل صفحة كانت بتنسّق التاريخ بطريقتها (أو ماكانتش
   بتعرضه أصلًا). `/admin/listings` مثلًا كانت **بتجيب** `created_at`
   و`published_at` من الداتابيز وترميهم — الأعمدة موجودة في الـtype ومش
   معروضة في الجدول. فمحدش كان يقدر يعرف الإعلان ده بقاله قد إيه.

   الملف ده هو المكان الوحيد اللي بيقرر شكل التاريخ — تغيّره هنا يتغيّر
   في كل مكان.

   ⚠️ الأوقات في الداتابيز `timestamptz` (UTC). بنعرضها بتوقيت القاهرة
      عشان اللي بيبص على الشاشة يقارنها بساعته هو، مش بساعة السيرفر.
   ============================================================================ */

const TZ = 'Africa/Cairo'

/** ٢١/٠٨/٢٠٢٦ · ٣:٤٥ م — تاريخ ووقت كاملين */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString('ar-EG', {
    timeZone: TZ, calendar: 'gregory',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const time = d.toLocaleTimeString('ar-EG', {
    timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true,
  })
  return `${date} · ${time}`
}

/** ٢١/٠٨/٢٠٢٦ — التاريخ بس، للأعمدة الضيّقة */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ar-EG', {
    timeZone: TZ, calendar: 'gregory',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

/** «النهاردة» · «إمبارح» · «من ٣ أيام» · «من شهرين» — بيقول عمره بسرعة */
export function sinceLabel(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'دلوقتي'
  if (mins < 60) return `من ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `من ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'إمبارح'
  if (days < 30) return `من ${days} يوم`
  const months = Math.floor(days / 30)
  if (months === 1) return 'من شهر'
  if (months === 2) return 'من شهرين'
  if (months < 12) return `من ${months} شهور`
  const years = Math.floor(months / 12)
  return years === 1 ? 'من سنة' : `من ${years} سنة`
}
