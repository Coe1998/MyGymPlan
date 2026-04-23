'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import BynariLoader from '@/components/shared/BynariLoader'
import ModeToggle, { type EditorMode } from './scheda-editor/ModeToggle'
import DayTabs from './scheda-editor/DayTabs'
import WarmupCard from './scheda-editor/WarmupCard'
import DesktopColumnHeader from './scheda-editor/DesktopColumnHeader'
import DesktopExRow from './scheda-editor/DesktopExRow'
import MobileExRow from './scheda-editor/MobileExRow'
import type { Esercizio, EsForm, Giorno, PendingItem } from './scheda-editor/types'
import { EMPTY_FORM } from './scheda-editor/types'

// ── Supabase payload builder ──────────────────────────────────────────────────
function buildPayload(f: EsForm, giornoId: string, ordine: number) {
  return {
    giorno_id: giornoId,
    esercizio_id: f.esercizio_id,
    alternativa_esercizio_id: f.alternativa_id || null,
    serie: f.tipo === 'max_reps' ? 1
      : f.tipo === 'emom' ? (parseInt(f.emom_rounds) || 1)
      : f.tipo === 'tabata' ? 1
      : (parseInt(f.serie) || 3),
    ripetizioni: f.tipo === 'max_reps' ? 'MAX'
      : f.tipo === 'emom' ? `${parseInt(f.emom_reps_per_minuto) || 6}r/min`
      : f.tipo === 'tabata' ? 'Tabata'
      : (f.ripetizioni.trim() || (f.progressione_tipo === 'durata' ? '30' : '8-12')),
    recupero_secondi: parseInt(f.recupero) || 90,
    note: f.note.trim() || null,
    ordine,
    tipo: f.tipo,
    gruppo_id: f.gruppo_id || null,
    drop_count: f.tipo === 'dropset' ? (parseInt(f.drop_count) || 2) : null,
    drop_percentage: f.tipo === 'dropset' ? (parseInt(f.drop_pct) || 20) : null,
    rest_pause_secondi: f.tipo === 'rest_pause' ? (parseInt(f.rest_pause_sec) || 15) : null,
    piramidale_direzione: f.tipo === 'piramidale' ? f.piramide_dir : null,
    prepara_secondi: f.prepara_secondi ? (parseInt(f.prepara_secondi) || null) : null,
    progressione_tipo: f.progressione_tipo || 'peso',
    warmup_serie: f.warmup_serie ? JSON.parse(f.warmup_serie) : [],
    peso_consigliato_kg: f.peso_consigliato_kg ? (parseFloat(f.peso_consigliato_kg) || null) : null,
    tut: f.tut.trim() || null,
    amrap_minuti: f.tipo === 'amrap' ? (parseInt(f.amrap_minuti) || null) : null,
    emom_reps_per_minuto: f.tipo === 'emom' ? (parseInt(f.emom_reps_per_minuto) || null) : null,
    emom_durata_minuti: f.tipo === 'emom' ? (parseInt(f.emom_durata_minuti) || null) : null,
    emom_rounds: f.tipo === 'emom' ? (parseInt(f.emom_rounds) || null) : null,
    max_reps_target: f.tipo === 'max_reps' ? (parseInt(f.max_reps_target) || null) : null,
    ...(f.tipo === 'tabata' ? {
      tabata_work_secondi: parseInt(f.tabata_work_secondi) || 20,
      tabata_rest_secondi: parseInt(f.tabata_rest_secondi) || 10,
      tabata_rounds: parseInt(f.tabata_rounds) || 8,
    } : {}),
  }
}

