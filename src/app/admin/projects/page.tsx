// src/app/admin/projects/page.tsx
// لوحة إدارة مشاريع بورصة مضمونة (محمية بحارس /admin في middleware).
import { sbProjects as supabaseAdmin } from '@/lib/supabaseProjects'
import ProjectsAdmin from './ProjectsAdmin'
import type { Project } from '@/lib/projects'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminProjectsPage() {
  const { data } = await supabaseAdmin
    .from('property_market_items')
    .select('*')
    .eq('segment', 'developer')
    .order('status', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(500)

  return <ProjectsAdmin initial={(data ?? []) as unknown as Project[]} />
}
