'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartBar, faUsers, faDumbbell, faRightFromBracket, faGear, faEllipsisVertical, faComments, faLayerGroup, faClipboardList, faCalendarDays, faCircleCheck } from '@fortawesome/free-solid-svg-icons'

// Voci nav mobile — 5 tasti fissi
const navItemsMobile = [
  { href: '/coach/analytics', label: 'Dashboard', icon: faChartBar },
  { href: '/coach/clienti', label: 'Clienti', icon: faUsers },
  // 'allenamento' è un popup, non un link
  { href: '/coach/chat', label: 'Chat', icon: faComments },
]

// Tutte le voci (desktop sidebar)
const navItemsAll = [
  { href: '/coach/analytics', label: 'Dashboard', icon: faChartBar },
  { href: '/coach/clienti', label: 'Gestione clienti', icon: faUsers },
  { href: '/coach/appuntamenti', label: 'Appuntamenti', icon: faCalendarDays },
  { href: '/coach/checkin', label: 'Check-in', icon: faCircleCheck },
  { href: '/coach/schede', label: 'Schede', icon: faClipboardList },
  { href: '/coach/esercizi', label: 'Esercizi', icon: faDumbbell },
  { href: '/coach/chat', label: 'Chat', icon: faComments },
  { href: '/coach/impostazioni', label: 'Impostazioni', icon: faGear },
]

