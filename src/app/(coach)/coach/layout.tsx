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
    .from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/cliente/dashboard')

  // Coach in attesa di approvazione → manda alla pagina pending
  // La pagina /coach/pending ha il suo layout separato quindi non viene intercettata qui
  if (profile?.coach_status === 'pending') {
    redirect('/coach/pending')
  }

  return (
    <div className="min-h-screen bg-background">
      <CoachSidebar profile={profile} />
      {/* Desktop: margin per sidebar. Mobile: padding bottom per bottom nav */}
      <main
        className="lg:ml-64 pb-24 lg:pb-8"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
          paddingBottom: '',
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
