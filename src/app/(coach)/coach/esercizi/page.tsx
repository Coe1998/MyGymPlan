'use client'

import { useEffect, useMemo, useState } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faDumbbell } from '@fortawesome/free-solid-svg-icons'

interface Esercizio {
  id: string
  nome: string
  descrizione: string | null
  video_url: string | null
  muscoli: string[] | null
  tipo_input: 'reps' | 'reps_unilaterale' | 'timer' | 'timer_unilaterale'
  created_at: string
  is_global: boolean
  coach_id: string | null
}

const MUSCOLI_DISPONIBILI = [
  'Petto', 'Dorsali', 'Spalle', 'Bicipiti', 'Tricipiti',
  'Avambracci', 'Addome', 'Quadricipiti', 'Femorali',
  'Glutei', 'Polpacci', 'Trapezio', 'Lombari'
]

const TIPO_INPUT_OPTIONS: { value: Esercizio['tipo_input']; label: string; sub: string }[] = [
  { value: 'reps',               label: 'Reps',              sub: 'es. 3 × 8-12' },
  { value: 'reps_unilaterale',   label: 'Unilaterale',       sub: 'sx / dx separati' },
  { value: 'timer',              label: 'Timer',             sub: 'es. planche 30 sec' },
  { value: 'timer_unilaterale',  label: 'Timer Unilaterale', sub: 'es. L-sit 20s SX/DX' },
]

const EMPTY_FORM = {
  nome: '',
  descrizione: '',
  video_url: '',
  muscoli: [] as string[],
  tipo_input: 'reps' as Esercizio['tipo_input'],
}

const TIPO_INPUT_BADGE: Record<Esercizio['tipo_input'], { label: string; bg: string; color: string }> = {
  reps:              { label: 'reps',           bg: 'oklch(0.60 0.15 200 / 12%)', color: 'oklch(0.60 0.15 200)' },
  reps_unilaterale:  { label: 'unilaterale',    bg: 'oklch(0.65 0.18 290 / 12%)', color: 'oklch(0.65 0.18 290)' },
  timer:             { label: 'timer',          bg: 'oklch(0.70 0.19 46 / 12%)',  color: 'oklch(0.70 0.19 46)' },
  timer_unilaterale: { label: 'timer unilat.',  bg: 'oklch(0.75 0.15 100 / 12%)', color: 'oklch(0.75 0.15 100)' },
}

const PAGE_SIZE = 10

