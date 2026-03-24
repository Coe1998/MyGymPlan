import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CoachPendingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, coach_status').eq('id', user.id).single()

  if (!profile || profile.role !== 'coach') redirect('/login')

  // Se nel frattempo è stato approvato → vai alla dashboard
  if (profile.coach_status === 'approved') redirect('/coach/dashboard')

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.13 0 0)' }}>
      {children}
    </div>
  )
}
