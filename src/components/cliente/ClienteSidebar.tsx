'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Profile } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faDumbbell, faChartLine, faRightFromBracket, faGear, faUtensils, faComments } from '@fortawesome/free-solid-svg-icons'

// Voci nav mobile (bottom bar)
const buildNavItems = (dietaAbilitata: boolean) => [
  { href: '/cliente/dashboard', label: 'Home', icon: faHouse },
  { href: '/cliente/allenamento', label: 'Allena', icon: faDumbbell },
  { href: '/cliente/progressi', label: 'Progressi', icon: faChartLine },
  ...(dietaAbilitata ? [{ href: '/cliente/dieta', label: 'Dieta', icon: faUtensils }] : []),
  { href: '/cliente/chat', label: 'Chat', icon: faComments },
  { href: '/cliente/impostazioni', label: 'Profilo', icon: faGear },
]

// Voci sidebar desktop — "Impostazioni" invece di "Profilo", nessun duplicato
const buildNavItemsAll = (dietaAbilitata: boolean) => [
  { href: '/cliente/dashboard', label: 'Home', icon: faHouse },
  { href: '/cliente/allenamento', label: 'Allena', icon: faDumbbell },
  { href: '/cliente/progressi', label: 'Progressi', icon: faChartLine },
  ...(dietaAbilitata ? [{ href: '/cliente/dieta', label: 'Dieta', icon: faUtensils }] : []),
  { href: '/cliente/chat', label: 'Chat', icon: faComments },
  { href: '/cliente/impostazioni', label: 'Impostazioni', icon: faGear },
]

