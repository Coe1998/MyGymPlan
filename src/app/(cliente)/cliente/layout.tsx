import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClienteSidebar from '@/components/cliente/ClienteSidebar'

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'cliente') redirect('/coach/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <ClienteSidebar profile={profile} />
      {/* Desktop: margin per sidebar. Mobile: padding bottom per bottom nav */}
      <main className="lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8">
        {children}
      </main>
    </div>
  )
}
