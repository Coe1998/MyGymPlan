'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse, faDumbbell, faClipboardList, faListCheck,
  faRightFromBracket, faRocket, faLock, faGear,
} from '@fortawesome/free-solid-svg-icons'

const navItems = [
  { href: '/atleta/dashboard', label: 'Home', icon: faHouse },
  { href: '/atleta/allenamento', label: 'Allena', icon: faDumbbell },
  { href: '/atleta/schede', label: 'Schede', icon: faClipboardList },
  { href: '/atleta/esercizi', label: 'Esercizi', icon: faListCheck },
  { href: '/atleta/impostazioni', label: 'Impostazioni', icon: faGear },
]

const navItemsLocked = [
  { href: '/atleta/progressi', label: 'Progressi', icon: faLock, locked: true },
]

export default function AtletaSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const isPro = profile.piano === 'pro'

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* SIDEBAR — solo desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col"
        style={{ background: 'oklch(0.16 0 0)', borderRight: '1px solid oklch(1 0 0 / 6%)' }}>
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
              B
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Bynari</p>
              <p className="text-xs" style={{ color: 'oklch(0.60 0.15 200)' }}>Area Atleta</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
            style={{ color: 'oklch(0.40 0 0)' }}>Navigazione</p>

          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: isActive ? 'oklch(0.70 0.19 46 / 15%)' : 'transparent',
                  color: isActive ? 'oklch(0.70 0.19 46)' : 'oklch(0.55 0 0)',
                  borderLeft: isActive ? '3px solid oklch(0.70 0.19 46)' : '3px solid transparent',
                }}>
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}

          {/* Voci bloccate */}
          {navItemsLocked.map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all opacity-50 hover:opacity-70"
              style={{ color: 'oklch(0.45 0 0)', borderLeft: '3px solid transparent' }}>
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                {item.label}
              </div>
              <span className="text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'oklch(0.70 0.19 46 / 20%)', color: 'oklch(0.70 0.19 46)' }}>
                Pro
              </span>
            </Link>
          ))}
        </nav>

        {/* Upgrade banner — solo free */}
        {!isPro && (
          <div className="mx-4 mb-4 p-4 rounded-2xl space-y-2"
            style={{ background: 'oklch(0.70 0.19 46 / 10%)', border: '1px solid oklch(0.70 0.19 46 / 20%)' }}>
            <p className="text-xs font-bold" style={{ color: 'oklch(0.70 0.19 46)' }}>Piano Free</p>
            <p className="text-xs" style={{ color: 'oklch(0.55 0 0)' }}>
              1 scheda · 3 giorni · no progressi
            </p>
            <button
              onClick={() => alert('Stripe in arrivo!')}
              className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
              <FontAwesomeIcon icon={faRocket} /> Passa a Pro
            </button>
          </div>
        )}

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
              <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
                {isPro ? '✦ Pro' : 'Free'}
              </p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
            style={{ color: 'oklch(0.45 0 0)' }}>
            <FontAwesomeIcon icon={faRightFromBracket} /> Esci
          </button>
        </div>
      </aside>

      {/* BOTTOM NAV — solo mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
        style={{
          background: 'oklch(0.16 0 0)',
          borderTop: '1px solid oklch(1 0 0 / 8%)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1"
              style={{ background: isActive ? 'oklch(0.70 0.19 46 / 15%)' : 'transparent' }}>
              <FontAwesomeIcon icon={item.icon} className="text-xl"
                style={{ color: isActive ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)' }} />
              <span className="text-xs font-medium"
                style={{ color: isActive ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)' }}>
                {item.label}
              </span>
            </Link>
          )
        })}
        <button onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl flex-1">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'oklch(0.70 0.19 46 / 20%)', color: 'oklch(0.70 0.19 46)' }}>
            {profile.full_name?.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium" style={{ color: 'oklch(0.45 0 0)' }}>Esci</span>
        </button>
      </nav>
    </>
  )
}
