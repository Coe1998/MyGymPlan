'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faDumbbell, faChartLine, faRightFromBracket, faGear, faUtensils, faEllipsisVertical, faComments } from '@fortawesome/free-solid-svg-icons'

// Voci nav principali (mobile) — Dieta filtrata se non abilitata
const buildNavItems = (dietaAbilitata: boolean) => [
  { href: '/cliente/dashboard', label: 'Home', icon: faHouse },
  { href: '/cliente/allenamento', label: 'Allena', icon: faDumbbell },
  { href: '/cliente/progressi', label: 'Progressi', icon: faChartLine },
  ...(dietaAbilitata ? [{ href: '/cliente/dieta', label: 'Dieta', icon: faUtensils }] : []),
  { href: '/cliente/chat', label: 'Chat', icon: faComments },
]

// Tutte le voci (desktop sidebar)
const buildNavItemsAll = (dietaAbilitata: boolean) => [
  ...buildNavItems(dietaAbilitata),
  { href: '/cliente/impostazioni', label: 'Impostazioni', icon: faGear },
]

export default function ClienteSidebar({ profile, dietaAbilitata = false }: { profile: Profile; dietaAbilitata?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [allenamentoUrl, setAllenamentoUrl] = useState('/cliente/allenamento')
	const [unreadCoach, setUnreadCoach] = useState(0)

	useEffect(() => {
	  const fetchUnread = async () => {
		const supabase = createClient()
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) return
		const { data } = await supabase.from('messaggi')
		  .select('id')
		  .eq('cliente_id', user.id)
		  .eq('da_coach', true)
		  .eq('letto', false)
		setUnreadCoach(data?.length ?? 0)
	  }
	  fetchUnread()
	}, [])
	
  useEffect(() => {
    const saved = localStorage.getItem('bynari_allenamento_url')
    if (saved) setAllenamentoUrl(saved)
  }, [pathname])

  const navItems = buildNavItems(dietaAbilitata)
  const navItemsAll = buildNavItemsAll(dietaAbilitata)

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
          <div className="flex flex-col gap-0.5">
            <Image src="/logo/Bynari_WO1.png" alt="Bynari" width={120} height={28} style={{ height: '28px', width: 'auto' }} />
            <p className="text-xs" style={{ color: 'oklch(0.60 0.15 200)' }}>Area Atleta</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
            style={{ color: 'oklch(0.40 0 0)' }}>
            Navigazione
          </p>
          {navItemsAll.map((item) => {
            const href = item.href === '/cliente/allenamento' ? allenamentoUrl : item.href
            const isActive = pathname.startsWith('/cliente/allenamento')
              ? item.href === '/cliente/allenamento'
              : pathname === item.href
            return (
              <Link key={item.href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: isActive ? 'oklch(0.60 0.15 200 / 15%)' : 'transparent',
                  color: isActive ? 'oklch(0.60 0.15 200)' : 'oklch(0.55 0 0)',
                  borderLeft: isActive ? '3px solid oklch(0.60 0.15 200)' : '3px solid transparent',
                }}>
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
				{item.label}
				{item.href === '/cliente/chat' && unreadCoach > 0 && (
				  <span className="ml-auto text-xs font-black w-5 h-5 rounded-full flex items-center justify-center"
					style={{ background: 'oklch(0.60 0.15 200)', color: 'oklch(0.97 0 0)' }}>
					{unreadCoach}
				  </span>
				)}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'oklch(0.60 0.15 200 / 20%)', color: 'oklch(0.60 0.15 200)' }}>
              {profile.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'oklch(0.97 0 0)' }}>
                {profile.full_name}
              </p>
              <p className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>Atleta</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
            style={{ color: 'oklch(0.45 0 0)' }}>
            <FontAwesomeIcon icon={faRightFromBracket} />
            Esci
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
          const href = item.href === '/cliente/allenamento' ? allenamentoUrl : item.href
          const isActive = pathname.startsWith('/cliente/allenamento')
            ? item.href === '/cliente/allenamento'
            : pathname === item.href
          return (
            <Link key={item.href} href={href}
			  className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all flex-1"
			  style={{ background: isActive ? 'oklch(0.60 0.15 200 / 15%)' : 'transparent' }}>
			  <div className="relative">
				<FontAwesomeIcon icon={item.icon} className="text-2xl"
				  style={{ color: isActive ? 'oklch(0.60 0.15 200)' : 'oklch(0.45 0 0)' }} />
				{item.href === '/cliente/chat' && unreadCoach > 0 && (
				  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full flex items-center justify-center font-black"
					style={{ background: 'oklch(0.60 0.15 200)', color: 'oklch(0.97 0 0)', fontSize: 9 }}>
					{unreadCoach}
				  </span>
				)}
			  </div>
			  <span className="text-xs font-medium"
				style={{ color: isActive ? 'oklch(0.60 0.15 200)' : 'oklch(0.45 0 0)' }}>
				{item.label}
			  </span>
			</Link>
          )
        })}

        {/* Bottone "..." — apre mini menu con Impostazioni + Esci */}
        <div className="relative flex-1 flex justify-center">
          <button
            onClick={() => setMenuOpen(p => !p)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all w-full"
            style={{ background: menuOpen ? 'oklch(0.60 0.15 200 / 15%)' : 'transparent' }}>
            <FontAwesomeIcon icon={faEllipsisVertical} className="text-xl"
              style={{ color: menuOpen ? 'oklch(0.60 0.15 200)' : 'oklch(0.45 0 0)' }} />
            <span className="text-xs font-medium"
              style={{ color: menuOpen ? 'oklch(0.60 0.15 200)' : 'oklch(0.45 0 0)' }}>
              Altro
            </span>
          </button>

          {/* Mini menu popup */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute bottom-14 right-0 z-50 rounded-2xl overflow-hidden shadow-xl min-w-44"
                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 12%)' }}>
                <Link href="/cliente/impostazioni"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all hover:bg-white/5"
                  style={{ color: 'oklch(0.80 0 0)', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                  <FontAwesomeIcon icon={faGear} className="w-4" />
                  Impostazioni
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); handleLogout() }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all hover:bg-white/5"
                  style={{ color: 'oklch(0.65 0.18 27)' }}>
                  <FontAwesomeIcon icon={faRightFromBracket} className="w-4" />
                  Esci
                </button>
              </div>
            </>
          )}
        </div>
      </nav>
    </>
  )
}
