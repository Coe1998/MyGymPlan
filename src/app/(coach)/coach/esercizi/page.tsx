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
  gif_url: string | null
  exercisedb_id: string | null
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
  gif_url: '',
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
  const [gifSearch, setGifSearch] = useState('')
  const [filtroGif, setFiltroGif] = useState<'tutti' | 'con-gif' | 'senza-gif'>('tutti')

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
      gif_url: form.gif_url.trim() || null,
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
      gif_url: e.gif_url ?? '',
      muscoli: e.muscoli ?? [],
      tipo_input: e.tipo_input ?? 'reps',
    })
    setGifSearch('')
    setEditingId(e.id); setShowForm(true); setError(null)
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Vuoi eliminare "${nome}"?`)) return
    await supabase.from('esercizi').delete().eq('id', id)
    fetchEsercizi()
  }

  const handleCancel = () => {
    setForm(EMPTY_FORM); setShowForm(false); setEditingId(null); setError(null); setGifSearch('')
  }

  // Risultati per la ricerca GIF nel form (solo globali con gif, cerca per nome)
  const gifResults = gifSearch.trim().length >= 2
    ? esercizi
        .filter(e => e.is_global && e.gif_url && e.nome.toLowerCase().includes(gifSearch.toLowerCase()))
        .slice(0, 8)
    : []

  const filtered = esercizi.filter(e => {
    if (search && !e.nome.toLowerCase().includes(search.toLowerCase()) &&
        !e.muscoli?.some(m => m.toLowerCase().includes(search.toLowerCase()))) return false
    if (filtroTipo === 'miei' && e.is_global) return false
    if (filtroTipo === 'globali' && !e.is_global) return false
    if (filtroMuscolo && !e.muscoli?.includes(filtroMuscolo)) return false
    if (filtroInput && e.tipo_input !== filtroInput) return false
    if (filtroGif === 'con-gif' && !e.gif_url) return false
    if (filtroGif === 'senza-gif' && e.gif_url) return false
    return true
  })

  const visibiliEsercizi = filtered.slice(0, visibili)
  const haAltri = filtered.length > visibili

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--c-97)' }}>Esercizi</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--c-50)' }}>
            {esercizi.filter(e => !e.is_global).length} tuoi · {esercizi.filter(e => e.is_global).length} globali
          </p>
        </div>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)' }}>
            + Nuovo esercizio
          </button>
        )}
      </div>

      {/* Form creazione/modifica */}
      {showForm && (
        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: 'var(--c-18)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
          <h2 className="font-bold text-lg" style={{ color: 'var(--c-97)' }}>
            {editingId ? 'Modifica esercizio' : 'Nuovo esercizio'}
          </h2>

          {/* Nome */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>
              Nome <span style={{ color: 'oklch(0.70 0.19 46)' }}>*</span>
            </label>
            <input type="text" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="es. Panca Piana"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />
          </div>

          {/* Tipo input — nuovo */}
          <div className="space-y-3">
            <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>
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
                      background: selected ? 'oklch(0.70 0.19 46 / 15%)' : 'var(--c-22)',
                      border: selected ? '1px solid oklch(0.70 0.19 46 / 60%)' : '1px solid var(--c-w8)',
                    }}>
                    <span className="text-sm font-semibold" style={{ color: selected ? 'oklch(0.70 0.19 46)' : 'var(--c-80)' }}>
                      {opt.label}
                    </span>
                    <span className="text-xs mt-0.5" style={{ color: 'var(--c-50)' }}>
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
            <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>Descrizione</label>
            <textarea value={form.descrizione} onChange={e => setForm(p => ({ ...p, descrizione: e.target.value }))}
              placeholder="Istruzioni di esecuzione, note tecniche..." rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>URL video (opzionale)</label>
            <input type="url" value={form.video_url} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))}
              placeholder="https://youtube.com/..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />
          </div>

          {/* GIF animata */}
          <div className="space-y-3">
            <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>
              GIF animata
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--c-45)' }}>
                collega una GIF da ExerciseDB
              </span>
            </label>

            {/* Anteprima GIF attuale */}
            {form.gif_url && (
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.gif_url} alt="GIF preview" className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'var(--c-70)' }}>GIF collegata</p>
                  <p className="text-xs truncate" style={{ color: 'var(--c-45)' }}>{form.gif_url}</p>
                </div>
                <button type="button" onClick={() => setForm(p => ({ ...p, gif_url: '' }))}
                  className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
                  style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)' }}>
                  Rimuovi
                </button>
              </div>
            )}

            {/* Cerca negli esercizi ExerciseDB già importati */}
            <div className="relative">
              <input
                type="text"
                value={gifSearch}
                onChange={e => setGifSearch(e.target.value)}
                placeholder="Cerca esercizio ExerciseDB per collegare la GIF... (min. 2 caratteri)"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
                onFocus={e => e.target.style.borderColor = 'oklch(0.65 0.18 150)'}
                onBlur={e => e.target.style.borderColor = 'var(--c-w8)'} />
              {gifResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl overflow-hidden shadow-xl"
                  style={{ background: 'var(--c-18)', border: '1px solid var(--c-w8)' }}>
                  {gifResults.map(res => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        setForm(p => ({ ...p, gif_url: res.gif_url! }))
                        setGifSearch('')
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80"
                      style={{ borderBottom: '1px solid var(--c-w4)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={res.gif_url!} alt={res.nome} className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--c-90)' }}>{res.nome}</p>
                        {res.muscoli && (
                          <p className="text-xs" style={{ color: 'var(--c-50)' }}>{res.muscoli.join(', ')}</p>
                        )}
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: 'oklch(0.65 0.18 150)' }}>Collega</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--c-40)' }}>
              Gli esercizi importati da ExerciseDB hanno già la GIF. Per i tuoi esercizi personalizzati, cerca il nome inglese equivalente e collegalo.
            </p>
          </div>

          {/* Muscoli */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--c-80)' }}>Muscoli coinvolti</label>
            <div className="flex flex-wrap gap-2">
              {MUSCOLI_DISPONIBILI.map(muscolo => {
                const selected = form.muscoli.includes(muscolo)
                return (
                  <button key={muscolo} type="button" onClick={() => toggleMuscolo(muscolo)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: selected ? 'oklch(0.60 0.15 200 / 20%)' : 'var(--c-22)',
                      color: selected ? 'oklch(0.60 0.15 200)' : 'var(--c-50)',
                      border: selected ? '1px solid oklch(0.60 0.15 200 / 40%)' : '1px solid var(--c-w8)',
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
              style={{ background: saving ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)', color: 'var(--c-13)' }}>
              {saving ? 'Salvataggio...' : editingId ? 'Salva modifiche' : 'Crea esercizio'}
            </button>
            <button onClick={handleCancel}
              className="px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--c-22)', color: 'var(--c-60)', border: '1px solid var(--c-w8)' }}>
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
          style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)', color: 'var(--c-97)' }}
          onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
          onBlur={e => e.target.style.borderColor = 'var(--c-w6)'} />

        {/* Filtro GIF */}
        <div className="flex gap-2">
          {[
            { id: 'tutti', label: 'Tutti' },
            { id: 'con-gif', label: '🎞 Con GIF' },
            { id: 'senza-gif', label: 'Senza GIF' },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltroGif(f.id as typeof filtroGif)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: filtroGif === f.id ? 'oklch(0.65 0.18 150)' : 'var(--c-22)',
                color: filtroGif === f.id ? 'var(--c-11)' : 'var(--c-55)',
              }}>
              {f.label}
            </button>
          ))}
        </div>

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
                background: filtroTipo === f.id ? 'oklch(0.70 0.19 46)' : 'var(--c-22)',
                color: filtroTipo === f.id ? 'var(--c-11)' : 'var(--c-55)',
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
              background: filtroInput === null ? 'oklch(0.70 0.19 46 / 15%)' : 'var(--c-22)',
              color: filtroInput === null ? 'oklch(0.70 0.19 46)' : 'var(--c-50)',
              border: filtroInput === null ? '1px solid oklch(0.70 0.19 46 / 40%)' : '1px solid var(--c-w8)',
            }}>
            Tutti i tipi
          </button>
          {TIPO_INPUT_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setFiltroInput(filtroInput === opt.value ? null : opt.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filtroInput === opt.value ? 'oklch(0.70 0.19 46 / 15%)' : 'var(--c-22)',
                color: filtroInput === opt.value ? 'oklch(0.70 0.19 46)' : 'var(--c-50)',
                border: filtroInput === opt.value ? '1px solid oklch(0.70 0.19 46 / 40%)' : '1px solid var(--c-w8)',
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
              background: filtroMuscolo === null ? 'oklch(0.60 0.15 200 / 20%)' : 'var(--c-22)',
              color: filtroMuscolo === null ? 'oklch(0.60 0.15 200)' : 'var(--c-50)',
              border: filtroMuscolo === null ? '1px solid oklch(0.60 0.15 200 / 40%)' : '1px solid var(--c-w8)',
            }}>
            Tutti i muscoli
          </button>
          {MUSCOLI_DISPONIBILI.map(m => (
            <button key={m} onClick={() => setFiltroMuscolo(filtroMuscolo === m ? null : m)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: filtroMuscolo === m ? 'oklch(0.60 0.15 200 / 20%)' : 'var(--c-22)',
                color: filtroMuscolo === m ? 'oklch(0.60 0.15 200)' : 'var(--c-50)',
                border: filtroMuscolo === m ? '1px solid oklch(0.60 0.15 200 / 40%)' : '1px solid var(--c-w8)',
              }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--c-w6)' }}>
          <h2 className="font-bold" style={{ color: 'var(--c-97)' }}>Libreria esercizi</h2>
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
            <p className="font-semibold" style={{ color: 'var(--c-97)' }}>
              {search || filtroTipo !== 'tutti' || filtroMuscolo || filtroInput ? 'Nessun risultato' : 'Nessun esercizio ancora'}
            </p>
            <p className="text-sm" style={{ color: 'var(--c-45)' }}>
              {search || filtroTipo !== 'tutti' || filtroMuscolo || filtroInput ? 'Prova a cambiare i filtri' : 'Crea il tuo primo esercizio'}
            </p>
          </div>
        ) : (
          <>
            {visibiliEsercizi.map((e, i) => {
              const badge = TIPO_INPUT_BADGE[e.tipo_input ?? 'reps']
              return (
                <div key={e.id} className="flex items-start gap-4 px-6 py-5 group transition-colors"
                  style={{ borderBottom: i < visibiliEsercizi.length - 1 || haAltri ? '1px solid var(--c-w4)' : 'none' }}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{ background: e.is_global ? 'oklch(0.65 0.18 150 / 10%)' : 'oklch(0.70 0.19 46 / 10%)' }}>
                    {e.gif_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.gif_url} alt={e.nome} className="w-full h-full object-cover"
                        onError={ev => {
                          const el = ev.target as HTMLImageElement
                          el.style.display = 'none'
                          el.parentElement!.innerHTML = `<svg style="width:24px;height:24px;color:${e.is_global ? 'oklch(0.65 0.18 150)' : 'oklch(0.70 0.19 46)'}" fill="currentColor" viewBox="0 0 24 24"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z"/></svg>`
                        }} />
                    ) : (
                      <FontAwesomeIcon icon={faDumbbell} style={{ color: e.is_global ? 'oklch(0.65 0.18 150)' : 'oklch(0.70 0.19 46)', fontSize: 20 }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold" style={{ color: 'var(--c-97)' }}>{e.nome}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </div>
                    {e.descrizione && (
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--c-55)' }}>{e.descrizione}</p>
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

                  <div className="flex flex-col gap-1.5 items-end flex-shrink-0 mt-0.5">
                    {e.is_global && (
                      <span className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)' }}>
                        🌐 Globale
                      </span>
                    )}
                    {e.gif_url && (
                      <span className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}>
                        🎞 GIF
                      </span>
                    )}
                    {!e.is_global && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(e)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: 'var(--c-22)', color: 'var(--c-70)', border: '1px solid var(--c-w8)' }}>
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
                </div>
              )
            })}

            {haAltri && (
              <div className="px-6 py-4 text-center">
                <button onClick={() => setVisibili(v => v + PAGE_SIZE)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 active:scale-95"
                  style={{ background: 'var(--c-22)', color: 'var(--c-70)', border: '1px solid var(--c-w8)' }}>
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
