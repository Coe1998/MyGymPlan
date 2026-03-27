import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') redirect('/login')

  return (
    <div style={{ background: 'oklch(0.11 0 0)', minHeight: '100vh', color: 'oklch(0.97 0 0)', fontFamily: 'Syne, Inter, sans-serif' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 border-b"
        style={{ borderColor: 'oklch(1 0 0 / 8%)', background: 'oklch(0.13 0 0)', paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: '1rem' }}>
        <div className="flex items-center gap-3">
          <img src="/logo/Bynari_WO1.png" alt="Bynari" style={{ height: '22px', width: 'auto' }} />
          <span className="text-xs font-black px-2 py-1 rounded-lg"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
            ADMIN
          </span>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
            Esci
          </button>
        </form>
      </div>
      <main className="p-6 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  )
}
