'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faRightFromBracket, faRotate } from '@fortawesome/free-solid-svg-icons'

export default function CoachPendingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => setUserName(data?.full_name ?? ''))
    })
  }, [])

  const handleCheck = async () => {
    setChecking(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles').select('coach_status').eq('id', user.id).single()

    if (profile?.coach_status === 'approved') {
      router.push('/coach/dashboard')
    } else {
      setChecking(false)
      alert('Il tuo account è ancora in attesa di approvazione. Ti contatteremo al più presto!')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'oklch(0.13 0 0)' }}>
      <div className="w-full max-w-md space-y-8 text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>B</div>
          <span className="font-black text-xl tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
            BYNARI
          </span>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 space-y-6"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>

          {/* Icona animata */}
          <div className="relative mx-auto w-20 h-20">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
              <FontAwesomeIcon icon={faClock} />
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
              style={{ background: 'oklch(0.70 0.19 46)' }} />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest"
              style={{ color: 'oklch(0.70 0.19 46)' }}>
              In attesa di approvazione
            </p>
            <h1 className="text-2xl font-black" style={{ color: 'oklch(0.97 0 0)' }}>
              Ciao{userName ? `, ${userName.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.55 0 0)' }}>
              La tua registrazione come coach è stata ricevuta.
              Il nostro team verificherà il tuo profilo e attiverà l'account
              nel minor tempo possibile.
            </p>
          </div>

          {/* Info box */}
          <div className="rounded-2xl p-4 text-left space-y-2"
            style={{ background: 'oklch(0.14 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'oklch(0.45 0 0)' }}>
              Cosa succede adesso
            </p>
            {[
              'Riceverai una email di conferma',
              'Il team Bynari verificherà il tuo profilo',
              'Una volta approvato potrai accedere alla dashboard',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                  {i + 1}
                </span>
                <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.60 0 0)' }}>{step}</p>
              </div>
            ))}
          </div>

          {/* Bottone controlla stato */}
          <button onClick={handleCheck} disabled={checking}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
            <FontAwesomeIcon icon={faRotate} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Controllo in corso...' : 'Controlla stato approvazione'}
          </button>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          className="flex items-center gap-2 mx-auto text-sm transition-opacity hover:opacity-70"
          style={{ color: 'oklch(0.40 0 0)' }}>
          <FontAwesomeIcon icon={faRightFromBracket} />
          Esci dall'account
        </button>
      </div>
    </div>
  )
}
