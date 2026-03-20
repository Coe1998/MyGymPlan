import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CoachSidebar from '@/components/coach/CoachSidebar'

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') redirect('/cliente/dashboard')

  return (
    <div className="flex min-h-screen bg-background">
      <CoachSidebar profile={profile} />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  )
}
