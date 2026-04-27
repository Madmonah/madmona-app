export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone_number: string
          full_name: string | null
          email: string | null
          is_first_time: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone_number: string
          full_name?: string | null
          email?: string | null
          is_first_time?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone_number?: string
          full_name?: string | null
          email?: string | null
          is_first_time?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      spaces: {
        Row: {
          id: string
          name: string
          name_en: string
          description: string | null
          space_type: 'indoor' | 'outdoor' | 'meeting_room' | 'private_office'
          capacity_min: number
          capacity_max: number
          amenities: Json | null
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_en: string
          description?: string | null
          space_type: 'indoor' | 'outdoor' | 'meeting_room' | 'private_office'
          capacity_min: number
          capacity_max: number
          amenities?: Json | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_en?: string
          description?: string | null
          space_type?: 'indoor' | 'outdoor' | 'meeting_room' | 'private_office'
          capacity_min?: number
          capacity_max?: number
          amenities?: Json | null
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      pricing_plans: {
        Row: {
          id: string
          space_id: string
          plan_type: 'hourly' | 'daily' | 'package' | 'monthly'
          name: string
          price_egp: number
          duration_hours: number | null
          package_sessions: number | null
          package_validity_days: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          space_id: string
          plan_type: 'hourly' | 'daily' | 'package' | 'monthly'
          name: string
          price_egp: number
          duration_hours?: number | null
          package_sessions?: number | null
          package_validity_days?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          space_id?: string
          plan_type?: 'hourly' | 'daily' | 'package' | 'monthly'
          name?: string
          price_egp?: number
          duration_hours?: number | null
          package_sessions?: number | null
          package_validity_days?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          booking_code: string
          user_id: string
          space_id: string
          pricing_plan_id: string
          booking_date: string
          start_time: string
          end_time: string
          attendee_count: number
          total_price_egp: number
          status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          payment_status: 'pending' | 'paid' | 'refunded'
          payment_method: string | null
          qr_code_data: string | null
          special_requests: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_code?: string
          user_id: string
          space_id: string
          pricing_plan_id: string
          booking_date: string
          start_time: string
          end_time: string
          attendee_count: number
          total_price_egp: number
          status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          payment_status?: 'pending' | 'paid' | 'refunded'
          payment_method?: string | null
          qr_code_data?: string | null
          special_requests?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_code?: string
          user_id?: string
          space_id?: string
          pricing_plan_id?: string
          booking_date?: string
          start_time?: string
          end_time?: string
          attendee_count?: number
          total_price_egp?: number
          status?: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          payment_status?: 'pending' | 'paid' | 'refunded'
          payment_method?: string | null
          qr_code_data?: string | null
          special_requests?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      space_type: 'indoor' | 'outdoor' | 'meeting_room' | 'private_office'
      booking_status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
      payment_status: 'pending' | 'paid' | 'refunded'
      plan_type: 'hourly' | 'daily' | 'package' | 'monthly'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier use
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Space = Database['public']['Tables']['spaces']['Row']
export type SpaceInsert = Database['public']['Tables']['spaces']['Insert']
export type SpaceUpdate = Database['public']['Tables']['spaces']['Update']

export type PricingPlan = Database['public']['Tables']['pricing_plans']['Row']
export type PricingPlanInsert = Database['public']['Tables']['pricing_plans']['Insert']
export type PricingPlanUpdate = Database['public']['Tables']['pricing_plans']['Update']

export type Booking = Database['public']['Tables']['bookings']['Row']
export type BookingInsert = Database['public']['Tables']['bookings']['Insert']
export type BookingUpdate = Database['public']['Tables']['bookings']['Update']

// Enhanced types with relationships
export type BookingWithDetails = Booking & {
  user: User
  space: Space
  pricing_plan: PricingPlan
}

export type SpaceWithPricing = Space & {
  pricing_plans: PricingPlan[]
}