// User types
export interface User {
  id: string
  phone: string
  name?: string
  email?: string
  avatar_url?: string
  is_first_time: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

// Space types
export interface Space {
  id: string
  name: string
  name_en?: string
  description: string
  description_en?: string
  type: SpaceType
  capacity: number
  area_sqm?: number
  amenities: Amenity[]
  images: SpaceImage[]
  location?: string
  floor?: number
  is_active: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
  pricing_plans?: PricingPlan[]
}

export type SpaceType = 'indoor' | 'outdoor' | 'private_office' | 'meeting_room'

export interface SpaceImage {
  url: string
  alt?: string
  is_primary: boolean
}

export type Amenity = 
  | 'wifi'
  | 'ac'
  | 'coffee'
  | 'printer'
  | 'parking'
  | 'projector'
  | 'whiteboard'
  | 'natural_light'
  | 'power_outlets'
  | 'privacy'
  | 'soundproof'

// Pricing types
export interface PricingPlan {
  id: string
  space_id: string
  name: string
  name_en?: string
  description?: string
  type: PricingType
  price: number
  currency: 'EGP'
  duration_hours?: number
  package_sessions?: number
  package_validity_days?: number
  is_active: boolean
  is_popular: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type PricingType = 'hourly' | 'daily' | 'package' | 'monthly'

// Booking types
export interface Booking {
  id: string
  user_id: string
  space_id: string
  pricing_plan_id: string
  booking_code: string
  start_time: string
  end_time: string
  guest_count: number
  total_price: number
  currency: 'EGP'
  status: BookingStatus
  payment_status: PaymentStatus
  payment_method?: PaymentMethod
  special_requests?: string
  qr_code?: string
  qr_expires_at?: string
  cancellation_reason?: string
  cancelled_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
  
  // Relations
  space?: Space
  pricing_plan?: PricingPlan
  user?: User
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed'
export type PaymentMethod = 'cash' | 'card' | 'instapay' | 'vodafone_cash' | 'credit'

// Subscription types
export interface Subscription {
  id: string
  user_id: string
  space_id: string
  pricing_plan_id: string
  type: SubscriptionType
  start_date: string
  end_date: string
  sessions_remaining?: number
  status: SubscriptionStatus
  auto_renew: boolean
  created_at: string
  updated_at: string
  
  // Relations
  space?: Space
  pricing_plan?: PricingPlan
}

export type SubscriptionType = 'monthly' | 'package'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'paused'

// Package credit types
export interface PackageCredit {
  id: string
  user_id: string
  subscription_id: string
  sessions_purchased: number
  sessions_used: number
  sessions_remaining: number
  expires_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Review types
export interface Review {
  id: string
  user_id: string
  booking_id: string
  space_id: string
  rating: number
  title?: string
  comment?: string
  is_anonymous: boolean
  is_verified: boolean
  created_at: string
  
  // Relations
  user?: Pick<User, 'name' | 'avatar_url'>
  booking?: Pick<Booking, 'booking_code' | 'start_time'>
}

// Promo code types
export interface PromoCode {
  id: string
  code: string
  description: string
  type: PromoType
  discount_value: number
  discount_unit: 'percentage' | 'fixed'
  minimum_amount?: number
  max_discount_amount?: number
  usage_limit?: number
  usage_count: number
  valid_from: string
  valid_until: string
  applicable_spaces?: string[]
  applicable_pricing_types?: PricingType[]
  is_active: boolean
  created_at: string
}

export type PromoType = 'first_time' | 'referral' | 'seasonal' | 'loyalty' | 'general'

// Notification types
export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  is_read: boolean
  created_at: string
}

export type NotificationType = 
  | 'booking_confirmed'
  | 'booking_reminder'
  | 'booking_cancelled'
  | 'payment_received'
  | 'review_request'
  | 'promotion'
  | 'announcement'

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  total: number
  page: number
  per_page: number
  has_more: boolean
}

// Form types
export interface BookingFormData {
  space_id: string
  pricing_plan_id: string
  start_time: string
  end_time: string
  guest_count: number
  special_requests?: string
  promo_code?: string
}

export interface UserProfileData {
  name?: string
  email?: string
  phone: string
  avatar_url?: string
}

export interface AuthFormData {
  phone: string
  otp?: string
}

// UI Component types
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface TimeSlot {
  start: string
  end: string
  available: boolean
  price?: number
}

export interface CalendarDay {
  date: Date
  available: boolean
  isToday: boolean
  isSelected: boolean
  isPast: boolean
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: Record<string, any>
}

// Analytics types
export interface BookingAnalytics {
  total_bookings: number
  revenue: number
  popular_spaces: Array<{
    space_id: string
    space_name: string
    booking_count: number
  }>
  peak_hours: Array<{
    hour: number
    booking_count: number
  }>
}

// Search/Filter types
export interface SpaceFilters {
  type?: SpaceType[]
  amenities?: Amenity[]
  capacity_min?: number
  capacity_max?: number
  price_min?: number
  price_max?: number
  available_from?: string
  available_until?: string
}

export interface BookingFilters {
  status?: BookingStatus[]
  date_from?: string
  date_until?: string
  space_type?: SpaceType[]
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
}[Keys]