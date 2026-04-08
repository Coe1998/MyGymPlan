'use client'

import { useEffect, useState } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUser, faEnvelope, faLock, faTrash,
  faCheck, faTriangleExclamation, faXmark,
} from '@fortawesome/free-solid-svg-icons'

const ONBOARDING_KEY = 'bynari-atleta-onboarding-done'

export default function ImpostazioniPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [msgName, setMsgName] = useState<{ type: 'ok' | 'err', text: string } | null>(null)
  const [msgPassword, setMsgPassword] = useState<{ type: 'ok' | 'err', text: string } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [role, setRole] = useState('')

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      const { data: profile } = await supabase
        .from('profiles').select('full_name, role').eq('id', user.id).single()
      setFullName(profile?.full_name ?? '')
      setRole(profile?.role ?? '')
      setLoading(false)
    }
    fetch()
  }, [])

  const handleSaveName = async () => {
    if (!fullName.trim()) return
    setSavingName(true); setMsgName(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles')
      .update({ full_name: fullName.trim() }).eq('id', user.id)
    setSavingName(false)
    setMsgName(error
      ? { type: 'err', text: 'Errore durante il salvataggio' }
      : { type: 'ok', text: 'Nome aggiornato!' })
    setTimeout(() => setMsgName(null), 3000)
  }

  const handleSavePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setMsgPassword({ type: 'err', text: 'Le password non coincidono' }); return
    }
    if (newPassword.length < 6) {
      setMsgPassword({ type: 'err', text: 'La password deve essere di almeno 6 caratteri' }); return
    }
    setSavingPassword(true); setMsgPassword(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      setMsgPassword({ type: 'err', text: error.message })
    } else {
      setMsgPassword({ type: 'ok', text: 'Password aggiornata!' })
      setNewPassword(''); setConfirmPassword('')
      setTimeout(() => setMsgPassword(null), 3000)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'ELIMINA') return
    setDeleting(true)
    const res = await fetch('/api/account/elimina', { method: 'POST' })
    if (res.ok) {
      await supabase.auth.signOut()
      router.push('/?account=eliminato')
    } else {
      setDeleting(false)
      alert('Errore durante la cancellazione. Riprova.')
    }
  }

  const dashboardUrl = role === 'coach'
    ? '/coach/dashboard'
    : role === 'cliente'
    ? '/cliente/dashboard'
    : '/atleta/dashboard'

  if (loading) return <BynariLoader file="blue" size={80} />

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <button onClick={() => router.push(dashboardUrl)}
          className="text-sm mb-4 inline-block hover:opacity-70" style={{ color: 'oklch(0.50 0 0)' }}>
          ← Dashboard
        </button>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
          Impostazioni
        </h1>
        <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)' }}>
          Gestisci il tuo profilo e la sicurezza dell'account
        </p>
      </div>

      {/* ── Profilo ── */}
      <div className="rounded-2xl p-6 space-y-5"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            <FontAwesomeIcon icon={faUser} />
          </div>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Profilo</h2>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Nome completo</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
            onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
            onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Email</label>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'oklch(0.16 0 0)', border: '1px solid oklch(1 0 0 / 6%)', color: 'oklch(0.50 0 0)' }}>
            <FontAwesomeIcon icon={faEnvelope} />
            <span>{email}</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.40 0 0)' }}>
              Non modificabile
            </span>
          </div>
        </div>

        {msgName && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{
              background: msgName.type === 'ok' ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.65 0.22 27 / 15%)',
              color: msgName.type === 'ok' ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)',
              border: `1px solid ${msgName.type === 'ok' ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(0.65 0.22 27 / 30%)'}`,
            }}>
            <FontAwesomeIcon icon={msgName.type === 'ok' ? faCheck : faTriangleExclamation} /> {msgName.text}
          </div>
        )}

        <button onClick={handleSaveName} disabled={savingName || !fullName.trim()}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
          {savingName ? 'Salvataggio...' : 'Salva nome'}
        </button>
      </div>

      {/* ── Password ── */}
      <div className="rounded-2xl p-6 space-y-5"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
            <FontAwesomeIcon icon={faLock} />
          </div>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Sicurezza</h2>
        </div>

        {[
          { label: 'Nuova password', value: newPassword, setter: setNewPassword },
          { label: 'Conferma password', value: confirmPassword, setter: setConfirmPassword },
        ].map(f => (
          <div key={f.label} className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>{f.label}</label>
            <input type="password" value={f.value} onChange={e => f.setter(e.target.value)}
              placeholder="••••••••" className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.60 0.15 200)'}
              onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
          </div>
        ))}

        {msgPassword && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{
              background: msgPassword.type === 'ok' ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.65 0.22 27 / 15%)',
              color: msgPassword.type === 'ok' ? 'oklch(0.65 0.18 150)' : 'oklch(0.75 0.15 27)',
              border: `1px solid ${msgPassword.type === 'ok' ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(0.65 0.22 27 / 30%)'}`,
            }}>
            <FontAwesomeIcon icon={msgPassword.type === 'ok' ? faCheck : faTriangleExclamation} /> {msgPassword.text}
          </div>
        )}

        <button onClick={handleSavePassword} disabled={savingPassword || !newPassword}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: !newPassword ? 'oklch(0.25 0 0)' : 'oklch(0.60 0.15 200)',
            color: !newPassword ? 'oklch(0.40 0 0)' : 'oklch(0.13 0 0)',
          }}>
          {savingPassword ? 'Aggiornamento...' : 'Aggiorna password'}
        </button>
      </div>


      {/* ── Tutorial ── */}
      <div className="rounded-2xl p-6 space-y-4"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            🎓
          </div>
          <div>
            <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Tutorial</h2>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>
              Rivedi la guida introduttiva all&apos;app
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.55 0 0)' }}>
          Hai già completato il tutorial ma vuoi rivederlo? Clicca qui sotto per ripartire dall&apos;inizio.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem(ONBOARDING_KEY)
            window.location.reload()
          }}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 hover:brightness-110"
          style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          🎓 Rivedi il tutorial
        </button>
      </div>

      {/* ── Zona pericolo ── */}
      <div className="rounded-2xl p-6 space-y-4"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.65 0.22 27 / 25%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
            <FontAwesomeIcon icon={faTrash} />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Zona pericolosa</h2>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>
              Azioni irreversibili sull'account
            </p>
          </div>
        </div>

        <div className="rounded-xl p-4 space-y-3"
          style={{ background: 'oklch(0.65 0.22 27 / 8%)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}>
          <p className="text-sm font-semibold" style={{ color: 'oklch(0.85 0.10 46)' }}>
            Elimina account
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.55 0 0)' }}>
            Tutti i tuoi dati verranno eliminati permanentemente: allenamenti, schede, misurazioni, foto. Questa azione non può essere annullata.
          </p>
          <button onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
            style={{ background: 'oklch(0.65 0.22 27 / 20%)', color: 'oklch(0.75 0.15 27)' }}>
            Elimina il mio account
          </button>
        </div>
      </div>

      {/* ── Modal conferma eliminazione ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'oklch(0 0 0 / 70%)' }}
          onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-5"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.65 0.22 27 / 40%)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
                style={{ background: 'oklch(0.65 0.22 27 / 20%)', color: 'oklch(0.75 0.15 27)' }}>
                <FontAwesomeIcon icon={faTrash} />
              </div>
              {!deleting && (
                <button onClick={() => setShowDeleteModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black" style={{ color: 'oklch(0.97 0 0)' }}>
                Sei sicuro?
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.55 0 0)' }}>
                Questa azione è <strong style={{ color: 'oklch(0.75 0.15 27)' }}>irreversibile</strong>. Tutti i tuoi dati verranno eliminati per sempre.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'oklch(0.70 0 0)' }}>
                Scrivi <strong style={{ color: 'oklch(0.75 0.15 27)' }}>ELIMINA</strong> per confermare
              </label>
              <input type="text" value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="ELIMINA"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(0.65 0.22 27 / 30%)', color: 'oklch(0.97 0 0)' }} />
            </div>

            <div className="space-y-2">
              <button onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'ELIMINA' || deleting}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{
                  background: deleteConfirm === 'ELIMINA' ? 'oklch(0.55 0.20 27)' : 'oklch(0.25 0 0)',
                  color: deleteConfirm === 'ELIMINA' ? 'white' : 'oklch(0.40 0 0)',
                  cursor: deleteConfirm !== 'ELIMINA' ? 'not-allowed' : 'pointer',
                }}>
                {deleting ? 'Eliminazione in corso...' : 'Elimina definitivamente'}
              </button>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
                className="w-full py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
