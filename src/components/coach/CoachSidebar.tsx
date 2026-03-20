'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types'

const navItems = [
  { href: '/coach/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/coach/clienti', label: 'Clienti', icon: '👥' },
  { href: '/coach/schede', label: 'Schede', icon: '📋' },
  { href: '/coach/esercizi', label: 'Esercizi', icon: '💪' },
  { href: '/coach/analytics', label: 'Analytics', icon: '📈' },
]

export default function CoachSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col"
      style={{ background: 'oklch(0.16 0 0)', borderRight: '1px solid oklch(1 0 0 / 6%)' }}>
      {/* Logo */}
      <div className="p-6" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
            M
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>MyGymPlan</p>
            <p className="text-xs" style={{ color: 'oklch(0.70 0.19 46)' }}>Area Coach</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
          style={{ color: 'oklch(0.40 0 0)' }}>
          Navigazione
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: isActive ? 'oklch(0.70 0.19 46 / 15%)' : 'transparent',
                color: isActive ? 'oklch(0.70 0.19 46)' : 'oklch(0.55 0 0)',
                borderLeft: isActive ? '3px solid oklch(0.70 0.19 46)' : '3px solid transparent',
              }}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'oklch(0.70 0.19 46 / 20%)', color: 'oklch(0.70 0.19 46)' }}>
            {profile.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'oklch(0.97 0 0)' }}>
              {profile.full_name}
            </p>
            <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>Coach</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
          style={{ color: 'oklch(0.45 0 0)' }}>
          <span>🚪</span>
          Esci
        </button>
      </div>
    </aside>
  )
}
