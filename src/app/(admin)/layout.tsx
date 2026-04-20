import Image from 'next/image'
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
    <div style={{ background: 'var(--c-11)', minHeight: '100vh', color: 'var(--c-97)', fontFamily: 'Syne, Inter, sans-serif' }}>
      <div className="flex items-center justify-between px-6 border-b"
        style={{ borderColor: 'var(--c-w8)', background: 'var(--c-13)', paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: '1rem' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo/Bynari_WO1.png" alt="Bynari" width={110} height={22} style={{ height: '22px', width: 'auto' }} />
          <span className="text-xs font-black px-2 py-1 rounded-lg"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-11)' }}>
            ADMIN
          </span>
        </div>
        <a href="/api/auth/signout"
          className="text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--c-22)', color: 'var(--c-55)' }}>
          Esci
        </a>
      </div>
      <main className="p-6 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  )
}
