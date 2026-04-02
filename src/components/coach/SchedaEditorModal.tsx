'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faPlus, faTrash, faCheck, faPen } from '@fortawesome/free-solid-svg-icons'

interface Esercizio { id: string; nome: string; muscoli: string[] | null; tipo_input?: 'reps' | 'reps_unilaterale' | 'timer' }

interface SchedaEsercizio {
  id: string; esercizio_id: string; serie: number; ripetizioni: string
  recupero_secondi: number; note: string | null; ordine: number
  tipo: string; gruppo_id: string | null
  drop_count: number | null; drop_percentage: number | null
  rest_pause_secondi: number | null; piramidale_direzione: string | null
  alternativa_esercizio_id: string | null
  prepara_secondi: number | null
  progressione_tipo: string
  esercizi: Esercizio
  alternativa_esercizi?: Esercizio | null
}

interface Giorno { id: string; nome: string; ordine: number; scheda_esercizi: SchedaEsercizio[] }

interface EsForm {
  esercizio_id: string; alternativa_id: string
  serie: string; ripetizioni: string; recupero: string; note: string
  tipo: string; gruppo_id: string
  drop_count: string; drop_pct: string
  rest_pause_sec: string; piramide_dir: string
  prepara_secondi: string; progressione_tipo: string
}

const EMPTY: EsForm = {
  esercizio_id: '', alternativa_id: '',
  serie: '3', ripetizioni: '8-12', recupero: '90', note: '',
  tipo: 'normale', gruppo_id: '',
  drop_count: '2', drop_pct: '20',
  rest_pause_sec: '15', piramide_dir: 'ascendente',
  prepara_secondi: '', progressione_tipo: 'peso',
}

const TIPI = [
  { id: 'normale', label: 'Normale', color: 'oklch(0.55 0 0)', bg: 'oklch(0.25 0 0)' },
  { id: 'superset', label: 'Superset', color: 'oklch(0.60 0.15 200)', bg: 'oklch(0.60 0.15 200 / 18%)' },
  { id: 'giant_set', label: 'Giant Set', color: 'oklch(0.65 0.18 150)', bg: 'oklch(0.65 0.18 150 / 18%)' },
  { id: 'dropset', label: 'Dropset', color: 'oklch(0.70 0.19 46)', bg: 'oklch(0.70 0.19 46 / 18%)' },
  { id: 'rest_pause', label: 'Rest-Pause', color: 'oklch(0.65 0.15 300)', bg: 'oklch(0.65 0.15 300 / 18%)' },
  { id: 'piramidale', label: 'Piramidale', color: 'oklch(0.85 0.12 80)', bg: 'oklch(0.85 0.12 80 / 18%)' },
]

const getTipoInfo = (tipo: string) => TIPI.find(t => t.id === tipo) ?? TIPI[0]

