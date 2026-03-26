'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDumbbell, faPersonRunning } from '@fortawesome/free-solid-svg-icons'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('code')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Se arriva con codice invito → forza ruolo atleta e non mostrare selezione
  const [role, setRole] = useState<UserRole>(inviteCode ? 'atleta' : 'atleta')
  const [coachNome, setCoachNome] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Recupera il nome del coach dal codice invito
  useEffect(() => {
    if (!inviteCode) return
    const supabase = createClient()
    supabase.from('profiles').select('full_name')
      .eq('coach_code', inviteCode).eq('role', 'coach').single()
      .then(({ data }) => setCoachNome(data?.full_name ?? null))
  }, [inviteCode])

  const handleRegister = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Se c'è un codice invito → crea il record in coach_inviti via API (bypassa RLS)
    if (inviteCode && signUpData.user) {
      const { data: coach } = await supabase
        .from('profiles').select('id').eq('coach_code', inviteCode.toUpperCase()).maybeSingle()

      if (coach) {
        // Piccolo delay per aspettare che il trigger crei il profilo
        await new Promise(r => setTimeout(r, 2500))
        const res = await fetch('/api/coach/crea-invito', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coach_id: coach.id, cliente_id: signUpData.user.id }),
        })
        if (!res.ok) {
          // fallback: prova con il client diretto
          await supabase.from('coach_inviti').insert({
            coach_id: coach.id,
            cliente_id: signUpData.user.id,
            stato: 'pending',
          })
        }
        router.push('/atleta/dashboard?invito=inviato')
        return
      }
    }

    if (role === 'coach') {
      // Piccolo delay per aspettare che il trigger crei il profilo
      await new Promise(r => setTimeout(r, 1500))
      await supabase.from('profiles')
        .update({ coach_status: 'pending' })
        .eq('id', signUpData.user!.id)
      router.push('/coach/pending')
    } else {
      router.push('/atleta/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'oklch(0.13 0 0)' }}>
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div>
          <img src="/logo/Bynari_WO1.png" alt="Bynari" style={{ height: '28px', width: 'auto' }} />
        </div>

        {/* Banner invito coach */}
        {inviteCode && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'oklch(0.70 0.19 46 / 12%)', border: '1px solid oklch(0.70 0.19 46 / 30%)', color: 'oklch(0.80 0 0)' }}>
            🎯 Sei stato invitato da{' '}
            <strong style={{ color: 'oklch(0.97 0 0)' }}>
              {coachNome ?? 'un coach'}
            </strong>.
            Crea il tuo account gratuito per iniziare.
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-3xl font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Crea il tuo account</h1>
          <p style={{ color: 'oklch(0.60 0 0)' }}>Inizia subito, è gratuito</p>
        </div>

        {/* Role selector — nascosto se arriva da invito coach */}
        {!inviteCode && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'coach', label: 'Sono un Coach', icon: faDumbbell, desc: 'Gestisco atleti e schede' },
              { value: 'atleta', label: 'Sono un Atleta', icon: faPersonRunning, desc: 'Mi alleno in autonomia' },
            ].map((r) => (
              <button key={r.value} onClick={() => setRole(r.value as UserRole)}
                className="p-4 rounded-xl text-left transition-all"
                style={{
                  background: role === r.value ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.20 0 0)',
                  border: role === r.value ? '1px solid oklch(0.70 0.19 46 / 60%)' : '1px solid oklch(1 0 0 / 8%)',
                }}>
                <div className="text-2xl mb-2"><FontAwesomeIcon icon={r.icon} /></div>
                <div className="font-semibold text-sm" style={{ color: role === r.value ? 'oklch(0.70 0.19 46)' : 'oklch(0.97 0 0)' }}>
                  {r.label}
                </div>
                <div className="text-xs mt-1" style={{ color: 'oklch(0.55 0 0)' }}>{r.desc}</div>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {[
            { label: 'Nome completo', value: fullName, setter: setFullName, type: 'text', placeholder: 'Mario Rossi' },
            { label: 'Email', value: email, setter: setEmail, type: 'email', placeholder: 'la@tua.email' },
            { label: 'Password', value: password, setter: setPassword, type: 'password', placeholder: '••••••••' },
          ].map((field) => (
            <div key={field.label} className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>{field.label}</label>
              <input type={field.type} value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'oklch(0.20 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
                onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
            </div>
          ))}

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
              {error}
            </div>
          )}

          <button onClick={handleRegister} disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: loading ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)',
              color: 'oklch(0.13 0 0)', cursor: loading ? 'not-allowed' : 'pointer',
            }}>
            {loading ? 'Registrazione in corso...' : 'Crea account →'}
          </button>
        </div>

        <p className="text-center text-sm" style={{ color: 'oklch(0.60 0 0)' }}>
          Hai già un account?{' '}
          <a href={inviteCode ? `/login?code=${inviteCode}` : '/login'}
            className="font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'oklch(0.70 0.19 46)' }}>
            Accedi
          </a>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.13 0 0)' }}>
        <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
