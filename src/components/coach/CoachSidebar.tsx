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
        style={{ background: 'var(--c-16)', borderRight: '1px solid var(--c-w6)' }}>
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: '1px solid var(--c-w6)' }}>
          <div className="flex flex-col gap-0.5">
            <Image src="/logo/Bynari_WO1.png" alt="Bynari" width={120} height={28} style={{ height: '28px', width: 'auto' }} />
            <p className="text-xs" style={{ color: 'oklch(0.70 0.19 46)' }}>Area Coach</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
            style={{ color: 'var(--c-40)' }}>
            Navigazione
          </p>
          {navItemsAll.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: isActive ? 'oklch(0.70 0.19 46 / 15%)' : 'transparent',
                  color: isActive ? 'oklch(0.70 0.19 46)' : 'var(--c-55)',
                  borderLeft: isActive ? '3px solid oklch(0.70 0.19 46)' : '3px solid transparent',
                }}>
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
				{item.label}
				{item.href === '/coach/chat' && unreadClienti > 0 && (
				  <span className="ml-auto text-xs font-black w-5 h-5 rounded-full flex items-center justify-center"
					style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-11)' }}>
					{unreadClienti}
				  </span>
				)}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4" style={{ borderTop: '1px solid var(--c-w6)' }}>
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'oklch(0.70 0.19 46 / 20%)', color: 'oklch(0.70 0.19 46)' }}>
              {profile.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-97)' }}>
                {profile.full_name}
              </p>
              <p className="text-xs" style={{ color: 'var(--c-45)' }}>Coach</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
            style={{ color: 'var(--c-45)' }}>
            <FontAwesomeIcon icon={faRightFromBracket} />
            Esci
          </button>
        </div>
      </aside>

      {/* BOTTOM NAV — solo mobile (5 slot, CTA centrale flottante) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2"
        style={{
          background: 'oklch(0.13 0 0 / 88%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--c-w8)',
          paddingTop: 10,
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        }}>

        {/* 1 — Dashboard */}
        {(() => {
          const isActive = pathname === '/coach/analytics'
          return (
            <Link href="/coach/analytics"
              className="flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all"
              style={{ minHeight: 44 }}>
              <FontAwesomeIcon icon={faChartBar} className="text-xl"
                style={{ color: isActive ? 'oklch(0.70 0.19 46)' : 'var(--c-45)' }} />
              <span className="text-xs font-medium"
                style={{ color: isActive ? 'oklch(0.70 0.19 46)' : 'var(--c-45)' }}>Dashboard</span>
            </Link>
          )
        })()}

        {/* 2 — Clienti popup */}
        <div className="relative flex-1 flex justify-center">
          <button
            onClick={() => { setClientiOpen(p => !p); setAllenamentoOpen(false); setMenuOpen(false) }}
            className="flex flex-col items-center gap-0.5 w-full py-1 rounded-xl transition-all"
            style={{ minHeight: 44 }}>
            <FontAwesomeIcon icon={faUsers} className="text-xl"
              style={{ color: (pathname.startsWith('/coach/clienti') || pathname.startsWith('/coach/appuntamenti') || pathname.startsWith('/coach/checkin') || clientiOpen) ? 'oklch(0.70 0.19 46)' : 'var(--c-45)' }} />
            <span className="text-xs font-medium"
              style={{ color: (pathname.startsWith('/coach/clienti') || pathname.startsWith('/coach/appuntamenti') || pathname.startsWith('/coach/checkin') || clientiOpen) ? 'oklch(0.70 0.19 46)' : 'var(--c-45)' }}>
              Clienti
            </span>
          </button>
          {clientiOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setClientiOpen(false)} />
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl overflow-hidden shadow-xl min-w-48"
                style={{ background: 'var(--c-22)', border: '1px solid var(--c-w12)' }}>
                <Link href="/coach/clienti" onClick={() => setClientiOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-white/5"
                  style={{ color: 'var(--c-80)', borderBottom: '1px solid var(--c-w8)' }}>
                  <FontAwesomeIcon icon={faUsers} className="w-4" /> Gestione clienti
                </Link>
                <Link href="/coach/appuntamenti" onClick={() => setClientiOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-white/5"
                  style={{ color: 'var(--c-80)', borderBottom: '1px solid var(--c-w8)' }}>
                  <FontAwesomeIcon icon={faCalendarDays} className="w-4" /> Appuntamenti
                </Link>
                <Link href="/coach/checkin" onClick={() => setClientiOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-white/5"
                  style={{ color: 'var(--c-80)' }}>
                  <FontAwesomeIcon icon={faCircleCheck} className="w-4" /> Check-in
                </Link>
              </div>
            </>
          )}
        </div>

        {/* 3 — CTA centrale arancione flottante */}
        <div className="flex-1 flex justify-center items-center" style={{ minHeight: 44 }}>
          <Link href="/coach/clienti"
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 48, height: 48,
              background: 'oklch(0.70 0.19 46)',
              color: 'var(--c-13)',
              fontSize: 18,
              boxShadow: '0 8px 20px -6px oklch(0.70 0.19 46 / 55%)',
            }}
            aria-label="Aggiungi cliente">
            <FontAwesomeIcon icon={faUsers} style={{ fontSize: 16 }} />
          </Link>
        </div>

        {/* 4 — Allenamento popup */}
        <div className="relative flex-1 flex justify-center">
          <button
            onClick={() => { setAllenamentoOpen(p => !p); setMenuOpen(false); setClientiOpen(false) }}
            className="flex flex-col items-center gap-0.5 w-full py-1 rounded-xl transition-all"
            style={{ minHeight: 44 }}>
            <FontAwesomeIcon icon={faLayerGroup} className="text-xl"
              style={{ color: (pathname === '/coach/schede' || pathname.startsWith('/coach/schede') || pathname === '/coach/esercizi' || allenamentoOpen) ? 'oklch(0.70 0.19 46)' : 'var(--c-45)' }} />
            <span className="text-xs font-medium"
              style={{ color: (pathname === '/coach/schede' || pathname.startsWith('/coach/schede') || pathname === '/coach/esercizi' || allenamentoOpen) ? 'oklch(0.70 0.19 46)' : 'var(--c-45)' }}>
              Schede
            </span>
          </button>
          {allenamentoOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAllenamentoOpen(false)} />
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl overflow-hidden shadow-xl min-w-44"
                style={{ background: 'var(--c-22)', border: '1px solid var(--c-w12)' }}>
                <Link href="/coach/schede" onClick={() => setAllenamentoOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-white/5"
                  style={{ color: 'var(--c-80)', borderBottom: '1px solid var(--c-w8)' }}>
                  <FontAwesomeIcon icon={faClipboardList} className="w-4" /> Schede
                </Link>
                <Link href="/coach/esercizi" onClick={() => setAllenamentoOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-white/5"
                  style={{ color: 'var(--c-80)', borderBottom: '1px solid var(--c-w8)' }}>
                  <FontAwesomeIcon icon={faDumbbell} className="w-4" /> Esercizi
                </Link>
                <Link href="/coach/impostazioni" onClick={() => setAllenamentoOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-white/5"
                  style={{ color: 'var(--c-80)' }}>
                  <FontAwesomeIcon icon={faGear} className="w-4" /> Impostazioni
                </Link>
              </div>
            </>
          )}
        </div>

        {/* 5 — Chat con badge unread */}
        {(() => {
          const isActive = pathname === '/coach/chat'
          return (
            <Link href="/coach/chat"
              className="flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-all relative"
              style={{ minHeight: 44 }}>
              <div className="relative">
                <FontAwesomeIcon icon={faComments} className="text-xl"
                  style={{ color: isActive ? 'oklch(0.70 0.19 46)' : 'var(--c-45)' }} />
                {unreadClienti > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'oklch(0.65 0.22 27)', color: 'white', fontSize: 9, fontWeight: 700 }}>
                    {unreadClienti}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium"
                style={{ color: isActive ? 'oklch(0.70 0.19 46)' : 'var(--c-45)' }}>Chat</span>
            </Link>
          )
        })()}
      </nav>
    </>
  )
}
