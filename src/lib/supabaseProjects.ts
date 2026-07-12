// src/lib/supabaseProjects.ts
// عميل Supabase من غير جينيريك — عشان الجداول/الأعمدة الجديدة
// (project_inquiries + أعمدة الميديا في property_market_items) لسه مش
// في src/types/supabase.ts المولّد. لما تعيد توليد الـtypes تقدر ترجع
// تستخدم '@/lib/supabase' مباشرة.
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as typed } from '@/lib/supabase'

export const sbProjects = typed as unknown as SupabaseClient