// ── Sub-component: exercise form ─────────────────────────────────
function EsercizioForm({ form, onChange, esercizi, gruppi, onSave, onCancel, saving }: {
  form: EsForm
  onChange: (f: EsForm) => void
  esercizi: Esercizio[]
  gruppi: { id: string; label: string }[]
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const [searchP, setSearchP] = useState('')
  const [searchA, setSearchA] = useState('')
  const [filtroMuscolo, setFiltroMuscolo] = useState('')
  const [filtroTipoInput, setFiltroTipoInput] = useState<'reps' | 'reps_unilaterale' | 'timer' | ''>('')
  const [showAlt, setShowAlt] = useState(!!form.alternativa_id)
  const [showCreaEse, setShowCreaEse] = useState(false)
  const [nuovoNome, setNuovoNome] = useState('')
  const [nuovoMuscoli, setNuovoMuscoli] = useState<string[]>([])
  const [creandoEse, setCreandoEse] = useState(false)

  const MUSCOLI = ['Petto', 'Dorsali', 'Spalle', 'Bicipiti', 'Tricipiti', 'Quadricipiti', 'Femorali', 'Glutei', 'Addome', 'Polpacci', 'Trapezio', 'Avambracci']

  const set = (key: keyof EsForm, val: string) => onChange({ ...form, [key]: val })

  const handleCreaEsercizio = async () => {
    if (!nuovoNome.trim()) return
    setCreandoEse(true)
    const supabase = (await import('@/lib/supabase/client')).createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreandoEse(false); return }
    const { data } = await supabase.from('esercizi').insert({
      coach_id: user.id,
      nome: nuovoNome.trim(),
      muscoli: nuovoMuscoli.length > 0 ? nuovoMuscoli : null,
      is_global: false,
    }).select().single()
    if (data) {
      selectEsercizio(data.id)
      setShowCreaEse(false)
      setNuovoNome('')
      setNuovoMuscoli([])
      // Notify parent to refresh esercizi list
      window.dispatchEvent(new CustomEvent('bynari:esercizio-creato', { detail: data }))
    }
    setCreandoEse(false)
  }
  const setMany = (updates: Partial<EsForm>) => onChange({ ...form, ...updates })
  const tipo = getTipoInfo(form.tipo)
  const isGrouped = ['superset', 'giant_set'].includes(form.tipo)

  const primarioNome = esercizi.find(e => e.id === form.esercizio_id)?.nome ?? ''
  const altNome = esercizi.find(e => e.id === form.alternativa_id)?.nome ?? ''

  const filtP = esercizi.filter(e =>
    e.nome.toLowerCase().includes(searchP.toLowerCase()) &&
    (!filtroMuscolo || e.muscoli?.includes(filtroMuscolo)) &&
    (!filtroTipoInput || e.tipo_input === filtroTipoInput)
  ).slice(0, 20)
  const filtA = esercizi.filter(e =>
    e.nome.toLowerCase().includes(searchA.toLowerCase()) && e.id !== form.esercizio_id
  ).slice(0, 15)

  const selectEsercizio = (id: string) => {
    const ese = esercizi.find(e => e.id === id)
    const isTimer = ese?.tipo_input === 'timer'
    onChange({
      ...form,
      esercizio_id: id,
      ripetizioni: isTimer ? '30' : form.ripetizioni === '30' ? '8-12' : form.ripetizioni,
      progressione_tipo: isTimer ? 'durata' : form.progressione_tipo === 'durata' ? 'peso' : form.progressione_tipo,
    })
    setSearchP('')
  }

  return (
    <div className="p-4 space-y-4">

      {/* ── Esercizio primario ── */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0 0)' }}>
          Esercizio *
        </label>
        {/* Muscle filter chips */}
        {!form.esercizio_id && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button onClick={() => setFiltroMuscolo('')}
              className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                background: !filtroMuscolo ? 'oklch(0.70 0.19 46 / 20%)' : 'oklch(0.22 0 0)',
                color: !filtroMuscolo ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)',
              }}>
              Tutti
            </button>
            {MUSCOLI.map(m => (
              <button key={m} onClick={() => setFiltroMuscolo(filtroMuscolo === m ? '' : m)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: filtroMuscolo === m ? 'oklch(0.70 0.19 46 / 20%)' : 'oklch(0.22 0 0)',
                  color: filtroMuscolo === m ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)',
                }}>
                {m}
              </button>
            ))}
          </div>
        )}
        {/* Tipo input filter chips */}
        {!form.esercizio_id && (
          <div className="flex gap-1.5 mb-2">
            {[
              { id: '' as const, label: 'Tutti i tipi' },
              { id: 'reps' as const, label: 'Reps' },
              { id: 'reps_unilaterale' as const, label: 'Unilaterale' },
              { id: 'timer' as const, label: 'Timer' },
            ].map(f => (
              <button key={f.id} onClick={() => setFiltroTipoInput(f.id)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: filtroTipoInput === f.id ? 'oklch(0.60 0.15 200 / 20%)' : 'oklch(0.22 0 0)',
                  color: filtroTipoInput === f.id ? 'oklch(0.60 0.15 200)' : 'oklch(0.45 0 0)',
                  border: filtroTipoInput === f.id ? '1px solid oklch(0.60 0.15 200 / 40%)' : '1px solid transparent',
                }}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {form.esercizio_id ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.70 0.19 46 / 12%)', color: 'oklch(0.97 0 0)', border: '1px solid oklch(0.70 0.19 46 / 25%)' }}>
              {primarioNome}
            </div>
            <button onClick={() => { set('esercizio_id', ''); setSearchP('') }}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}>
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <input type="text" value={searchP} onChange={e => setSearchP(e.target.value)}
              placeholder="Cerca esercizio..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(0.70 0.19 46 / 40%)', color: 'oklch(0.97 0 0)' }} />
            {/* Crea esercizio inline */}
            {!form.esercizio_id && (showCreaEse ? (
              <div className="rounded-xl p-3 space-y-3 mt-1"
                style={{ background: 'oklch(0.20 0 0)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'oklch(0.70 0.19 46)' }}>
                  Crea nuovo esercizio
                </p>
                <input type="text" value={nuovoNome} onChange={e => setNuovoNome(e.target.value)}
                  placeholder="Nome esercizio *"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'oklch(0.25 0 0)', border: '1px solid oklch(0.70 0.19 46 / 40%)', color: 'oklch(0.97 0 0)' }} />
                <div className="flex flex-wrap gap-1.5">
                  {MUSCOLI.map(m => (
                    <button key={m} onClick={() => setNuovoMuscoli(prev =>
                      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                    )}
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: nuovoMuscoli.includes(m) ? 'oklch(0.70 0.19 46 / 20%)' : 'oklch(0.28 0 0)',
                        color: nuovoMuscoli.includes(m) ? 'oklch(0.70 0.19 46)' : 'oklch(0.45 0 0)',
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreaEsercizio} disabled={creandoEse || !nuovoNome.trim()}
                    className="flex-1 py-2 rounded-xl text-sm font-bold"
                    style={{
                      background: !nuovoNome.trim() ? 'oklch(0.28 0 0)' : 'oklch(0.70 0.19 46)',
                      color: !nuovoNome.trim() ? 'oklch(0.42 0 0)' : 'oklch(0.11 0 0)',
                    }}>
                    {creandoEse ? 'Salvataggio...' : '✓ Crea e seleziona'}
                  </button>
                  <button onClick={() => { setShowCreaEse(false); setNuovoNome(''); setNuovoMuscoli([]) }}
                    className="px-4 py-2 rounded-xl text-sm"
                    style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}>
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowCreaEse(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold mt-1"
                style={{ background: 'oklch(0.20 0 0)', color: 'oklch(0.65 0.15 300)', border: '1px dashed oklch(0.65 0.15 300 / 40%)' }}>
                + Crea nuovo esercizio
              </button>
            ))}

            {(searchP.length > 0 || filtroMuscolo) && (
              <div className="rounded-xl overflow-hidden max-h-44 overflow-y-auto"
                style={{ background: 'oklch(0.20 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                {filtP.length === 0
                  ? <div>
                      <p className="px-4 py-3 text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun risultato</p>
                    </div>
                  : filtP.map((e, i) => (
                    <button key={e.id} onClick={() => { selectEsercizio(e.id) }}
                      className="w-full text-left px-4 py-2.5 transition-all active:opacity-60"
                      style={{ borderBottom: i < filtP.length - 1 ? '1px solid oklch(1 0 0 / 5%)' : 'none' }}>
                      <p className="text-sm font-medium" style={{ color: 'oklch(0.90 0 0)' }}>{e.nome}</p>
                      {e.muscoli && <p className="text-xs mt-0.5" style={{ color: 'oklch(0.48 0 0)' }}>{e.muscoli.slice(0, 3).join(' · ')}</p>}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tipo ── */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0 0)' }}>Tipo</label>
        <div className="flex flex-wrap gap-2">
          {TIPI.map(t => (
            <button key={t.id} onClick={() => setMany({ tipo: t.id, gruppo_id: ['superset','giant_set'].includes(t.id) ? form.gruppo_id : '' })}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
              style={{
                background: form.tipo === t.id ? t.bg : 'oklch(0.23 0 0)',
                color: form.tipo === t.id ? t.color : 'oklch(0.48 0 0)',
                border: form.tipo === t.id ? `1px solid ${t.color}40` : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Gruppo (superset / giant set) ── */}
      {isGrouped && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0 0)' }}>
            Gruppo
          </label>
          <div className="flex flex-wrap gap-2">
            {/* Show as selected when gruppo_id is a new UUID not in existing gruppi */}
            {(() => {
              const isNuovo = !!form.gruppo_id && !gruppi.some(g => g.id === form.gruppo_id)
              return (
                <button onClick={() => {
                  const newId = crypto.randomUUID()
                  set('gruppo_id', newId)
                }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    background: isNuovo ? tipo.bg : 'oklch(0.23 0 0)',
                    color: isNuovo ? tipo.color : 'oklch(0.48 0 0)',
                    border: isNuovo ? `1px solid ${tipo.color}40` : '1px solid transparent',
                  }}>
                  {isNuovo ? `✓ Nuovo gruppo` : '+ Nuovo gruppo'}
                </button>
              )
            })()}
            {gruppi.map(g => (
              <button key={g.id} onClick={() => set('gruppo_id', g.id)}
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: form.gruppo_id === g.id ? tipo.bg : 'oklch(0.23 0 0)',
                  color: form.gruppo_id === g.id ? tipo.color : 'oklch(0.48 0 0)',
                }}>
                Gruppo {g.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Dropset specifics ── */}
      {form.tipo === 'dropset' && (
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl" style={{ background: 'oklch(0.70 0.19 46 / 6%)', border: '1px solid oklch(0.70 0.19 46 / 20%)' }}>
          <div className="space-y-1">
            <label className="text-xs font-semibold" style={{ color: 'oklch(0.70 0.19 46)' }}>N. Drop</label>
            <input type="number" min="1" max="5" value={form.drop_count} onChange={e => set('drop_count', e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none text-center font-bold"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.97 0 0)' }} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold" style={{ color: 'oklch(0.70 0.19 46)' }}>% Riduzione</label>
            <input type="number" min="5" max="50" value={form.drop_pct} onChange={e => set('drop_pct', e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none text-center font-bold"
              style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.97 0 0)' }} />
          </div>
        </div>
      )}

      {/* ── Rest-Pause specifics ── */}
      {form.tipo === 'rest_pause' && (
        <div className="p-3 rounded-xl" style={{ background: 'oklch(0.65 0.15 300 / 6%)', border: '1px solid oklch(0.65 0.15 300 / 20%)' }}>
          <label className="text-xs font-semibold" style={{ color: 'oklch(0.65 0.15 300)' }}>Secondi micro-recupero</label>
          <input type="number" value={form.rest_pause_sec} onChange={e => set('rest_pause_sec', e.target.value)}
            className="mt-1.5 w-full px-3 py-2 rounded-xl text-sm outline-none text-center font-bold"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.97 0 0)' }} />
        </div>
      )}

      {/* ── Piramidale specifics ── */}
      {form.tipo === 'piramidale' && (
        <div className="p-3 rounded-xl" style={{ background: 'oklch(0.85 0.12 80 / 6%)', border: '1px solid oklch(0.85 0.12 80 / 20%)' }}>
          <label className="text-xs font-semibold" style={{ color: 'oklch(0.85 0.12 80)' }}>Direzione</label>
          <div className="flex gap-2 mt-1.5">
            {['ascendente', 'discendente'].map(d => (
              <button key={d} onClick={() => set('piramide_dir', d)}
                className="flex-1 py-2 rounded-xl text-sm font-bold"
                style={{
                  background: form.piramide_dir === d ? 'oklch(0.85 0.12 80 / 20%)' : 'oklch(0.22 0 0)',
                  color: form.piramide_dir === d ? 'oklch(0.85 0.12 80)' : 'oklch(0.48 0 0)',
                }}>
                {d === 'ascendente' ? '↑ Peso cresce' : '↓ Peso cala'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Serie / Reps|Durata / Recupero ── */}
      {(() => {
        const tipoInput = esercizi.find(e => e.id === form.esercizio_id)?.tipo_input ?? 'reps'
        const isTimer = tipoInput === 'timer'
        const isUnilaterale = tipoInput === 'reps_unilaterale'
        const campi = [
          { key: 'serie' as keyof EsForm, label: 'Serie', ph: '3', hint: null },
          {
            key: 'ripetizioni' as keyof EsForm,
            label: isTimer ? 'Durata (sec)' : isUnilaterale ? 'Reps (per lato)' : 'Reps',
            ph: isTimer ? '30' : '8-12',
            hint: isTimer ? 'secondi per serie' : isUnilaterale ? 'sx e dx separati nel logger' : null,
          },
          { key: 'recupero' as keyof EsForm, label: 'Rec. (s)', ph: '90', hint: null },
        ]
        return (
          <div className="grid grid-cols-3 gap-3">
            {campi.map(f => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: isTimer && f.key === 'ripetizioni' ? 'oklch(0.70 0.19 46)' : 'oklch(0.50 0 0)' }}>
                  {f.label}
                </label>
                <input
                  type={isTimer && f.key === 'ripetizioni' ? 'number' : 'text'}
                  min={isTimer && f.key === 'ripetizioni' ? 1 : undefined}
                  value={form[f.key] as string}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.ph}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none text-center font-bold"
                  style={{
                    background: isTimer && f.key === 'ripetizioni' ? 'oklch(0.70 0.19 46 / 10%)' : 'oklch(0.22 0 0)',
                    border: isTimer && f.key === 'ripetizioni' ? '1px solid oklch(0.70 0.19 46 / 40%)' : '1px solid oklch(1 0 0 / 8%)',
                    color: 'oklch(0.97 0 0)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
                  onBlur={e => e.target.style.borderColor = isTimer && f.key === 'ripetizioni' ? 'oklch(0.70 0.19 46 / 40%)' : 'oklch(1 0 0 / 8%)'}
                />
                {f.hint && (
                  <p className="text-xs" style={{ color: 'oklch(0.42 0 0)' }}>{f.hint}</p>
                )}
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Note ── */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0 0)' }}>Note coach</label>
        <input type="text" value={form.note} onChange={e => set('note', e.target.value)}
          placeholder="Indicazioni tecniche, avvertenze..."
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
          onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
          onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'} />
      </div>

      {/* ── Progressione ── */}
      {(() => {
        const tipoInput = esercizi.find(e => e.id === form.esercizio_id)?.tipo_input ?? 'reps'
        const opzioni = tipoInput === 'timer'
          ? [
              { id: 'durata', label: '+ Durata', sub: 'aumenta i secondi' },
              { id: 'serie',  label: '+ Serie',  sub: 'aggiungi una serie' },
              { id: 'manuale', label: 'Manuale', sub: 'coach decide' },
            ]
          : [
              { id: 'peso',   label: '+ Peso',   sub: 'es. +5%' },
              { id: 'serie',  label: '+ Serie',  sub: 'aggiungi una serie' },
              { id: 'reps',   label: '+ Reps',   sub: 'aumenta il range' },
              { id: 'manuale', label: 'Manuale', sub: 'coach decide' },
            ]
        return (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0 0)' }}>
              Progressione
            </label>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${opzioni.length}, 1fr)` }}>
              {opzioni.map(opt => {
                const sel = form.progressione_tipo === opt.id
                return (
                  <button key={opt.id} type="button"
                    onClick={() => set('progressione_tipo', opt.id)}
                    className="flex flex-col items-center px-2 py-2 rounded-xl transition-all"
                    style={{
                      background: sel ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.22 0 0)',
                      border: sel ? '1px solid oklch(0.65 0.18 150 / 50%)' : '1px solid oklch(1 0 0 / 8%)',
                    }}>
                    <span className="text-xs font-bold" style={{ color: sel ? 'oklch(0.65 0.18 150)' : 'oklch(0.65 0 0)' }}>
                      {opt.label}
                    </span>
                    <span className="text-xs mt-0.5" style={{ color: 'oklch(0.42 0 0)' }}>{opt.sub}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Pre-countdown (solo per esercizi timer) ── */}
      {esercizi.find(e => e.id === form.esercizio_id)?.tipo_input === 'timer' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0 0)' }}>
            Pre-countdown preparazione
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number" min="0" max="60"
              value={form.prepara_secondi}
              onChange={e => set('prepara_secondi', e.target.value)}
              placeholder="0"
              className="w-24 px-3 py-2.5 rounded-xl text-sm outline-none text-center font-bold"
              style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.97 0 0)' }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={e => e.target.style.borderColor = 'oklch(1 0 0 / 8%)'}
            />
            <span className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>
              sec · il countdown non viene loggato, parte prima del timer reale
            </span>
          </div>
        </div>
      )}

      {/* ── Alternativa ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.50 0 0)' }}>
            Alternativa
          </label>
          {!showAlt && !form.alternativa_id && (
            <button onClick={() => setShowAlt(true)}
              className="text-xs font-semibold"
              style={{ color: 'oklch(0.65 0.15 300)' }}>
              + Aggiungi
            </button>
          )}
        </div>

        {(showAlt || form.alternativa_id) && (
          form.alternativa_id ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'oklch(0.65 0.15 300 / 12%)', color: 'oklch(0.97 0 0)', border: '1px solid oklch(0.65 0.15 300 / 25%)' }}>
                {altNome}
              </div>
              <button onClick={() => { set('alternativa_id', ''); setShowAlt(false); setSearchA('') }}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}>
                <FontAwesomeIcon icon={faXmark} className="text-xs" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <input type="text" value={searchA} onChange={e => setSearchA(e.target.value)}
                placeholder="Cerca alternativa..."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(0.65 0.15 300 / 40%)', color: 'oklch(0.97 0 0)' }} />
              {searchA.length > 0 && (
                <div className="rounded-xl overflow-hidden max-h-36 overflow-y-auto"
                  style={{ background: 'oklch(0.20 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                  {filtA.length === 0
                    ? <p className="px-4 py-3 text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun risultato</p>
                    : filtA.map((e, i) => (
                      <button key={e.id} onClick={() => { set('alternativa_id', e.id); setShowAlt(false); setSearchA('') }}
                        className="w-full text-left px-4 py-2.5"
                        style={{ borderBottom: i < filtA.length - 1 ? '1px solid oklch(1 0 0 / 5%)' : 'none' }}>
                        <p className="text-sm font-medium" style={{ color: 'oklch(0.90 0 0)' }}>{e.nome}</p>
                      </button>
                    ))}
                </div>
              )}
              <button onClick={() => { setShowAlt(false); setSearchA('') }}
                className="text-xs" style={{ color: 'oklch(0.45 0 0)' }}>Annulla</button>
            </div>
          )
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-1">
        <button onClick={onSave} disabled={saving || !form.esercizio_id}
          className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          style={{
            background: !form.esercizio_id ? 'oklch(0.28 0 0)' : 'oklch(0.70 0.19 46)',
            color: !form.esercizio_id ? 'oklch(0.42 0 0)' : 'oklch(0.11 0 0)',
            cursor: !form.esercizio_id ? 'not-allowed' : 'pointer',
          }}>
          <FontAwesomeIcon icon={faCheck} />
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
        <button onClick={onCancel}
          className="px-5 py-3 rounded-xl text-sm font-medium"
          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
          Annulla
        </button>
      </div>
    </div>
  )
}

// ── Main Modal ───────────────────────────────────────────────────
export default function SchedaEditorModal({
  schedaId, schedaNome, onClose,
}: {
  schedaId: string; schedaNome: string; onClose: () => void
}) {
  const supabase = createClient()
  const [giorni, setGiorni] = useState<Giorno[]>([])
  const [esercizi, setEsercizi] = useState<Esercizio[]>([])
  const [loading, setLoading] = useState(true)
  const [activeGiorno, setActiveGiorno] = useState<string | null>(null)
  const [addingGiorno, setAddingGiorno] = useState(false)
  const [newGiornoNome, setNewGiornoNome] = useState('')
  const [addingEse, setAddingEse] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EsForm>(EMPTY)
  const [editForm, setEditForm] = useState<EsForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [schedaNomeEdit, setSchedaNomeEdit] = useState(schedaNome)
  const [savingNome, setSavingNome] = useState(false)
  const [richiede_rpe, setRichiede_rpe] = useState(false)
  const [richiede_rir, setRichiede_rir] = useState(false)
  const [savingToggle, setSavingToggle] = useState(false)

  const handleToggleRPE = async (val: boolean) => {
    setRichiede_rpe(val); setSavingToggle(true)
    await supabase.from('schede').update({ richiede_rpe: val }).eq('id', schedaId)
    setSavingToggle(false)
  }
  const handleToggleRIR = async (val: boolean) => {
    setRichiede_rir(val); setSavingToggle(true)
    await supabase.from('schede').update({ richiede_rir: val }).eq('id', schedaId)
    setSavingToggle(false)
  }

  const handleSaveNome = async () => {
    if (!schedaNomeEdit.trim() || schedaNomeEdit === schedaNome) return
    setSavingNome(true)
    await supabase.from('schede').update({ nome: schedaNomeEdit.trim() }).eq('id', schedaId)
    setSavingNome(false)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [giorniRes, eserciziRes, schedaRes] = await Promise.all([
      supabase.from('scheda_giorni')
        .select(`
          id, nome, ordine,
          scheda_esercizi (
            id, esercizio_id, serie, ripetizioni, recupero_secondi, note, ordine,
            tipo, gruppo_id, drop_count, drop_percentage, rest_pause_secondi,
            piramidale_direzione, alternativa_esercizio_id,
            prepara_secondi, progressione_tipo,
            esercizi!scheda_esercizi_esercizio_id_fkey ( id, nome, muscoli, tipo_input ),
            alternativa_esercizi:esercizi!scheda_esercizi_alternativa_esercizio_id_fkey ( id, nome )
          )
        `)
        .eq('scheda_id', schedaId)
        .order('ordine'),
      supabase.from('esercizi')
        .select('id, nome, muscoli, tipo_input')
        .or('is_global.eq.true,coach_id.eq.' + user.id)
        .order('nome'),
      supabase.from('schede')
        .select('richiede_rpe, richiede_rir')
        .eq('id', schedaId)
        .single(),
    ])

    const giorniData = (giorniRes.data as any) ?? []
    setGiorni(giorniData)
    setEsercizi(eserciziRes.data ?? [])
    if (schedaRes.data) {
      setRichiede_rpe(schedaRes.data.richiede_rpe ?? false)
      setRichiede_rir(schedaRes.data.richiede_rir ?? false)
    }
    if (giorniData.length > 0) {
      setActiveGiorno(prev => prev ?? giorniData[0].id)
    }
    setLoading(false)
  }, [schedaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Aggiorna lista esercizi quando ne viene creato uno inline
  useEffect(() => {
    const handler = (e: Event) => {
      const nuovoEse = (e as CustomEvent).detail
      setEsercizi(prev => [...prev, nuovoEse].sort((a, b) => a.nome.localeCompare(b.nome)))
    }
    window.addEventListener('bynari:esercizio-creato', handler)
    return () => window.removeEventListener('bynari:esercizio-creato', handler)
  }, [])

  // Compute gruppo labels for current day
  const getGruppiGiorno = () => {
    // ── Drag & drop ─────────────────────────────────────────────

  const reorderEsercizi = async (fromId: string, toId: string) => {
    if (!activeGiorno || fromId === toId) return
    const giorno = giorni.find(g => g.id === activeGiorno)
    if (!giorno) return
    const lista = [...giorno.scheda_esercizi].sort((a, b) => a.ordine - b.ordine)
    const fromIdx = lista.findIndex(e => e.id === fromId)
    const toIdx = lista.findIndex(e => e.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = lista.splice(fromIdx, 1)
    lista.splice(toIdx, 0, moved)
    // Optimistic UI update
    setGiorni(prev => prev.map(g => g.id !== activeGiorno ? g : {
      ...g, scheda_esercizi: lista.map((e, i) => ({ ...e, ordine: i }))
    }))
    // Persist
    await Promise.all(lista.map((e, i) =>
      supabase.from('scheda_esercizi').update({ ordine: i }).eq('id', e.id)
    ))
  }

  const onPointerDownDrag = (e: React.PointerEvent<Element>, eseId: string, el: HTMLDivElement) => {
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const clone = el.cloneNode(true) as HTMLDivElement
    clone.style.cssText = `position:fixed;z-index:9999;width:${rect.width}px;opacity:0.9;pointer-events:none;
      border-radius:12px;background:oklch(0.28 0 0);box-shadow:0 8px 32px oklch(0 0 0 / 60%);
      left:${rect.left}px;top:${rect.top}px;`
    document.body.appendChild(clone)
    el.style.opacity = '0.3'
    let currentOver: HTMLElement | null = null
    const onMove = (me: PointerEvent) => {
      clone.style.left = `${me.clientX - offset.x}px`
      clone.style.top = `${me.clientY - offset.y}px`
      clone.style.display = 'none'
      const below = document.elementFromPoint(me.clientX, me.clientY)
      clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      if (currentOver && currentOver !== row) {
        currentOver.style.borderTop = ''
        currentOver.style.background = ''
      }
      if (row && row !== el) {
        row.style.borderTop = '2px solid oklch(0.70 0.19 46)'
        row.style.background = 'oklch(0.70 0.19 46 / 8%)'
        currentOver = row
      }
    }
    const onUp = (ue: PointerEvent) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (currentOver) { currentOver.style.borderTop = ''; currentOver.style.background = '' }
      clone.style.display = 'none'
      const below = document.elementFromPoint(ue.clientX, ue.clientY)
      clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      const toId = row?.dataset.eseid
      if (toId && toId !== eseId) reorderEsercizi(eseId, toId)
      el.style.opacity = '1'
      document.body.removeChild(clone)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const giorno = giorni.find(g => g.id === activeGiorno)
    if (!giorno) return []
    const seen = new Map<string, string>()
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for (const ese of [...giorno.scheda_esercizi].sort((a, b) => a.ordine - b.ordine)) {
      if (ese.gruppo_id && !seen.has(ese.gruppo_id)) {
        seen.set(ese.gruppo_id, letters[seen.size % 26])
      }
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }))
  }

  const getGruppoLabel = (gruppoId: string | null) => {
    if (!gruppoId) return null
    return getGruppiGiorno().find(g => g.id === gruppoId)?.label ?? null
  }

  const handleAddGiorno = async () => {
    if (!newGiornoNome.trim()) return
    await supabase.from('scheda_giorni').insert({
      scheda_id: schedaId, nome: newGiornoNome.trim(), ordine: giorni.length,
    })
    setNewGiornoNome(''); setAddingGiorno(false)
    const res = await supabase.from('scheda_giorni')
      .select('id, nome, ordine').eq('scheda_id', schedaId).order('ordine')
    const last = (res.data ?? []).at(-1)
    await fetchAll()
    if (last) setActiveGiorno(last.id)
  }

  const handleDeleteGiorno = async (giornoId: string) => {
    if (!confirm('Eliminare questo giorno e tutti i suoi esercizi?')) return
    await supabase.from('scheda_giorni').delete().eq('id', giornoId)
    const resto = giorni.filter(g => g.id !== giornoId)
    setActiveGiorno(resto[0]?.id ?? null)
    await fetchAll()
  }

  const buildPayload = (f: EsForm, giornoId: string, ordine: number) => {
    let gruppoId: string | null = null
    if (['superset', 'giant_set'].includes(f.tipo)) {
      gruppoId = f.gruppo_id && f.gruppo_id !== '' ? f.gruppo_id : crypto.randomUUID()
    }
    return {
      giorno_id: giornoId,
      esercizio_id: f.esercizio_id,
      alternativa_esercizio_id: f.alternativa_id || null,
      serie: parseInt(f.serie) || 3,
      ripetizioni: f.ripetizioni.trim() || (f.progressione_tipo === 'durata' ? '30' : '8-12'),
      recupero_secondi: parseInt(f.recupero) || 90,
      note: f.note.trim() || null,
      ordine,
      tipo: f.tipo,
      gruppo_id: gruppoId || null,
      drop_count: f.tipo === 'dropset' ? (parseInt(f.drop_count) || 2) : null,
      drop_percentage: f.tipo === 'dropset' ? (parseInt(f.drop_pct) || 20) : null,
      rest_pause_secondi: f.tipo === 'rest_pause' ? (parseInt(f.rest_pause_sec) || 15) : null,
      piramidale_direzione: f.tipo === 'piramidale' ? f.piramide_dir : null,
      prepara_secondi: f.prepara_secondi ? (parseInt(f.prepara_secondi) || null) : null,
      progressione_tipo: f.progressione_tipo || 'peso',
    }
  }

  const handleSaveEse = async () => {
    if (!form.esercizio_id || !activeGiorno) return
    setSaving(true)
    // ── Drag & drop ─────────────────────────────────────────────

  const reorderEsercizi = async (fromId: string, toId: string) => {
    if (!activeGiorno || fromId === toId) return
    const giorno = giorni.find(g => g.id === activeGiorno)
    if (!giorno) return
    const lista = [...giorno.scheda_esercizi].sort((a, b) => a.ordine - b.ordine)
    const fromIdx = lista.findIndex(e => e.id === fromId)
    const toIdx = lista.findIndex(e => e.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = lista.splice(fromIdx, 1)
    lista.splice(toIdx, 0, moved)
    // Optimistic UI update
    setGiorni(prev => prev.map(g => g.id !== activeGiorno ? g : {
      ...g, scheda_esercizi: lista.map((e, i) => ({ ...e, ordine: i }))
    }))
    // Persist
    await Promise.all(lista.map((e, i) =>
      supabase.from('scheda_esercizi').update({ ordine: i }).eq('id', e.id)
    ))
  }

  const onPointerDownDrag = (e: React.PointerEvent<Element>, eseId: string, el: HTMLDivElement) => {
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const clone = el.cloneNode(true) as HTMLDivElement
    clone.style.cssText = `position:fixed;z-index:9999;width:${rect.width}px;opacity:0.9;pointer-events:none;
      border-radius:12px;background:oklch(0.28 0 0);box-shadow:0 8px 32px oklch(0 0 0 / 60%);
      left:${rect.left}px;top:${rect.top}px;`
    document.body.appendChild(clone)
    el.style.opacity = '0.3'
    let currentOver: HTMLElement | null = null
    const onMove = (me: PointerEvent) => {
      clone.style.left = `${me.clientX - offset.x}px`
      clone.style.top = `${me.clientY - offset.y}px`
      clone.style.display = 'none'
      const below = document.elementFromPoint(me.clientX, me.clientY)
      clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      if (currentOver && currentOver !== row) {
        currentOver.style.borderTop = ''
        currentOver.style.background = ''
      }
      if (row && row !== el) {
        row.style.borderTop = '2px solid oklch(0.70 0.19 46)'
        row.style.background = 'oklch(0.70 0.19 46 / 8%)'
        currentOver = row
      }
    }
    const onUp = (ue: PointerEvent) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (currentOver) { currentOver.style.borderTop = ''; currentOver.style.background = '' }
      clone.style.display = 'none'
      const below = document.elementFromPoint(ue.clientX, ue.clientY)
      clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      const toId = row?.dataset.eseid
      if (toId && toId !== eseId) reorderEsercizi(eseId, toId)
      el.style.opacity = '1'
      document.body.removeChild(clone)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const giorno = giorni.find(g => g.id === activeGiorno)
    const ordine = giorno?.scheda_esercizi?.length ?? 0
    await supabase.from('scheda_esercizi').insert(buildPayload(form, activeGiorno, ordine))
    setForm(EMPTY); setAddingEse(false); setSaving(false)
    await fetchAll()
  }

  const handleSaveEdit = async () => {
    if (!editingId || !activeGiorno) return
    setSaving(true)
    // ── Drag & drop ─────────────────────────────────────────────

  const reorderEsercizi = async (fromId: string, toId: string) => {
    if (!activeGiorno || fromId === toId) return
    const giorno = giorni.find(g => g.id === activeGiorno)
    if (!giorno) return
    const lista = [...giorno.scheda_esercizi].sort((a, b) => a.ordine - b.ordine)
    const fromIdx = lista.findIndex(e => e.id === fromId)
    const toIdx = lista.findIndex(e => e.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = lista.splice(fromIdx, 1)
    lista.splice(toIdx, 0, moved)
    // Optimistic UI update
    setGiorni(prev => prev.map(g => g.id !== activeGiorno ? g : {
      ...g, scheda_esercizi: lista.map((e, i) => ({ ...e, ordine: i }))
    }))
    // Persist
    await Promise.all(lista.map((e, i) =>
      supabase.from('scheda_esercizi').update({ ordine: i }).eq('id', e.id)
    ))
  }

  const onPointerDownDrag = (e: React.PointerEvent<Element>, eseId: string, el: HTMLDivElement) => {
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const clone = el.cloneNode(true) as HTMLDivElement
    clone.style.cssText = `position:fixed;z-index:9999;width:${rect.width}px;opacity:0.9;pointer-events:none;
      border-radius:12px;background:oklch(0.28 0 0);box-shadow:0 8px 32px oklch(0 0 0 / 60%);
      left:${rect.left}px;top:${rect.top}px;`
    document.body.appendChild(clone)
    el.style.opacity = '0.3'
    let currentOver: HTMLElement | null = null
    const onMove = (me: PointerEvent) => {
      clone.style.left = `${me.clientX - offset.x}px`
      clone.style.top = `${me.clientY - offset.y}px`
      clone.style.display = 'none'
      const below = document.elementFromPoint(me.clientX, me.clientY)
      clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      if (currentOver && currentOver !== row) {
        currentOver.style.borderTop = ''
        currentOver.style.background = ''
      }
      if (row && row !== el) {
        row.style.borderTop = '2px solid oklch(0.70 0.19 46)'
        row.style.background = 'oklch(0.70 0.19 46 / 8%)'
        currentOver = row
      }
    }
    const onUp = (ue: PointerEvent) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (currentOver) { currentOver.style.borderTop = ''; currentOver.style.background = '' }
      clone.style.display = 'none'
      const below = document.elementFromPoint(ue.clientX, ue.clientY)
      clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      const toId = row?.dataset.eseid
      if (toId && toId !== eseId) reorderEsercizi(eseId, toId)
      el.style.opacity = '1'
      document.body.removeChild(clone)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const giorno = giorni.find(g => g.id === activeGiorno)
    const ordine = giorno?.scheda_esercizi?.find(e => e.id === editingId)?.ordine ?? 0
    const { giorno_id, ...payload } = buildPayload(editForm, activeGiorno, ordine) as any
    await supabase.from('scheda_esercizi').update(payload).eq('id', editingId)
    setEditingId(null); setSaving(false)
    await fetchAll()
  }

  const handleDeleteEse = async (id: string) => {
    await supabase.from('scheda_esercizi').delete().eq('id', id)
    if (editingId === id) setEditingId(null)
    await fetchAll()
  }

  // ── Drag & drop ─────────────────────────────────────────────

  const reorderEsercizi = async (fromId: string, toId: string) => {
    if (!activeGiorno || fromId === toId) return
    const giorno = giorni.find(g => g.id === activeGiorno)
    if (!giorno) return
    const lista = [...giorno.scheda_esercizi].sort((a, b) => a.ordine - b.ordine)
    const fromIdx = lista.findIndex(e => e.id === fromId)
    const toIdx = lista.findIndex(e => e.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = lista.splice(fromIdx, 1)
    lista.splice(toIdx, 0, moved)
    // Optimistic UI update
    setGiorni(prev => prev.map(g => g.id !== activeGiorno ? g : {
      ...g, scheda_esercizi: lista.map((e, i) => ({ ...e, ordine: i }))
    }))
    // Persist
    await Promise.all(lista.map((e, i) =>
      supabase.from('scheda_esercizi').update({ ordine: i }).eq('id', e.id)
    ))
  }

  const onPointerDownDrag = (e: React.PointerEvent<Element>, eseId: string, el: HTMLDivElement) => {
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const clone = el.cloneNode(true) as HTMLDivElement
    clone.style.cssText = `position:fixed;z-index:9999;width:${rect.width}px;opacity:0.9;pointer-events:none;
      border-radius:12px;background:oklch(0.28 0 0);box-shadow:0 8px 32px oklch(0 0 0 / 60%);
      left:${rect.left}px;top:${rect.top}px;`
    document.body.appendChild(clone)
    el.style.opacity = '0.3'
    let currentOver: HTMLElement | null = null
    const onMove = (me: PointerEvent) => {
      clone.style.left = `${me.clientX - offset.x}px`
      clone.style.top = `${me.clientY - offset.y}px`
      clone.style.display = 'none'
      const below = document.elementFromPoint(me.clientX, me.clientY)
      clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      if (currentOver && currentOver !== row) {
        currentOver.style.borderTop = ''
        currentOver.style.background = ''
      }
      if (row && row !== el) {
        row.style.borderTop = '2px solid oklch(0.70 0.19 46)'
        row.style.background = 'oklch(0.70 0.19 46 / 8%)'
        currentOver = row
      }
    }
    const onUp = (ue: PointerEvent) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (currentOver) { currentOver.style.borderTop = ''; currentOver.style.background = '' }
      clone.style.display = 'none'
      const below = document.elementFromPoint(ue.clientX, ue.clientY)
      clone.style.display = ''
      const row = below?.closest('[data-eseid]') as HTMLElement | null
      const toId = row?.dataset.eseid
      if (toId && toId !== eseId) reorderEsercizi(eseId, toId)
      el.style.opacity = '1'
      document.body.removeChild(clone)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const giorno = giorni.find(g => g.id === activeGiorno)
  const eserciziGiorno = [...(giorno?.scheda_esercizi ?? [])].sort((a, b) => a.ordine - b.ordine)
  const gruppiGiorno = getGruppiGiorno()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'oklch(0 0 0 / 75%)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full max-w-2xl flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: 'oklch(0.15 0 0)',
          border: '1px solid oklch(1 0 0 / 10%)',
          maxHeight: '92vh',
        }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'oklch(0.70 0.19 46)' }}>
              Editor Scheda
            </p>
            <input
              value={schedaNomeEdit}
              onChange={e => setSchedaNomeEdit(e.target.value)}
              onBlur={handleSaveNome}
              onKeyDown={e => e.key === 'Enter' && handleSaveNome()}
              className="w-full text-lg font-black leading-tight outline-none bg-transparent border-b"
              style={{
                color: 'oklch(0.97 0 0)',
                borderColor: 'oklch(1 0 0 / 15%)',
                paddingBottom: '2px',
              }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
            />
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
          </div>
        ) : (
          <>
        {/* ── Impostazioni scheda (RPE / RIR) ── */}
        {!loading && (
          <div className="flex items-center gap-4 px-5 py-2.5 flex-shrink-0"
            style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)', background: 'oklch(0.13 0 0)' }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.40 0 0)' }}>
              Misura intensità
            </span>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => handleToggleRPE(!richiede_rpe)}
                className="relative flex-shrink-0"
                style={{
                  width: 32, height: 18,
                  borderRadius: 9,
                  background: richiede_rpe ? 'oklch(0.70 0.19 46)' : 'oklch(0.28 0 0)',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                }}>
                <div style={{
                  position: 'absolute', top: 2, left: richiede_rpe ? 14 : 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </div>
              <span className="text-xs font-medium" style={{ color: richiede_rpe ? 'oklch(0.75 0.10 46)' : 'oklch(0.45 0 0)' }}>
                RPE
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => handleToggleRIR(!richiede_rir)}
                className="relative flex-shrink-0"
                style={{
                  width: 32, height: 18,
                  borderRadius: 9,
                  background: richiede_rir ? 'oklch(0.70 0.19 46)' : 'oklch(0.28 0 0)',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                }}>
                <div style={{
                  position: 'absolute', top: 2, left: richiede_rir ? 14 : 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </div>
              <span className="text-xs font-medium" style={{ color: richiede_rir ? 'oklch(0.75 0.10 46)' : 'oklch(0.45 0 0)' }}>
                RIR
              </span>
            </label>
            {savingToggle && <span className="text-xs" style={{ color: 'oklch(0.40 0 0)' }}>salvataggio...</span>}
          </div>
        )}

        {/* ── Day tabs ── */}
            <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto flex-shrink-0 scrollbar-none"
              style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}>
              {giorni.map(g => (
                <button key={g.id}
                  onClick={() => { setActiveGiorno(g.id); setAddingEse(false); setEditingId(null) }}
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                  style={{
                    background: activeGiorno === g.id ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
                    color: activeGiorno === g.id ? 'oklch(0.11 0 0)' : 'oklch(0.55 0 0)',
                  }}>
                  {g.nome}
                </button>
              ))}

              {addingGiorno ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input autoFocus value={newGiornoNome}
                    onChange={e => setNewGiornoNome(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddGiorno(); if (e.key === 'Escape') setAddingGiorno(false) }}
                    placeholder="Nome..."
                    className="w-28 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(0.70 0.19 46 / 50%)', color: 'oklch(0.97 0 0)' }} />
                  <button onClick={handleAddGiorno}
                    className="px-3 py-2 rounded-xl text-sm font-bold"
                    style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}>✓</button>
                  <button onClick={() => setAddingGiorno(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>✕</button>
                </div>
              ) : (
                <button onClick={() => setAddingGiorno(true)}
                  className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              )}
            </div>

            {/* ── Exercise list ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {!activeGiorno ? (
                <div className="py-12 text-center">
                  <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Aggiungi un giorno per iniziare</p>
                </div>
              ) : (
                <>
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold" style={{ color: 'oklch(0.45 0 0)' }}>
                      {eserciziGiorno.length} {eserciziGiorno.length === 1 ? 'esercizio' : 'esercizi'}
                    </p>
                    <button onClick={() => handleDeleteGiorno(activeGiorno)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'oklch(0.65 0.22 27 / 10%)', color: 'oklch(0.70 0.20 27)' }}>
                      Elimina giorno
                    </button>
                  </div>

                  {/* Exercises */}
                  {eserciziGiorno.map((ese, i) => {
                    const gruppoLabel = getGruppoLabel(ese.gruppo_id)
                    const isGrouped = !!ese.gruppo_id
                    const tipoInfo = getTipoInfo(ese.tipo)
                    const isEditing = editingId === ese.id
                    const prevEse = eserciziGiorno[i - 1]
                    const isFirstInGroup = isGrouped && (!prevEse || prevEse.gruppo_id !== ese.gruppo_id)
                    const nextEse = eserciziGiorno[i + 1]
                    const isLastInGroup = isGrouped && (!nextEse || nextEse.gruppo_id !== ese.gruppo_id)

                    return (
                      <div key={ese.id}
                        data-eseid={ese.id}
                        style={{ marginLeft: isGrouped ? '1rem' : '0' }}>

                        {/* Group label */}
                        {isFirstInGroup && (
                          <div className="flex items-center gap-2 mb-1.5 -ml-4">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                              style={{ background: tipoInfo.bg, color: tipoInfo.color }}>
                              {gruppoLabel}
                            </div>
                            <span className="text-xs font-bold" style={{ color: tipoInfo.color }}>
                              {tipoInfo.label}
                            </span>
                            <div className="flex-1 h-px" style={{ background: `${tipoInfo.color}30` }} />
                          </div>
                        )}

                        <div className="rounded-2xl overflow-hidden"
                          style={{
                            background: 'oklch(0.19 0 0)',
                            border: `1px solid ${isGrouped ? `${tipoInfo.color}30` : 'oklch(1 0 0 / 6%)'}`,
                            borderLeft: isGrouped ? `3px solid ${tipoInfo.color}` : undefined,
                            marginBottom: isGrouped && !isLastInGroup ? '2px' : undefined,
                            borderRadius: isGrouped && !isFirstInGroup && !isLastInGroup ? '0.75rem' : undefined,
                          }}>

                          {!isEditing ? (
                            // Compact row
                            <div className="flex items-start gap-3 px-4 py-3">
                              {/* Drag handle */}
                              <div
                                className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none mt-1"
                                style={{ color: 'oklch(0.35 0 0)', padding: '2px' }}
                                onPointerDown={(e) => {
                                  const row = (e.currentTarget as HTMLElement).closest('[data-eseid]') as HTMLDivElement
                                  if (row) onPointerDownDrag(e, ese.id, row)
                                }}>
                                ⠿
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
                                  {ese.esercizi?.nome}
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {ese.tipo !== 'normale' && (
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                      style={{ background: tipoInfo.bg, color: tipoInfo.color }}>
                                      {tipoInfo.label}
                                    </span>
                                  )}
                                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.60 0 0)' }}>
                                    {ese.serie}×{ese.ripetizioni}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.60 0 0)' }}>
                                    {ese.recupero_secondi}s rec.
                                  </span>
                                  {ese.progressione_tipo && ese.progressione_tipo !== 'peso' && (
                                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'oklch(0.65 0.18 150 / 10%)', color: 'oklch(0.65 0.18 150)' }}>
                                      prog. {ese.progressione_tipo}
                                    </span>
                                  )}
                                  {ese.prepara_secondi && (
                                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'oklch(0.70 0.19 46 / 10%)', color: 'oklch(0.70 0.19 46)' }}>
                                      {ese.prepara_secondi}s prep.
                                    </span>
                                  )}
                                  {ese.tipo === 'dropset' && ese.drop_count && (
                                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'oklch(0.70 0.19 46 / 10%)', color: 'oklch(0.70 0.19 46)' }}>
                                      {ese.drop_count} drop · -{ese.drop_percentage}%
                                    </span>
                                  )}
                                  {ese.tipo === 'rest_pause' && ese.rest_pause_secondi && (
                                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'oklch(0.65 0.15 300 / 10%)', color: 'oklch(0.65 0.15 300)' }}>
                                      {ese.rest_pause_secondi}s micro-rec.
                                    </span>
                                  )}
                                  {ese.tipo === 'piramidale' && ese.piramidale_direzione && (
                                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'oklch(0.85 0.12 80 / 10%)', color: 'oklch(0.85 0.12 80)' }}>
                                      {ese.piramidale_direzione === 'ascendente' ? '↑' : '↓'} {ese.piramidale_direzione}
                                    </span>
                                  )}
                                  {ese.alternativa_esercizi && (
                                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'oklch(0.65 0.15 300 / 10%)', color: 'oklch(0.65 0.15 300)' }}>
                                      Alt: {(ese.alternativa_esercizi as any)?.nome}
                                    </span>
                                  )}
                                  {ese.note && (
                                    <span className="text-xs italic" style={{ color: 'oklch(0.45 0 0)' }}>
                                      "{ese.note}"
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingId(ese.id)
                                    setAddingEse(false)
                                    setEditForm({
                                      esercizio_id: ese.esercizio_id,
                                      alternativa_id: ese.alternativa_esercizio_id ?? '',
                                      serie: String(ese.serie),
                                      ripetizioni: ese.ripetizioni,
                                      recupero: String(ese.recupero_secondi),
                                      note: ese.note ?? '',
                                      tipo: ese.tipo,
                                      gruppo_id: ese.gruppo_id ?? '',
                                      drop_count: String(ese.drop_count ?? 2),
                                      drop_pct: String(ese.drop_percentage ?? 20),
                                      rest_pause_sec: String(ese.rest_pause_secondi ?? 15),
                                      piramide_dir: ese.piramidale_direzione ?? 'ascendente',
                                      prepara_secondi: ese.prepara_secondi ? String(ese.prepara_secondi) : '',
                                      progressione_tipo: ese.progressione_tipo ?? 'peso',
                                    })
                                  }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                                  style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.60 0 0)' }}>
                                  <FontAwesomeIcon icon={faPen} className="text-xs" />
                                </button>
                                <button onClick={() => handleDeleteEse(ese.id)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                                  style={{ background: 'oklch(0.65 0.22 27 / 12%)', color: 'oklch(0.70 0.20 27)' }}>
                                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Edit form
                            <EsercizioForm
                              form={editForm}
                              onChange={setEditForm}
                              esercizi={esercizi}
                              gruppi={gruppiGiorno}
                              onSave={handleSaveEdit}
                              onCancel={() => setEditingId(null)}
                              saving={saving}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Add exercise */}
                  {addingEse ? (
                    <div className="rounded-2xl overflow-hidden"
                      style={{ background: 'oklch(0.19 0 0)', border: '1px solid oklch(0.70 0.19 46 / 30%)' }}>
                      <EsercizioForm
                        form={form}
                        onChange={setForm}
                        esercizi={esercizi}
                        gruppi={gruppiGiorno}
                        onSave={handleSaveEse}
                        onCancel={() => { setAddingEse(false); setForm(EMPTY) }}
                        saving={saving}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingEse(true); setEditingId(null) }}
                      className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                      style={{
                        background: 'transparent',
                        color: 'oklch(0.70 0.19 46)',
                        border: '2px dashed oklch(0.70 0.19 46 / 25%)',
                      }}>
                      <FontAwesomeIcon icon={faPlus} /> Aggiungi esercizio
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