export default function EserciziPage() {
  const [esercizi, setEsercizi] = useState<Esercizio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'tutti' | 'miei' | 'globali'>('tutti')
  const [filtroMuscolo, setFiltroMuscolo] = useState<string | null>(null)
  const [filtroInput, setFiltroInput] = useState<Esercizio['tipo_input'] | null>(null)
  const [visibili, setVisibili] = useState(PAGE_SIZE)

  const supabase = useMemo(() => createClient(), [])

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
  useEffect(() => { setVisibili(PAGE_SIZE) }, [search, filtroTipo, filtroMuscolo, filtroInput])

  const toggleMuscolo = (muscolo: string) => {
    setForm(prev => ({
      ...prev,
      muscoli: prev.muscoli.includes(muscolo)
        ? prev.muscoli.filter(m => m !== muscolo)
        : [...prev.muscoli, muscolo]
    }))
  }

  const handleSave = async () => {
    if (!form.nome.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true); setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      nome: form.nome.trim(),
      descrizione: form.descrizione.trim() || null,
      video_url: form.video_url.trim() || null,
      muscoli: form.muscoli.length > 0 ? form.muscoli : null,
      tipo_input: form.tipo_input,
    }

    if (editingId) {
      const { error } = await supabase.from('esercizi').update(payload).eq('id', editingId)
      if (error) { setError('Errore nel salvataggio'); setSaving(false); return }
    } else {
      const { error } = await supabase.from('esercizi').insert({ ...payload, coach_id: user.id })
      if (error) { setError('Errore nel salvataggio'); setSaving(false); return }
    }

    setForm(EMPTY_FORM); setShowForm(false); setEditingId(null)
    setSaving(false); fetchEsercizi()
  }

  const handleEdit = (e: Esercizio) => {
    setForm({
      nome: e.nome,
      descrizione: e.descrizione ?? '',
      video_url: e.video_url ?? '',
      muscoli: e.muscoli ?? [],
      tipo_input: e.tipo_input ?? 'reps',
    })
    setEditingId(e.id); setShowForm(true); setError(null)
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Vuoi eliminare "${nome}"?`)) return
    await supabase.from('esercizi').delete().eq('id', id)
    fetchEsercizi()
  }

  const handleCancel = () => {
    setForm(EMPTY_FORM); setShowForm(false); setEditingId(null); setError(null)
  }

  const filtered = esercizi.filter(e => {
    if (search && !e.nome.toLowerCase().includes(search.toLowerCase()) &&
        !e.muscoli?.some(m => m.toLowerCase().includes(search.toLowerCase()))) return false
    if (filtroTipo === 'miei' && e.is_global) return false
    if (filtroTipo === 'globali' && !e.is_global) return false
    if (filtroMuscolo && !e.muscoli?.includes(filtroMuscolo)) return false
    if (filtroInput && e.tipo_input !== filtroInput) return false
    return true
  })

  const visibiliEsercizi = filtered.slice(0, visibili)
  const haAltri = filtered.length > visibili

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>Esercizi</h1>
          <p className="mt-1 text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
            {esercizi.filter(e => !e.is_global).length} tuoi · {esercizi.filter(e => e.is_global).length} globali
          </p>
        </div>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
            + Nuovo esercizio
          </button>
        )}
      </div>

      {/* Form creazione/modifica */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'oklch(0.97 0 0)' }}>
            {editingId ? 'Modifica esercizio' : 'Nuovo esercizio'}
          </h2>

          {/* Nome */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>
              Nome <span style={{ color: 'oklch(0.70 0.19 46)' }}>*</span>
            </label>
            <input type="text" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="es. Panca Piana"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
          </div>

          {/* Tipo input — nuovo */}
          <div className="space-y-3">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>
              Tipo di input nel logger
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TIPO_INPUT_OPTIONS.map(opt => {
                const selected = form.tipo_input === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, tipo_input: opt.value }))}
                    className="flex flex-col items-start px-4 py-3 rounded-xl text-left transition-all"
                    style={{
                      background: selected ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.22 0 0)',
                      border: selected ? '1px solid oklch(0.70 0.19 46 / 60%)' : '1px solid oklch(1 0 0 / 8%)',
                    }}>
                    <span className="text-sm font-semibold" style={{ color: selected ? 'oklch(0.70 0.19 46)' : 'oklch(0.80 0 0)' }}>
                      {opt.label}
                    </span>
                    <span className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>
                      {opt.sub}
                    </span>
                  </button>
                )
              })}
            </div>
            {(form.tipo_input === 'timer' || form.tipo_input === 'timer_unilaterale') && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'oklch(0.70 0.19 46 / 8%)', color: 'oklch(0.60 0.10 46)' }}>
                Il pre-countdown di preparazione si configura nella scheda, non sull'esercizio.
              </p>
            )}
            {form.tipo_input === 'reps_unilaterale' && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'oklch(0.65 0.18 290 / 8%)', color: 'oklch(0.60 0.10 290)' }}>
                Il logger mostrerà due campi separati per arto sinistro e destro.
              </p>
            )}
            {form.tipo_input === 'timer_unilaterale' && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'oklch(0.75 0.15 100 / 8%)', color: 'oklch(0.65 0.12 100)' }}>
                Il logger mostrerà due timer separati (SX e DX). La durata configurata è l'obiettivo per lato.
              </p>
            )}
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Descrizione</label>
            <textarea value={form.descrizione} onChange={e => setForm(p => ({ ...p, descrizione: e.target.value }))}
              placeholder="Istruzioni di esecuzione, note tecniche..." rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>URL video (opzionale)</label>
            <input type="url" value={form.video_url} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))}
              placeholder="https://youtube.com/..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
          </div>

          {/* Muscoli */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0 0)' }}>Muscoli coinvolti</label>
            <div className="flex flex-wrap gap-2">
              {MUSCOLI_DISPONIBILI.map(muscolo => {
                const selected = form.muscoli.includes(muscolo)
                return (
                  <button key={muscolo} type="button" onClick={() => toggleMuscolo(muscolo)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: selected ? 'oklch(0.60 0.15 200 / 20%)' : 'oklch(0.22 0 0)',
                      color: selected ? 'oklch(0.60 0.15 200)' : 'oklch(0.50 0 0)',
                      border: selected ? '1px solid oklch(0.60 0.15 200 / 40%)' : '1px solid oklch(1 0 0 / 8%)',
                    }}>
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

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: saving ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)', color: 'oklch(0.13 0 0)' }}>
              {saving ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Crea esercizio'}
            </button>
            <button onClick={handleCancel}
              className="px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Filtri */}
      <div className="space-y-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per nome o muscolo..."
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)', color: 'oklch(0.97 0 0)' }}
          onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
          onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 6%)'} />

        {/* Tipo proprietà */}
        <div className="flex gap-2">
          {[
            { id: 'tutti', label: 'Tutti' },
            { id: 'miei', label: '👤 Miei' },
            { id: 'globali', label: '🌐 Globali' },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltroTipo(f.id as typeof filtroTipo)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: filtroTipo === f.id ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                color: filtroTipo === f.id ? 'oklch(0.11 0 0)' : 'oklch(0.55 0 0)',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Filtro tipo input — nuovo */}
        <div className="flex gap-2">
          <button onClick={() => setFiltroInput(null)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: filtroInput === null ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.22 0 0)',
              color: filtroInput === null ? 'oklch(0.70 0.19 46)' : 'oklch(0.50 0 0)',
              border: filtroInput === null ? '1px solid oklch(0.70 0.19 46 / 40%)' : '1px solid oklch(1 0 0 / 8%)',
            }}>
            Tutti i tipi
          </button>
          {TIPO_INPUT_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setFiltroInput(filtroInput === opt.value ? null : opt.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filtroInput === opt.value ? 'oklch(0.70 0.19 46 / 15%)' : 'oklch(0.22 0 0)',
                color: filtroInput === opt.value ? 'oklch(0.70 0.19 46)' : 'oklch(0.50 0 0)',
                border: filtroInput === opt.value ? '1px solid oklch(0.70 0.19 46 / 40%)' : '1px solid oklch(1 0 0 / 8%)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filtro muscolo */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFiltroMuscolo(null)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: filtroMuscolo === null ? 'oklch(0.60 0.15 200 / 20%)' : 'oklch(0.22 0 0)',
              color: filtroMuscolo === null ? 'oklch(0.60 0.15 200)' : 'oklch(0.50 0 0)',
              border: filtroMuscolo === null ? '1px solid oklch(0.60 0.15 200 / 40%)' : '1px solid oklch(1 0 0 / 8%)',
            }}>
            Tutti i muscoli
          </button>
          {MUSCOLI_DISPONIBILI.map(m => (
            <button key={m} onClick={() => setFiltroMuscolo(filtroMuscolo === m ? null : m)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filtroMuscolo === m ? 'oklch(0.60 0.15 200 / 20%)' : 'oklch(0.22 0 0)',
                color: filtroMuscolo === m ? 'oklch(0.60 0.15 200)' : 'oklch(0.50 0 0)',
                border: filtroMuscolo === m ? '1px solid oklch(0.60 0.15 200 / 40%)' : '1px solid oklch(1 0 0 / 8%)',
              }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
          <h2 className="font-bold" style={{ color: 'oklch(0.97 0 0)' }}>Libreria esercizi</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            {filtered.length} risultati
          </span>
        </div>

        {loading ? (
          <BynariLoader file="blue" size={80} />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-5xl"><FontAwesomeIcon icon={faDumbbell} /></div>
            <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>
              {search || filtroTipo !== 'tutti' || filtroMuscolo || filtroInput ? 'Nessun risultato' : 'Nessun esercizio ancora'}
            </p>
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
              {search || filtroTipo !== 'tutti' || filtroMuscolo || filtroInput ? 'Prova a cambiare i filtri' : 'Crea il tuo primo esercizio'}
            </p>
          </div>
        ) : (
          <>
            {visibiliEsercizi.map((e, i) => {
              const badge = TIPO_INPUT_BADGE[e.tipo_input ?? 'reps']
              return (
                <div key={e.id} className="flex items-start gap-4 px-6 py-5 group transition-colors"
                  style={{ borderBottom: i < visibiliEsercizi.length - 1 || haAltri ? '1px solid oklch(1 0 0 / 4%)' : 'none' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5"
                    style={{ background: e.is_global ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.70 0.19 46 / 10%)' }}>
                    <FontAwesomeIcon icon={faDumbbell} style={{ color: e.is_global ? 'oklch(0.65 0.18 150)' : 'oklch(0.70 0.19 46)' }} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>{e.nome}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </div>
                    {e.descrizione && (
                      <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.55 0 0)' }}>{e.descrizione}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {e.muscoli?.map(m => (
                        <span key={m} className="text-xs px-2.5 py-1 rounded-full"
                          style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
                          {m}
                        </span>
                      ))}
                      {e.video_url && (
                        <a href={e.video_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-2.5 py-1 rounded-full"
                          style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                          ▶ Video
                        </a>
                      )}
                    </div>
                  </div>

                  {e.is_global ? (
                    <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                      🌐 Globale
                    </span>
                  ) : (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5">
                      <button onClick={() => handleEdit(e)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                        Modifica
                      </button>
                      <button onClick={() => handleDelete(e.id, e.nome)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 20%)' }}>
                        Elimina
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {haAltri && (
              <div className="px-6 py-4 text-center">
                <button onClick={() => setVisibili(v => v + PAGE_SIZE)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 active:scale-95"
                  style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                  Mostra altri ({filtered.length - visibili} rimasti)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
