'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'

export default function NuovaSchedaPage() {
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleCreate = async () => {
    if (!nome.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('schede')
      .insert({
        coach_id: user.id,
        nome: nome.trim(),
        descrizione: descrizione.trim() || null,
        is_template: isTemplate,
      })
      .select()
      .single()

    if (error || !data) {
      setError('Errore nella creazione della scheda')
      setSaving(false)
      return
    }

    // Redirect alla pagina di modifica per aggiungere i giorni
    router.push(`/coach/schede/${data.id}`)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/coach/schede')}
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--c-50)' }}
        >
          ← Indietro
        </button>
        <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--c-97)' }}>
          Nuova scheda
        </h1>
      </div>

      <div
        className="rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>
            Nome scheda <span style={{ color: 'oklch(0.70 0.19 46)' }}>*</span>
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="es. Forza Upper/Lower, Full Body 3x"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
            onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--c-w8)'}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>
            Descrizione
          </label>
          <textarea
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Obiettivi, note generali, durata prevista..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
            style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
            onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--c-w8)'}
          />
        </div>

        <button
          onClick={() => setIsTemplate(!isTemplate)}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all"
          style={{
            background: isTemplate ? 'oklch(0.55 0.20 300 / 10%)' : 'var(--c-22)',
            border: isTemplate ? '1px solid oklch(0.55 0.20 300 / 40%)' : '1px solid var(--c-w8)',
          }}
        >
          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
            style={{
              background: isTemplate ? 'oklch(0.55 0.20 300)' : 'var(--c-30)',
              border: isTemplate ? 'none' : '1px solid var(--c-w20)',
            }}>
            {isTemplate && <FontAwesomeIcon icon={faCheck} style={{ color: 'white' }} className="text-xs" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium" style={{ color: 'var(--c-97)' }}>Salva come template</p>
            <p className="text-xs" style={{ color: 'var(--c-50)' }}>
              Potrai riusare questa scheda come base per altri clienti
            </p>
          </div>
        </button>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
            <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{
              background: saving ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)',
              color: 'var(--c-13)',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Creazione...' : 'Crea e aggiungi giorni →'}
          </button>
          <button
            onClick={() => router.push('/coach/schede')}
            className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'var(--c-22)', color: 'var(--c-60)', border: '1px solid var(--c-w8)' }}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