function eseToForm(ese: any): EsForm {
  return {
    ...EMPTY_FORM,
    esercizio_id: ese.esercizio_id ?? '',
    alternativa_id: ese.alternativa_esercizio_id ?? '',
    serie: String(ese.serie ?? 3),
    ripetizioni: ese.ripetizioni ?? '8-12',
    recupero: String(ese.recupero_secondi ?? 90),
    note: ese.note ?? '',
    tipo: ese.tipo ?? 'normale',
    gruppo_id: ese.gruppo_id ?? '',
    drop_count: String(ese.drop_count ?? 2),
    drop_pct: String(ese.drop_percentage ?? 20),
    rest_pause_sec: String(ese.rest_pause_secondi ?? 15),
    piramide_dir: ese.piramidale_direzione ?? 'ascendente',
    prepara_secondi: String(ese.prepara_secondi ?? ''),
    progressione_tipo: ese.progressione_tipo ?? 'peso',
    warmup_serie: JSON.stringify(ese.warmup_serie ?? []),
    peso_consigliato_kg: String(ese.peso_consigliato_kg ?? ''),
    tut: ese.tut ?? '',
    amrap_minuti: String(ese.amrap_minuti ?? 10),
    emom_reps_per_minuto: String(ese.emom_reps_per_minuto ?? 6),
    emom_durata_minuti: String(ese.emom_durata_minuti ?? 6),
    emom_rounds: String(ese.emom_rounds ?? 4),
    max_reps_target: String(ese.max_reps_target ?? 30),
    tabata_work_secondi: String(ese.tabata_work_secondi ?? 20),
    tabata_rest_secondi: String(ese.tabata_rest_secondi ?? 10),
    tabata_rounds: String(ese.tabata_rounds ?? 8),
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
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
  const [pending, setPending] = useState<PendingItem[]>([])
  const [savingPending, setSavingPending] = useState(false)
  const [schedaNomeEdit, setSchedaNomeEdit] = useState(schedaNome)
  const [richiede_rpe, setRichiede_rpe] = useState(false)
  const [richiede_rir, setRichiede_rir] = useState(false)

  const [mode, setMode] = useState<EditorMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bynari:scheda-editor-mode') as EditorMode | null
      if (saved === 'mobile' || saved === 'desktop') return saved
    }
    return typeof window !== 'undefined' && window.innerWidth < 900 ? 'mobile' : 'desktop'
  })

  const handleModeChange = (m: EditorMode) => {
    setMode(m)
    if (typeof window !== 'undefined') localStorage.setItem('bynari:scheda-editor-mode', m)
  }

  // ── Data fetching ─────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [giorniRes, eserciziRes, schedaRes] = await Promise.all([
      supabase.from('scheda_giorni')
        .select(`
          id, nome, ordine, warmup_note,
          scheda_esercizi (
            id, esercizio_id, serie, ripetizioni, recupero_secondi, note, ordine,
            tipo, gruppo_id, drop_count, drop_percentage, rest_pause_secondi,
            piramidale_direzione, alternativa_esercizio_id,
            prepara_secondi, progressione_tipo, warmup_serie,
            peso_consigliato_kg, tut,
            amrap_minuti, emom_reps_per_minuto, emom_durata_minuti, emom_rounds, max_reps_target,
            esercizi!scheda_esercizi_esercizio_id_fkey ( id, nome, muscoli, tipo_input ),
            alternativa_esercizi:esercizi!scheda_esercizi_alternativa_esercizio_id_fkey ( id, nome )
          )
        `)
        .eq('scheda_id', schedaId)
        .order('ordine'),
      supabase.from('esercizi')
        .select('id, nome, muscoli, tipo_input, gif_url')
        .or('is_global.eq.true,coach_id.eq.' + user.id)
        .order('nome'),
      supabase.from('schede').select('richiede_rpe, richiede_rir').eq('id', schedaId).single(),
    ])

    if (!giorniRes.error) {
      const data = (giorniRes.data as any) ?? []
      // Best-effort: merge tabata fields
      const tabataIds = data.flatMap((g: any) =>
        (g.scheda_esercizi ?? []).filter((e: any) => e.tipo === 'tabata').map((e: any) => e.id)
      )
      if (tabataIds.length > 0) {
        const { data: td } = await supabase.from('scheda_esercizi')
          .select('id, tabata_work_secondi, tabata_rest_secondi, tabata_rounds').in('id', tabataIds)
        if (td) {
          const map = Object.fromEntries(td.map((r: any) => [r.id, r]))
          for (const g of data)
            for (const e of (g.scheda_esercizi ?? []))
              if (map[e.id]) Object.assign(e, map[e.id])
        }
      }
      setGiorni(data)
      if (data.length > 0) setActiveGiorno(prev => prev ?? data[0].id)
    }
    if (eserciziRes.data) setEsercizi(eserciziRes.data)
    if (schedaRes.data) {
      setRichiede_rpe(schedaRes.data.richiede_rpe ?? false)
      setRichiede_rir(schedaRes.data.richiede_rir ?? false)
    }
    setLoading(false)
  }, [schedaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Refresh esercizi list when a new one is created inline
  useEffect(() => {
    const handler = (e: Event) => {
      const nuovoEse = (e as CustomEvent).detail
      setEsercizi(prev => [...prev, nuovoEse].sort((a, b) => a.nome.localeCompare(b.nome)))
    }
    window.addEventListener('bynari:esercizio-creato', handler)
    return () => window.removeEventListener('bynari:esercizio-creato', handler)
  }, [])

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Helpers ────────────────────────────────────────────────────────
  const intensita: 'rpe' | 'rir' | null = richiede_rpe ? 'rpe' : richiede_rir ? 'rir' : null

  const giorno = giorni.find(g => g.id === activeGiorno)
  const eserciziGiorno = [...(giorno?.scheda_esercizi ?? [])].sort((a, b) => a.ordine - b.ordine)
  const pendingGiorno = pending.filter(p => p.giornoId === activeGiorno)

  const inAttesa = pendingGiorno.filter(p => p.isPlaceholder || !p.form.esercizio_id).length
  const configuratiPending = pendingGiorno.filter(p => !p.isPlaceholder && p.form.esercizio_id).length
  const configurati = eserciziGiorno.length + configuratiPending

  // ── Supabase actions ────────────────────────────────────────────────
  const handleSaveNome = async () => {
    if (!schedaNomeEdit.trim() || schedaNomeEdit === schedaNome) return
    await supabase.from('schede').update({ nome: schedaNomeEdit.trim() }).eq('id', schedaId)
  }

  const handleToggleRPE = async (val: boolean) => {
    setRichiede_rpe(val)
    await supabase.from('schede').update({ richiede_rpe: val }).eq('id', schedaId)
  }
  const handleToggleRIR = async (val: boolean) => {
    setRichiede_rir(val)
    await supabase.from('schede').update({ richiede_rir: val }).eq('id', schedaId)
  }

  const handleSaveWarmup = async (giornoId: string, value: string) => {
    setGiorni(prev => prev.map(g => g.id === giornoId ? { ...g, warmup_note: value } : g))
    await supabase.from('scheda_giorni').update({ warmup_note: value || null }).eq('id', giornoId)
  }

  const handleAddGiorno = async () => {
    const { data } = await supabase.from('scheda_giorni')
      .insert({ scheda_id: schedaId, nome: `Day ${giorni.length + 1}`, ordine: giorni.length })
      .select('id, nome, ordine').single()
    if (!data) return
    setGiorni(prev => [...prev, { ...data, warmup_note: null, scheda_esercizi: [] }])
    setActiveGiorno(data.id)
  }

  const handleRinominaGiorno = async (id: string, nome: string) => {
    setGiorni(prev => prev.map(g => g.id === id ? { ...g, nome } : g))
    await supabase.from('scheda_giorni').update({ nome }).eq('id', id)
  }

  const handleDeleteGiorno = async () => {
    if (!activeGiorno || !confirm('Eliminare questo giorno e tutti i suoi esercizi?')) return
    await supabase.from('scheda_giorni').delete().eq('id', activeGiorno)
    const resto = giorni.filter(g => g.id !== activeGiorno)
    setActiveGiorno(resto[0]?.id ?? null)
    await fetchAll()
  }

  const handleCreaEsercizio = async (nome: string, muscoli: string[]): Promise<Esercizio | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('esercizi')
      .insert({ coach_id: user.id, nome, muscoli: muscoli.length > 0 ? muscoli : null, is_global: false, tipo_input: 'reps' })
      .select('id, nome, muscoli, tipo_input').single()
    if (data) {
      setEsercizi(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
      window.dispatchEvent(new CustomEvent('bynari:esercizio-creato', { detail: data }))
      return data
    }
    return null
  }

  // Pending (new exercises) management
  const addPlaceholder = () => {
    if (!activeGiorno) return
    setPending(prev => [...prev, { tempId: crypto.randomUUID(), giornoId: activeGiorno, form: { ...EMPTY_FORM }, isPlaceholder: true }])
  }

  const updatePending = (tempId: string, form: EsForm) => {
    setPending(prev => prev.map(p => p.tempId === tempId ? { ...p, form, isPlaceholder: false } : p))
  }

  const removePending = (tempId: string) => {
    setPending(prev => prev.filter(p => p.tempId !== tempId))
  }

  // Existing exercise edit (saves immediately)
  const handleEditEse = async (eseId: string, form: EsForm) => {
    const ese = eserciziGiorno.find(e => e.id === eseId)
    if (!ese || !activeGiorno) return
    const { giorno_id, ...payload } = buildPayload(form, activeGiorno, ese.ordine) as any
    await supabase.from('scheda_esercizi').update(payload).eq('id', eseId)
    await fetchAll()
  }

  const handleDeleteEse = async (id: string) => {
    await supabase.from('scheda_esercizi').delete().eq('id', id)
    await fetchAll()
  }

  const handleSavePending = async () => {
    const ready = pendingGiorno.filter(p => !p.isPlaceholder && p.form.esercizio_id)
    if (ready.length === 0 || !activeGiorno) return
    setSavingPending(true)
    const baseOrdine = eserciziGiorno.length
    await Promise.all(ready.map((p, i) =>
      supabase.from('scheda_esercizi').insert(buildPayload(p.form, activeGiorno, baseOrdine + i))
    ))
    setPending(prev => prev.filter(p => p.giornoId !== activeGiorno))
    setSavingPending(false)
    await fetchAll()
  }

  // Drag & drop reorder
  const reorderEsercizi = async (fromId: string, toId: string) => {
    if (!activeGiorno || fromId === toId) return
    const lista = [...eserciziGiorno]
    const fromIdx = lista.findIndex(e => e.id === fromId)
    const toIdx = lista.findIndex(e => e.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = lista.splice(fromIdx, 1)
    lista.splice(toIdx, 0, moved)
    setGiorni(prev => prev.map(g => g.id !== activeGiorno ? g : {
      ...g, scheda_esercizi: lista.map((e, i) => ({ ...e, ordine: i })),
    }))
    await Promise.all(lista.map((e, i) => supabase.from('scheda_esercizi').update({ ordine: i }).eq('id', e.id)))
  }

  // ── Render ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'oklch(0 0 0 / 75%)' }}>
      <BynariLoader />
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'oklch(0 0 0 / 75%)', backdropFilter: 'blur(10px)' }}>
      <div style={{
        width: mode === 'mobile' ? 440 : 1040,
        maxWidth: '96vw', maxHeight: '94vh',
        background: 'linear-gradient(180deg, oklch(0.13 0 0) 0%, oklch(0.11 0 0) 100%)',
        borderRadius: 22, border: '1px solid var(--c-w8)',
        boxShadow: '0 40px 80px -20px oklch(0 0 0 / 70%), 0 0 0 1px oklch(0 0 0 / 40%)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'width 260ms cubic-bezier(.2,.9,.3,1)',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--c-w4)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent)' }}>
                  EDITOR SCHEDA
                </span>
                <ModeToggle mode={mode} onChange={handleModeChange} />
              </div>
              <input
                value={schedaNomeEdit}
                onChange={e => setSchedaNomeEdit(e.target.value)}
                onBlur={handleSaveNome}
                onKeyDown={e => e.key === 'Enter' && handleSaveNome()}
                placeholder="Nome scheda"
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 22, fontWeight: 800, fontFamily: 'Syne, Inter, sans-serif',
                  color: 'var(--c-97)', width: '100%', letterSpacing: '-0.02em',
                  padding: 0, borderBottom: '1px solid var(--c-w8)', paddingBottom: 6,
                }}
              />
            </div>
            <button onClick={onClose} aria-label="Chiudi" style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'var(--c-18)', color: 'var(--c-70)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          {/* RPE / RIR toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--c-50)' }}>
              MISURA INTENSITÀ
            </div>
            {(['rpe', 'rir'] as const).map(k => {
              const on = k === 'rpe' ? richiede_rpe : richiede_rir
              const toggle = k === 'rpe' ? handleToggleRPE : handleToggleRIR
              return (
                <button key={k} onClick={() => toggle(!on)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 18, borderRadius: 999, background: on ? 'var(--accent)' : 'var(--c-25)', position: 'relative', transition: 'background 200ms' }}>
                    <div style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: on ? 'oklch(0.14 0.02 40)' : 'var(--c-80)', transition: 'left 200ms' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: on ? 'var(--c-97)' : 'var(--c-55)' }}>
                    {k.toUpperCase()}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Day tabs ── */}
        <DayTabs
          giorni={giorni}
          activeId={activeGiorno}
          onSelect={setActiveGiorno}
          onAdd={handleAddGiorno}
          onRinomina={handleRinominaGiorno}
          configurati={configurati}
          inAttesa={inAttesa}
        />

        {/* ── Body ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 22px 8px' }}>
          <WarmupCard
            value={giorno?.warmup_note ?? ''}
            onChange={v => handleSaveWarmup(activeGiorno!, v)}
          />

          {/* Desktop column header */}
          {mode === 'desktop' && (eserciziGiorno.length > 0 || pendingGiorno.length > 0) && (
            <DesktopColumnHeader />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: mode === 'mobile' ? 10 : 8, marginTop: mode === 'desktop' ? 0 : 14 }}>
            {/* Saved exercises */}
            {eserciziGiorno.map((ese, i) => {
              const form = eseToForm(ese)
              return mode === 'mobile' ? (
                <MobileExRow
                  key={ese.id} index={i + 1} form={form} isPlaceholder={false}
                  esercizi={esercizi} intensita={intensita}
                  onConfigura={f => handleEditEse(ese.id, f)}
                  onDelete={() => handleDeleteEse(ese.id)}
                  onCreaEsercizio={handleCreaEsercizio}
                />
              ) : (
                <div key={ese.id} data-eseid={ese.id}>
                  <DesktopExRow
                    index={i + 1} form={form} isPlaceholder={false}
                    esercizi={esercizi} intensita={intensita}
                    onConfigura={f => handleEditEse(ese.id, f)}
                    onDelete={() => handleDeleteEse(ese.id)}
                    onCreaEsercizio={handleCreaEsercizio}
                  />
                </div>
              )
            })}

            {/* Pending (new) exercises */}
            {pendingGiorno.map((p, i) => {
              const index = eserciziGiorno.length + i + 1
              return mode === 'mobile' ? (
                <MobileExRow
                  key={p.tempId} index={index} form={p.form} isPlaceholder={p.isPlaceholder}
                  esercizi={esercizi} intensita={intensita}
                  onConfigura={f => updatePending(p.tempId, f)}
                  onDelete={() => removePending(p.tempId)}
                  onCreaEsercizio={handleCreaEsercizio}
                />
              ) : (
                <DesktopExRow
                  key={p.tempId} index={index} form={p.form} isPlaceholder={p.isPlaceholder}
                  esercizi={esercizi} intensita={intensita}
                  onConfigura={f => updatePending(p.tempId, f)}
                  onDelete={() => removePending(p.tempId)}
                  onCreaEsercizio={handleCreaEsercizio}
                />
              )
            })}
          </div>

          {/* Add button */}
          <button onClick={addPlaceholder} style={{
            width: '100%', marginTop: 12, padding: '14px 16px', borderRadius: 14,
            background: 'oklch(0.70 0.19 46 / 6%)', border: '1.5px dashed oklch(0.70 0.19 46 / 38%)',
            color: 'var(--accent)', fontSize: 13, fontWeight: 800, letterSpacing: '0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <i className="fa-solid fa-plus" />
            Aggiungi esercizio
          </button>

          {inAttesa > 0 && (
            <div style={{
              marginTop: 10, padding: '11px 14px', borderRadius: 12,
              background: 'oklch(0.82 0.13 85 / 8%)', border: '1px solid oklch(0.82 0.13 85 / 18%)',
              color: 'oklch(0.85 0.13 85)', fontSize: 11.5, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="fa-solid fa-circle-info" style={{ fontSize: 11 }} />
              Configura gli esercizi ({inAttesa} in attesa) per completare la scheda
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--c-w4)',
          background: 'oklch(0.10 0 0)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <button onClick={handleDeleteGiorno} style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-60)', padding: '10px 14px', borderRadius: 10 }}>
            Elimina giorno
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '11px 18px', borderRadius: 12, background: 'var(--c-18)', color: 'var(--c-80)', fontSize: 12.5, fontWeight: 700 }}>
              Annulla
            </button>
            <button
              onClick={handleSavePending}
              disabled={savingPending || inAttesa > 0}
              style={{
                padding: '11px 20px', borderRadius: 12,
                background: inAttesa === 0 && configuratiPending > 0
                  ? 'linear-gradient(135deg, oklch(0.70 0.19 46), oklch(0.62 0.19 40))'
                  : 'var(--c-20)',
                color: inAttesa === 0 && configuratiPending > 0 ? 'oklch(0.14 0.02 40)' : 'var(--c-45)',
                fontSize: 12.5, fontWeight: 800, letterSpacing: '0.01em',
                boxShadow: inAttesa === 0 && configuratiPending > 0 ? '0 8px 20px -10px oklch(0.70 0.19 46 / 55%)' : 'none',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
              <i className="fa-solid fa-check" style={{ fontSize: 11 }} />
              {savingPending ? 'Salvataggio…' : configuratiPending > 0 ? `Salva ${configuratiPending} esercizi` : 'Salva scheda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
