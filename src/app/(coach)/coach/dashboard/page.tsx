import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/shared/LogoutButton'

export default async function CoachDashboard() {
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Dashboard Coach</h1>
        <p className="text-muted-foreground">Benvenuto, {profile.full_name}!</p>
        <p className="text-sm text-green-500">✅ Autenticazione funzionante</p>
        <LogoutButton />
      </div>
    </div>
  )
}
