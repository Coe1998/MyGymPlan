import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AtletaSidebar from '@/components/atleta/AtletaSidebar'

export default async function AtletaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profile) redirect('/login')
  if (profile.role === 'coach') redirect('/coach/dashboard')
  if (profile.role === 'cliente') redirect('/cliente/dashboard')
  if (profile.role !== 'atleta') redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.13 0 0)' }}>
      <AtletaSidebar profile={profile} />
      <main
        className="lg:ml-64 pb-24 lg:pb-8"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          paddingBottom: '',
        }}
      >
        {children}
      </main>
    </div>
  )
}