export default function ClienteSidebar({ profile, dietaAbilitata = false }: { profile: Profile; dietaAbilitata?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [allenamentoUrl, setAllenamentoUrl] = useState('/cliente/allenamento')
  const [haSessioneInCorso, setHaSessioneInCorso] = useState(false)
	const [unreadCoach, setUnreadCoach] = useState(0)

	useEffect(() => {
	  const supabase = createClient()
	  let channel: any

	  const fetchUnread = async () => {
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) return
		const { data } = await supabase.from('messaggi')
		  .select('id')
		  .eq('cliente_id', user.id)
		  .eq('da_coach', true)
		  .eq('letto', false)
		setUnreadCoach(data?.length ?? 0)

		channel = supabase.channel('unread-cliente')
		  .on('postgres_changes', {
			event: 'INSERT', schema: 'public', table: 'messaggi',
			filter: `cliente_id=eq.${user.id}`,
		  }, () => fetchUnread())
		  .subscribe()
	  }

	  fetchUnread()
	  return () => { if (channel) supabase.removeChannel(channel) }
	}, [])

  useEffect(() => {
    const saved = localStorage.getItem('bynari_allenamento_url')
    if (saved) setAllenamentoUrl(saved)

    // Check if there's a real in-progress session
    const checkSessioneInCorso = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ventiquattroOreFA = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('sessioni')
        .select('id')
        .eq('cliente_id', user.id)
        .eq('completata', false)
        .gte('data', ventiquattroOreFA)
        .limit(1)
      setHaSessioneInCorso((data?.length ?? 0) > 0)
    }
    checkSessioneInCorso()
  }, [pathname])

  const navItems = buildNavItems(dietaAbilitata)
  const navItemsAll = buildNavItemsAll(dietaAbilitata)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleAllenamento = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/cliente/allenamento'); return }
    const ventiquattroOreFA = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('sessioni')
      .select('id')
      .eq('cliente_id', user.id)
      .eq('completata', false)
      .gte('data', ventiquattroOreFA)
      .limit(1)
    if (data && data.length > 0) {
      router.push(allenamentoUrl)
    } else {
      localStorage.removeItem('bynari_allenamento_url')
      setAllenamentoUrl('/cliente/allenamento')
      setHaSessioneInCorso(false)
      router.push('/cliente/allenamento')
    }
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
            <p className="text-xs" style={{ color: 'oklch(0.60 0.15 200)' }}>Area Atleta</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-3"
            style={{ color: 'var(--c-40)' }}>
            Navigazione
          </p>
          {navItemsAll.map((item) => {
            const isAllena = item.href === '/cliente/allenamento'
            const href = isAllena ? allenamentoUrl : item.href
            const isActive = pathname.startsWith('/cliente/allenamento')
              ? isAllena
              : pathname === item.href
            if (isAllena) {
              return (
                <button key={item.href}
                  onClick={handleAllenamento}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: isActive ? 'oklch(0.60 0.15 200 / 15%)' : 'transparent',
                    color: isActive ? 'oklch(0.60 0.15 200)' : 'var(--c-55)',
                    borderLeft: isActive ? '3px solid oklch(0.60 0.15 200)' : '3px solid transparent',
                  }}>
                  <div className="relative w-4 h-4">
                    <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                    {haSessioneInCorso && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                        style={{ background: 'oklch(0.70 0.19 46)' }} />
                    )}
                  </div>
                  {item.label}
                </button>
              )
            }
            return (
              <div key={item.href} style={{ position: 'relative' }}
                className={item.href === '/cliente/chat' && haSessioneInCorso ? 'group' : ''}>
                <Link href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: isActive ? 'oklch(0.60 0.15 200 / 15%)' : 'transparent',
                    color: isActive ? 'oklch(0.60 0.15 200)' : 'var(--c-55)',
                    borderLeft: isActive ? '3px solid oklch(0.60 0.15 200)' : '3px solid transparent',
                  }}>
                  <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                  {item.label}
                  {item.href === '/cliente/chat' && unreadCoach > 0 && (
                    <span className="ml-auto text-xs font-black w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'oklch(0.60 0.15 200)', color: 'var(--c-97)' }}>
                      {unreadCoach}
                    </span>
                  )}
                </Link>
                {item.href === '/cliente/chat' && haSessioneInCorso && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-11)', zIndex: 50 }}>
                    Hai un allenamento in corso
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4" style={{ borderTop: '1px solid var(--c-w6)' }}>
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: 'oklch(0.60 0.15 200 / 20%)', color: 'oklch(0.60 0.15 200)' }}>
              {profile.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-97)' }}>
                {profile.full_name}
              </p>
              <p className="text-xs" style={{ color: 'var(--c-45)' }}>Atleta</p>
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

      {/* BOTTOM NAV — solo mobile */}
      <nav className="lg:hidden flex fixed bottom-0 left-0 right-0 z-50"
        style={{
          height: 'calc(64px + env(safe-area-inset-bottom))',
          background: 'oklch(0.13 0 0 / 92%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--c-w6)',
          alignItems: 'flex-start', justifyContent: 'space-around',
          padding: '8px 8px 0',
        }}>
        {navItems.map((item) => {
          const isAllena = item.href === '/cliente/allenamento'
          const href = isAllena ? allenamentoUrl : item.href
          const isActive = pathname.startsWith('/cliente/allenamento')
            ? isAllena
            : pathname === item.href
          if (isAllena) {
            return (
              <button key={item.href}
                onClick={handleAllenamento}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  color: isActive ? 'var(--accent)' : 'var(--c-50)',
                  padding: '4px 4px',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}>
                <div className="relative">
                  <FontAwesomeIcon icon={item.icon} style={{ fontSize: 17 }} />
                  {haSessioneInCorso && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ background: 'var(--accent)', border: '1.5px solid oklch(0.13 0 0)' }} />
                  )}
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em' }}>{item.label}</span>
                {isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', marginTop: -2 }} />}
              </button>
            )
          }
          return (
            <Link key={item.href} href={href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                color: isActive ? 'var(--accent)' : 'var(--c-50)',
                padding: '4px 4px', textDecoration: 'none',
              }}>
              <div className="relative">
                <FontAwesomeIcon icon={item.icon} style={{ fontSize: 17 }} />
                {item.href === '/cliente/chat' && unreadCoach > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full flex items-center justify-center font-black"
                    style={{ background: 'var(--accent)', color: 'var(--c-11)', fontSize: 8 }}>
                    {unreadCoach}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em' }}>{item.label}</span>
              {isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', marginTop: -2 }} />}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