export default function CoachSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [allenamentoOpen, setAllenamentoOpen] = useState(false)
  const [clientiOpen, setClientiOpen] = useState(false)

	const [unreadClienti, setUnreadClienti] = useState(0)

	useEffect(() => {
	  const supabase = createClient()
	  let channel: any

	  const fetchUnread = async () => {
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) return
		const { data } = await supabase.from('messaggi')
		  .select('cliente_id')
		  .eq('coach_id', user.id)
		  .eq('da_coach', false)
		  .eq('letto', false)
		const clientiUnici = new Set((data ?? []).map((m: any) => m.cliente_id))
		setUnreadClienti(clientiUnici.size)

		channel = supabase.channel('unread-coach')
		  .on('postgres_changes', {
			event: '*', schema: 'public', table: 'messaggi',
			filter: `coach_id=eq.${user.id}`,
		  }, () => fetchUnread())
		  .subscribe()
	  }

	  fetchUnread()
	  return () => { if (channel) supabase.removeChannel(channel) }
	}, [])

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
            <p className="text-xs" style={{ color: 'oklch(0.70 0.19 46)' }}>Area Coach</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
            style={{ color: 'oklch(0.40 0 0)' }}>
            Navigazione
          </p>
          {navItemsAll.map((item) => {
            const isActive = pathname === item.href
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
				{item.href === '/coach/chat' && unreadClienti > 0 && (
				  <span className="ml-auto text-xs font-black w-5 h-5 rounded-full flex items-center justify-center"
					style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>
					{unreadClienti}
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

        {/* Dashboard */}
        {navItemsMobile.slice(0, 1).map((item) => {
          const isActive = pathname === item.href
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

        {/* Clienti popup */}
        <div className="relative flex-1 flex justify-center">
          <button onClick={() => { setClientiOpen(p => !p); setAllenamentoOpen(false); setMenuOpen(false) }}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all w-full"
           style={{ background: (pathname.startsWith('/coach/clienti') || pathname.startsWith('/coach/appuntamenti') || pathname.startsWith('/coach/checkin') || clientiOpen) ? 'oklch(0.70 0.19 46 / 15%)' : 'transparent' }}>
            <FontAwesomeIcon icon={faUsers} className="text-xl"
              style={{ color: (pathname.startsWith('/coach/clienti') || pathname.startsWith('/coach/appuntamenti') || pathname.startsWith('/coach/checkin') || clientiOpen) ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)' }} />
            <span className="text-xs font-medium"
              style={{ color: (pathname.startsWith('/coach/clienti') || pathname.startsWith('/coach/appuntamenti') || pathname.startsWith('/coach/checkin') || clientiOpen) ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)' }}>
              Clienti
            </span>
          </button>
          {clientiOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setClientiOpen(false)} />
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-50 rounded-2xl overflow-hidden shadow-xl min-w-48"
                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 12%)' }}>
                <Link href="/coach/clienti" onClick={() => setClientiOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all hover:bg-white/5"
                  style={{ color: 'oklch(0.80 0 0)', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                  <FontAwesomeIcon icon={faUsers} className="w-4" />
                  Gestione clienti
                </Link>
                <Link href="/coach/appuntamenti" onClick={() => setClientiOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all hover:bg-white/5"
                  style={{ color: 'oklch(0.80 0 0)', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                  <FontAwesomeIcon icon={faCalendarDays} className="w-4" />
                  Appuntamenti
                </Link>
                <Link href="/coach/checkin" onClick={() => setClientiOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all hover:bg-white/5"
                  style={{ color: 'oklch(0.80 0 0)' }}>
                  <FontAwesomeIcon icon={faCircleCheck} className="w-4" />
                  Check-in
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Allenamento popup */}
        <div className="relative flex-1 flex justify-center">
          <button onClick={() => { setAllenamentoOpen(p => !p); setMenuOpen(false) }}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all w-full"
            style={{ background: (pathname === '/coach/schede' || pathname === '/coach/esercizi' || allenamentoOpen) ? 'oklch(0.70 0.19 46 / 15%)' : 'transparent' }}>
            <FontAwesomeIcon icon={faLayerGroup} className="text-xl"
              style={{ color: (pathname === '/coach/schede' || pathname === '/coach/esercizi' || allenamentoOpen) ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)' }} />
            <span className="text-xs font-medium"
              style={{ color: (pathname === '/coach/schede' || pathname === '/coach/esercizi' || allenamentoOpen) ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)' }}>
              Allenamento
            </span>
          </button>
          {allenamentoOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAllenamentoOpen(false)} />
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-50 rounded-2xl overflow-hidden shadow-xl min-w-44"
                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 12%)' }}>
                <Link href="/coach/schede" onClick={() => setAllenamentoOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all hover:bg-white/5"
                  style={{ color: 'oklch(0.80 0 0)', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                  <FontAwesomeIcon icon={faClipboardList} className="w-4" />
                  Schede
                </Link>
                <Link href="/coach/esercizi" onClick={() => setAllenamentoOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all hover:bg-white/5"
                  style={{ color: 'oklch(0.80 0 0)' }}>
                  <FontAwesomeIcon icon={faDumbbell} className="w-4" />
                  Esercizi
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Chat */}
        {navItemsMobile.slice(2).map((item) => {
		  const isActive = pathname === item.href
		  return (
			<Link key={item.href} href={item.href}
			  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1 relative"
			  style={{ background: isActive ? 'oklch(0.70 0.19 46 / 15%)' : 'transparent' }}>
			  <div className="relative">
				<FontAwesomeIcon icon={item.icon} className="text-xl"
				  style={{ color: isActive ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)' }} />
				{item.href === '/coach/chat' && unreadClienti > 0 && (
				  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-xs font-black"
					style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)', fontSize: 9 }}>
					{unreadClienti}
				  </span>
				)}
			  </div>
			  <span className="text-xs font-medium"
				style={{ color: isActive ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)' }}>
				{item.label}
			  </span>
			</Link>
		  )
		})}

        {/* Altro popup */}
        <div className="relative flex-1 flex justify-center">
          <button onClick={() => { setMenuOpen(p => !p); setAllenamentoOpen(false) }}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all w-full"
            style={{ background: menuOpen ? 'oklch(0.70 0.19 46 / 15%)' : 'transparent' }}>
            <FontAwesomeIcon icon={faEllipsisVertical} className="text-xl"
              style={{ color: menuOpen ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)' }} />
            <span className="text-xs font-medium"
              style={{ color: menuOpen ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)' }}>
              Altro
            </span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute bottom-14 right-0 z-50 rounded-2xl overflow-hidden shadow-xl min-w-44"
                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 12%)' }}>
                <Link href="/coach/impostazioni" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-all hover:bg-white/5"
                  style={{ color: 'oklch(0.80 0 0)', borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
                  <FontAwesomeIcon icon={faGear} className="w-4" />
                  Impostazioni
                </Link>
                <button onClick={() => { setMenuOpen(false); handleLogout() }}
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
