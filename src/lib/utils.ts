import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format phone number for display
export function formatPhoneNumber(phone: string): string {
  // Remove +20 prefix if present
  const cleaned = phone.replace(/^\+20/, '')
  
  // Format as: 100 222 9982
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  
  return cleaned
}

// Generate booking code
export function generateBookingCode(date?: Date): string {
  const now = date || new Date()
  const day = now.getDate().toString().padStart(2, '0')
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  
  // Random 3-digit number
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  
  return `MAD-${day}${month}-${random}`
}

// Convert Arabic numerals to English for calculations
export function arabicToEnglishNumbers(str: string): string {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  
  let result = str
  for (let i = 0; i < arabicNumbers.length; i++) {
    result = result.replace(new RegExp(arabicNumbers[i], 'g'), englishNumbers[i])
  }
  return result
}

// Convert English numerals to Arabic for display
export function englishToArabicNumbers(str: string): string {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  
  let result = str
  for (let i = 0; i < englishNumbers.length; i++) {
    result = result.replace(new RegExp(englishNumbers[i], 'g'), arabicNumbers[i])
  }
  return result
}

// Format price in Egyptian Pounds
export function formatPrice(amount: number): string {
  return `${englishToArabicNumbers(amount.toString())} ج.م`
}

// Format date in Arabic
export function formatDateArabic(date: Date): string {
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ]
  
  const arabicDays = [
    'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'
  ]
  
  const day = arabicDays[date.getDay()]
  const dayNum = englishToArabicNumbers(date.getDate().toString())
  const month = arabicMonths[date.getMonth()]
  const year = englishToArabicNumbers(date.getFullYear().toString())
  
  return `${day} ${dayNum} ${month} ${year}`
}

// Format time in Arabic (12-hour format)
export function formatTimeArabic(date: Date): string {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const ampm = hours >= 12 ? 'م' : 'ص'
  
  const hourStr = englishToArabicNumbers(hour12.toString())
  const minuteStr = englishToArabicNumbers(minutes.toString().padStart(2, '0'))
  
  return `${hourStr}:${minuteStr} ${ampm}`
}

// Check if date is today
export function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

// Check if date is tomorrow
export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return date.toDateString() === tomorrow.toDateString()
}

// Get relative date string in Arabic
export function getRelativeDateArabic(date: Date): string {
  if (isToday(date)) return 'اليوم'
  if (isTomorrow(date)) return 'بكرة'
  
  const today = new Date()
  const diffTime = date.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays > 0) {
    if (diffDays <= 7) {
      return `بعد ${englishToArabicNumbers(diffDays.toString())} ${diffDays === 1 ? 'يوم' : 'أيام'}`
    }
  } else if (diffDays < 0) {
    const absDays = Math.abs(diffDays)
    if (absDays <= 7) {
      return `منذ ${englishToArabicNumbers(absDays.toString())} ${absDays === 1 ? 'يوم' : 'أيام'}`
    }
  }
  
  return formatDateArabic(date)
}