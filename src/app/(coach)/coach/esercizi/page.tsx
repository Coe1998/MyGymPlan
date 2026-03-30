'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faDumbbell } from '@fortawesome/free-solid-svg-icons'

interface Esercizio {
  id: string
  nome: string
  descrizione: string | null
  video_url: string | null
  muscoli: string[] | null
  created_at: string
  is_global: boolean
  coach_id: string | null
}

const MUSCOLI_DISPONIBILI = [
  'Petto', 'Dorsali', 'Spalle', 'Bicipiti', 'Tricipiti',
  'Avambracci', 'Addome', 'Quadricipiti', 'Femorali',
  'Glutei', 'Polpacci', 'Trapezio', 'Lombari'
]

const EMPTY_FORM = {
  nome: '',
  descrizione: '',
  video_url: '',
  muscoli: [] as string[],
}

export default function EserciziPage() {
  const [esercizi, setEsercizi] = useState<Esercizio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const supabase = createClient()

  const fetchEsercizi = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('esercizi')
      .select('*')
      .or('is_global.eq.true,coach_id.eq.' + user.id)
      .order('is_global', { ascending: false })
      .order('nome', { ascending: true })
    setEsercizi(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchEsercizi() }, [])

  const toggleMuscolo = (muscolo: string) => {
    setForm(prev => ({
      ...prev,
      muscoli: prev.muscoli.includes(muscolo)
        ? prev.muscoli.filter(m => m !== muscolo)
        : [...prev.muscoli, muscolo]
    }))
  }

  const handleSave = async () => {
    if (!form.nome.trim()) {
      setError('Il nome è obbligatorio')
      return
    }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingId) {
      const { error } = await supabase
        .from('esercizi')
        .update({
          nome: form.nome.trim(),
          descrizione: form.descrizione.trim() || null,
          video_url: form.video_url.trim() || null,
          muscoli: form.muscoli.length > 0 ? form.muscoli : null,
        })
        .eq('id', editingId)
      if (error) { setError('Errore nel salvataggio'); setSaving(false); return }
    } else {
      const { error } = await supabase
        .from('esercizi')
        .insert({
          coach_id: user.id,
          nome: form.nome.trim(),
          descrizione: form.descrizione.trim() || null,
          video_url: form.video_url.trim() || null,
          muscoli: form.muscoli.length > 0 ? form.muscoli : null,
        })
      if (error) { setError('Errore nel salvataggio'); setSaving(false); return }
    }

    setForm(EMPTY_FORM)
    setShowForm(false)
    setEditingId(null)
    setSaving(false)
    fetchEsercizi()
  }

  const handleEdit = (e: Esercizio) => {
    setForm({
      nome: e.nome,
      descrizione: e.descrizione ?? '',
      video_url: e.video_url ?? '',
      muscoli: e.muscoli ?? [],
    })
    setEditingId(e.id)
    setShowForm(true)
    setError(null)
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Vuoi eliminare "${nome}"? Questa azione è irreversibile.`)) return
    await supabase.from('esercizi').delete().eq('id', id)
    fetchEsercizi()
  }

  const handleCancel = () => {
    setForm(EMPTY_FORM)
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  const filtered = esercizi.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.muscoli?.some(m => m.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
            Esercizi
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
            La tua libreria personale di esercizi
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}
          >
            + Nuovo esercizio
          </button>
        )}
      </div>

      {/* Form creazione/modifica */}
      {showForm && (
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}
        >
          <h2 className="font-bold text-lg" style={{ color: 'oklch(0.97 0 0)' }}>
            {editingId ? 'Modifica esercizio' : 'Nuovo esercizio'}
          </h2>

          {/* Nome */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>
              Nome <span style={{ color: 'oklch(0.70 0.19 46)' }}>*</span>
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="es. Panca Piana"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
              onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'}
            />
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>
              Descrizione
            </label>
            <textarea
              value={form.descrizione}
              onChange={(e) => setForm(p => ({ ...p, descrizione: e.target.value }))}
              placeholder="Istruzioni di esecuzione, note tecniche..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
              onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'}
            />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>
              Link video YouTube
            </label>
            <input
              type="url"
              value={form.video_url}
              onChange={(e) => setForm(p => ({ ...p, video_url: e.target.value }))}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
              onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'}
            />
          </div>

          {/* Muscoli */}
          <div className="space-y-3">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>
              Muscoli coinvolti
            </label>
            <div className="flex flex-wrap gap-2">
              {MUSCOLI_DISPONIBILI.map((muscolo) => {
                const selected = form.muscoli.includes(muscolo)
                return (
                  <button
                    key={muscolo}
                    onClick={() => toggleMuscolo(muscolo)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: selected ? 'oklch(0.70 0.19 46 / 20%)' : 'oklch(0.22 0 0)',
                      color: selected ? 'oklch(0.70 0.19 46)' : 'oklch(0.55 0 0)',
                      border: selected ? '1px solid oklch(0.70 0.19 46 / 50%)' : '1px solid oklch(1 0 0 / 8%)',
                    }}
                  >
                    {muscolo}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 30%)' }}>
              <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: saving ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)',
                color: 'oklch(0.13 0 0)',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Crea esercizio'}
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {esercizi.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome o muscolo..."
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)', color: 'oklch(0.97 0 0)' }}
          onFocus={(e) => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
          onBlur={(e) => e.target.style.borderColor = 'oklch(1 0 0 / 6%)'}
        />
      )}

      {/* Lista esercizi */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}
      >
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Libreria esercizi</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            {esercizi.filter(e => !e.is_global).length} tuoi · {esercizi.filter(e => e.is_global).length} globali
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
          </div>
        ) : esercizi.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-5xl"><FontAwesomeIcon icon={faDumbbell} /></div>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessun esercizio ancora</p>
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
              Crea il tuo primo esercizio per iniziare a costruire le schede
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun esercizio trovato per "{search}"</p>
          </div>
        ) : (
          <div>
            {filtered.map((e, i) => (
              <div
                key={e.id}
                className="flex items-start gap-4 px-6 py-5 group transition-colors"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}
              >
                {/* Icona */}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5"
                  style={{ background: 'oklch(0.70 0.19 46 / 10%)' }}>
                  <FontAwesomeIcon icon={faDumbbell} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>{e.nome}</p>
                  {e.descrizione && (
                    <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.55 0 0)' }}>
                      {e.descrizione}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {e.muscoli?.map(m => (
                      <span key={m} className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
                        {m}
                      </span>
                    ))}
                    {e.video_url && (
                      <a
                        href={e.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
                        style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}
                      >
                        ▶ Video
                      </a>
                    )}
                  </div>
                </div>

                {/* Badge globale o actions */}
                {e.is_global ? (
                  <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                    🌐 Globale
                  </span>
                ) : (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <button
                      onClick={() => handleEdit(e)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(e.id, e.nome)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}
                    >
                      Elimina
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
