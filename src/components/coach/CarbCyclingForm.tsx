'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentCycleDay, shiftCycleStart } from '@/lib/carbCycling'

interface ProfiloLocal {
  id: string | null // null = non ancora salvato in DB
  nome: string
  calorie: string
  proteine_g: string
  carboidrati_g: string
  grassi_g: string
}

const PROFILE_COLORS = [
  { color: 'oklch(0.65 0.18 150)', bg: 'oklch(0.65 0.18 150 / 15%)', border: 'oklch(0.65 0.18 150 / 40%)' },
  { color: 'oklch(0.70 0.19 46)',  bg: 'oklch(0.70 0.19 46 / 15%)',  border: 'oklch(0.70 0.19 46 / 40%)'  },
  { color: 'oklch(0.60 0.15 200)', bg: 'oklch(0.60 0.15 200 / 15%)', border: 'oklch(0.60 0.15 200 / 40%)' },
  { color: 'oklch(0.65 0.15 300)', bg: 'oklch(0.65 0.15 300 / 15%)', border: 'oklch(0.65 0.15 300 / 40%)' },
]

const DEFAULT_NAMES = ['A', 'B', 'C', 'D']

export default function CarbCyclingForm({ clienteId }: { clienteId: string }) {
  const supabase = createClient()

  const [pianoId, setPianoId] = useState<string | null>(null)
  const [abilitato, setAbilitato] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [profili, setProfili] = useState<ProfiloLocal[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [assegnazioni, setAssegnazioni] = useState<Record<number, string | null>>({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null })

  const [loading, setLoading] = useState(true)
  const [savingToggle, setSavingToggle] = useState(false)
  const [savingProfili, setSavingProfili] = useState(false)
  const [savedProfili, setSavedProfili] = useState(false)
  const [savingCiclo, setSavingCiclo] = useState(false)
  const [savedCiclo, setSavedCiclo] = useState(false)
  const [erroreProfili, setErroreProfili] = useState<string | null>(null)
  const [erroreCiclo, setErroreCiclo] = useState<string | null>(null)

  // Override
  const [overrideData, setOverrideData] = useState(new Date().toISOString().split('T')[0])
  const [overrideProfiloId, setOverrideProfiloId] = useState('')
  const [overrideEsistente, setOverrideEsistente] = useState(false)
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [overrideSaved, setOverrideSaved] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const { data: target } = await supabase
      .from('macro_target')
      .select('id, carb_cycling_abilitato, carb_cycling_start_date')
      .eq('cliente_id', clienteId)
      .maybeSingle()

    if (!target) { setLoading(false); return }

    setPianoId(target.id)
    setAbilitato(target.carb_cycling_abilitato ?? false)
    setStartDate(target.carb_cycling_start_date ?? '')

    const [profiliRes, giorniRes] = await Promise.all([
      supabase
        .from('carb_cycling_profili')
        .select('id, nome, calorie, proteine_g, carboidrati_g, grassi_g')
        .eq('piano_id', target.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('carb_cycling_giorni')
        .select('giorno_ciclo, profilo_id')
        .eq('piano_id', target.id),
    ])

    setProfili((profiliRes.data ?? []).map(p => ({
      id: p.id,
      nome: p.nome,
      calorie: String(p.calorie),
      proteine_g: String(p.proteine_g),
      carboidrati_g: String(p.carboidrati_g),
      grassi_g: String(p.grassi_g),
    })))

    const map: Record<number, string | null> = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null }
    for (const g of (giorniRes.data ?? [])) map[g.giorno_ciclo] = g.profilo_id
    setAssegnazioni(map)

    setLoading(false)
  }, [clienteId])

  useEffect(() => { fetchData() }, [fetchData])

  // Carica override per la data selezionata
  useEffect(() => {
    if (!pianoId) return
    supabase
      .from('carb_cycling_override')
      .select('profilo_id')
      .eq('cliente_id', clienteId)
      .eq('data', overrideData)
      .maybeSingle()
      .then(({ data }) => {
        setOverrideEsistente(!!data)
        setOverrideProfiloId(data?.profilo_id ?? '')
      })
  }, [overrideData, pianoId, clienteId])

  const handleToggle = async () => {
    if (!pianoId) return
    setSavingToggle(true)
    const newVal = !abilitato
    await supabase.from('macro_target').update({ carb_cycling_abilitato: newVal }).eq('id', pianoId)
    setAbilitato(newVal)
    setSavingToggle(false)
  }

  const handleSaveStartDate = async () => {
    if (!pianoId || !startDate) return
    await supabase.from('macro_target').update({ carb_cycling_start_date: startDate }).eq('id', pianoId)
  }

  const handleShift = async (days: number) => {
    if (!pianoId || !startDate) return
    const newStart = shiftCycleStart(startDate, days)
    await supabase.from('macro_target').update({ carb_cycling_start_date: newStart }).eq('id', pianoId)
    setStartDate(newStart)
  }

  const handleSaveProfili = async () => {
    if (!pianoId) return
    setSavingProfili(true)
    setErroreProfili(null)
    try {
      // Elimina i profili rimossi
      if (deletedIds.length > 0) {
        const { error } = await supabase.from('carb_cycling_profili').delete().in('id', deletedIds)
        if (error) { setErroreProfili(error.message); return }
        setDeletedIds([])
      }

      // Salva ogni profilo
      const newIdMap: Record<number, string> = {}
      for (let i = 0; i < profili.length; i++) {
        const p = profili[i]
        const payload = {
          piano_id: pianoId,
          nome: p.nome,
          calorie: parseInt(p.calorie) || 0,
          proteine_g: parseInt(p.proteine_g) || 0,
          carboidrati_g: parseInt(p.carboidrati_g) || 0,
          grassi_g: parseInt(p.grassi_g) || 0,
        }
        if (p.id) {
          const { error } = await supabase.from('carb_cycling_profili').update(payload).eq('id', p.id)
          if (error) { setErroreProfili(error.message); return }
        } else {
          const { data: ins, error } = await supabase.from('carb_cycling_profili').insert(payload).select('id').single()
          if (error) { setErroreProfili(error.message); return }
          if (ins) newIdMap[i] = ins.id
        }
      }

      if (Object.keys(newIdMap).length > 0) {
        setProfili(prev => prev.map((p, i) => newIdMap[i] ? { ...p, id: newIdMap[i] } : p))
      }

      setSavedProfili(true)
      setTimeout(() => setSavedProfili(false), 2000)
    } finally {
      setSavingProfili(false)
    }
  }

  const handleSaveCiclo = async () => {
    if (!pianoId) return
    setSavingCiclo(true)
    setErroreCiclo(null)
    try {
      const rows = Object.entries(assegnazioni)
        .filter(([, pid]) => pid !== null)
        .map(([g, pid]) => ({ piano_id: pianoId, giorno_ciclo: parseInt(g), profilo_id: pid as string }))

      const { error: delErr } = await supabase.from('carb_cycling_giorni').delete().eq('piano_id', pianoId)
      if (delErr) { setErroreCiclo(delErr.message); return }

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from('carb_cycling_giorni').insert(rows)
        if (insErr) { setErroreCiclo(insErr.message); return }
      }

      setSavedCiclo(true)
      setTimeout(() => setSavedCiclo(false), 2000)
    } finally {
      setSavingCiclo(false)
    }
  }

  const handleApplyOverride = async () => {
    if (!pianoId || !overrideProfiloId) return
    setOverrideSaving(true)
    try {
      await supabase.from('carb_cycling_override').upsert({
        cliente_id: clienteId,
        piano_id: pianoId,
        data: overrideData,
        profilo_id: overrideProfiloId,
      }, { onConflict: 'cliente_id,data' })
      setOverrideEsistente(true)
      setOverrideSaved(true)
      setTimeout(() => setOverrideSaved(false), 2000)
    } finally {
      setOverrideSaving(false)
    }
  }

  const handleRemoveOverride = async () => {
    if (!pianoId) return
    setOverrideSaving(true)
    try {
      await supabase.from('carb_cycling_override')
        .delete()
        .eq('cliente_id', clienteId)
        .eq('data', overrideData)
      setOverrideEsistente(false)
      setOverrideProfiloId('')
    } finally {
      setOverrideSaving(false)
    }
  }

  const addProfilo = () => {
    if (profili.length >= 4) return
    setProfili(prev => [...prev, {
      id: null,
      nome: DEFAULT_NAMES[prev.length] ?? String.fromCharCode(65 + prev.length),
      calorie: '2000',
      proteine_g: '150',
      carboidrati_g: '200',
      grassi_g: '70',
    }])
  }

  const removeProfilo = (idx: number) => {
    const p = profili[idx]
    if (p.id) {
      setDeletedIds(prev => [...prev, p.id!])
      setAssegnazioni(prev => {
        const next = { ...prev }
        for (const k of Object.keys(next) as unknown as number[]) {
          if (next[k] === p.id) next[k] = null
        }
        return next
      })
    }
    setProfili(prev => prev.filter((_, i) => i !== idx))
  }

  if (loading) return null

  const savedProfiliIds = profili.filter(p => p.id).map(p => p.id!)
  const cycleDay = abilitato && startDate ? getCurrentCycleDay(startDate) : null

  return (
    <div style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
      {/* ── Header + Toggle ── */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: 'oklch(0.65 0.18 180)' }}>Carb Cycling avanzato</p>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0 0)' }}>Ciclo settimanale con profili personalizzati</p>
        </div>
        <button
          onClick={handleToggle}
          disabled={savingToggle}
          aria-pressed={abilitato}
          className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
          style={{ background: abilitato ? 'oklch(0.65 0.18 150)' : 'oklch(0.28 0 0)' }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
            style={{ background: 'white', left: abilitato ? '1.625rem' : '0.125rem' }}
          />
        </button>
      </div>

      {abilitato && (
        <div className="px-5 pb-6 space-y-5">
          {/* ── Data di inizio ciclo ── */}
          <div className="rounded-2xl p-4 space-y-3"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'oklch(0.40 0 0)' }}>
              Inizio ciclo
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm"
                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 10%)', color: 'oklch(0.90 0 0)', colorScheme: 'dark' }}
              />
              <button
                onClick={handleSaveStartDate}
                className="px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
                style={{ background: 'oklch(0.65 0.18 180 / 20%)', color: 'oklch(0.65 0.18 180)', border: '1px solid oklch(0.65 0.18 180 / 30%)' }}
              >
                Salva
              </button>
            </div>

            {startDate && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleShift(-1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}
                  >← −1</button>
                  <span className="text-xs px-1" style={{ color: 'oklch(0.40 0 0)' }}>Sposta ciclo</span>
                  <button
                    onClick={() => handleShift(1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.70 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}
                  >+1 →</button>
                </div>
                {cycleDay && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: 'oklch(0.65 0.18 180 / 15%)', color: 'oklch(0.65 0.18 180)' }}>
                    Oggi: G{cycleDay}/7
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Profili macro ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'oklch(0.40 0 0)' }}>
                Profili macro
              </p>
              {profili.length < 4 && (
                <button
                  onClick={addProfilo}
                  className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                  style={{ background: 'oklch(0.65 0.18 180 / 15%)', color: 'oklch(0.65 0.18 180)' }}
                >
                  + Aggiungi
                </button>
              )}
            </div>

            {profili.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'oklch(0.40 0 0)' }}>
                Aggiungi almeno 2 profili per configurare il ciclo.
              </p>
            )}

            {profili.map((p, i) => {
              const pal = PROFILE_COLORS[i] ?? PROFILE_COLORS[0]
              return (
                <div key={i} className="rounded-2xl p-4 space-y-3"
                  style={{ background: 'oklch(0.18 0 0)', border: `1px solid ${pal.border}` }}>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: pal.bg, color: pal.color, border: `1px solid ${pal.border}` }}>
                      {p.nome || DEFAULT_NAMES[i] || '?'}
                    </span>
                    <input
                      value={p.nome}
                      onChange={e => setProfili(prev => prev.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))}
                      placeholder="Nome (es. A, High)"
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-sm font-semibold"
                      style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.90 0 0)' }}
                    />
                    <button
                      onClick={() => removeProfilo(i)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                      style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 25%)' }}
                    >✕</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Calorie', key: 'calorie', unit: 'kcal' },
                      { label: 'Proteine', key: 'proteine_g', unit: 'g' },
                      { label: 'Carboidrati', key: 'carboidrati_g', unit: 'g' },
                      { label: 'Grassi', key: 'grassi_g', unit: 'g' },
                    ].map(({ label, key, unit }) => (
                      <div key={key}>
                        <label className="text-xs mb-1 block" style={{ color: 'oklch(0.45 0 0)' }}>{label}</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={(p as any)[key]}
                            onChange={e => setProfili(prev => prev.map((x, j) => j === i ? { ...x, [key]: e.target.value } : x))}
                            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-sm text-right tabular-nums"
                            style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)', color: 'oklch(0.90 0 0)' }}
                          />
                          <span className="text-xs w-8 flex-shrink-0" style={{ color: 'oklch(0.40 0 0)' }}>{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {profili.length > 0 && (
              <>
                <button
                  onClick={handleSaveProfili}
                  disabled={savingProfili}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={{
                    background: savedProfili ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(0.65 0.18 180 / 20%)',
                    color: savedProfili ? 'oklch(0.65 0.18 150)' : 'oklch(0.65 0.18 180)',
                    border: `1px solid ${savedProfili ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(0.65 0.18 180 / 30%)'}`,
                  }}
                >
                  {savingProfili ? 'Salvando…' : savedProfili ? '✓ Profili salvati' : 'Salva profili'}
                </button>
                {erroreProfili && (
                  <p className="text-xs px-1" style={{ color: 'oklch(0.75 0.15 27)' }}>⚠ {erroreProfili}</p>
                )}
              </>
            )}
          </div>

          {/* ── Ciclo 7 giorni ── */}
          {profili.length >= 2 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'oklch(0.40 0 0)' }}>
                Ciclo 7 giorni
              </p>

              <div className="grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map(giorno => {
                  const pid = assegnazioni[giorno]
                  const idx = pid ? profili.findIndex(p => p.id === pid) : -1
                  const pal = idx >= 0 ? PROFILE_COLORS[idx] : null
                  const isToday = cycleDay === giorno
                  return (
                    <div key={giorno} className="flex flex-col gap-1.5 items-center">
                      <span className="text-xs font-semibold" style={{ color: isToday ? 'oklch(0.65 0.18 180)' : 'oklch(0.40 0 0)' }}>
                        G{giorno}{isToday ? '●' : ''}
                      </span>
                      <select
                        value={pid ?? ''}
                        onChange={e => setAssegnazioni(prev => ({ ...prev, [giorno]: e.target.value || null }))}
                        className="w-full py-2 rounded-xl text-xs font-black text-center appearance-none cursor-pointer"
                        style={{
                          background: pal ? pal.bg : 'oklch(0.22 0 0)',
                          border: `1px solid ${pal ? pal.border : 'oklch(1 0 0 / 8%)'}`,
                          color: pal ? pal.color : 'oklch(0.40 0 0)',
                          boxShadow: isToday ? `0 0 0 2px oklch(0.65 0.18 180 / 50%)` : 'none',
                        }}
                      >
                        <option value="">—</option>
                        {profili.filter(p => p.id).map((p, pIdx) => (
                          <option key={p.id!} value={p.id!}>
                            {p.nome || DEFAULT_NAMES[pIdx]}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>

              {/* Preview pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[1, 2, 3, 4, 5, 6, 7].map(giorno => {
                  const pid = assegnazioni[giorno]
                  const idx = pid ? profili.findIndex(p => p.id === pid) : -1
                  const pal = idx >= 0 ? PROFILE_COLORS[idx] : null
                  const nome = idx >= 0 ? (profili[idx].nome || DEFAULT_NAMES[idx]) : '—'
                  return (
                    <span key={giorno}
                      className="px-2.5 py-1 rounded-full text-xs font-black"
                      style={{
                        background: pal ? pal.bg : 'oklch(0.22 0 0)',
                        color: pal ? pal.color : 'oklch(0.35 0 0)',
                        border: `1px solid ${pal ? pal.border : 'oklch(1 0 0 / 8%)'}`,
                      }}>
                      {nome}
                    </span>
                  )
                })}
              </div>

              <button
                onClick={handleSaveCiclo}
                disabled={savingCiclo}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: savedCiclo ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(0.65 0.18 180 / 20%)',
                  color: savedCiclo ? 'oklch(0.65 0.18 150)' : 'oklch(0.65 0.18 180)',
                  border: `1px solid ${savedCiclo ? 'oklch(0.65 0.18 150 / 30%)' : 'oklch(0.65 0.18 180 / 30%)'}`,
                }}
              >
                {savingCiclo ? 'Salvando…' : savedCiclo ? '✓ Ciclo salvato' : 'Salva ciclo'}
              </button>
              {erroreCiclo && (
                <p className="text-xs px-1" style={{ color: 'oklch(0.75 0.15 27)' }}>⚠ {erroreCiclo}</p>
              )}
            </div>
          )}

          {/* ── Override giornaliero ── */}
          {savedProfiliIds.length >= 1 && (
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'oklch(0.40 0 0)' }}>
                  Override giornaliero
                </p>
                {overrideEsistente && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                    Attivo
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={overrideData}
                  onChange={e => setOverrideData(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 10%)', color: 'oklch(0.90 0 0)', colorScheme: 'dark' }}
                />
                <select
                  value={overrideProfiloId}
                  onChange={e => setOverrideProfiloId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 10%)', color: 'oklch(0.90 0 0)' }}
                >
                  <option value="">Scegli profilo</option>
                  {profili.filter(p => p.id).map((p, i) => (
                    <option key={p.id!} value={p.id!}>
                      Profilo {p.nome || DEFAULT_NAMES[i]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleApplyOverride}
                  disabled={overrideSaving || !overrideProfiloId}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={{
                    background: overrideSaved ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(0.65 0.18 150 / 15%)',
                    color: 'oklch(0.65 0.18 150)',
                    border: '1px solid oklch(0.65 0.18 150 / 30%)',
                    opacity: !overrideProfiloId ? 0.5 : 1,
                  }}
                >
                  {overrideSaving ? '…' : overrideSaved ? '✓ Salvato' : overrideEsistente ? 'Aggiorna' : 'Applica override'}
                </button>
                {overrideEsistente && (
                  <button
                    onClick={handleRemoveOverride}
                    disabled={overrideSaving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                    style={{ background: 'oklch(0.65 0.22 27 / 15%)', color: 'oklch(0.75 0.15 27)', border: '1px solid oklch(0.65 0.22 27 / 25%)' }}
                  >
                    Rimuovi override
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
