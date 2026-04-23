'use client'
import { useEffect, useState, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare, faClockRotateLeft, faCodeCompare, faXmark, faCheck, faCircle } from '@fortawesome/free-solid-svg-icons'
import { createClient } from '@/lib/supabase/client'
import { stimaTDEE } from '@/lib/anamnesi-notes'
import type { AnamnesIData } from '@/lib/anamnesi-notes'
import BynariLoader from '@/components/shared/BynariLoader'
import NutEditorTab from './nutrizione/NutEditorTab'
import { NutStoricoTab, NutConfrontoTab } from './nutrizione/NutStoricoConfronto'
import type { DietaDraft, DietaVersione, ProfiloMacro } from './nutrizione/types'
import { DRAFT_VUOTO } from './nutrizione/types'

interface Props {
  clienteId: string
  clienteNome: string
  clienteObiettivo?: string | null
  pesoCurrent?: number | null
  pesoTarget?: number | null
  onClose: () => void
}

const todayISO = () => new Date().toISOString().split('T')[0]

export default function NutrizioneModal({
  clienteId, clienteNome, clienteObiettivo, pesoCurrent, pesoTarget, onClose,
}: Props) {
  const supabase = createClient()

  const [tab, setTab]             = useState<'editor' | 'storico' | 'confronto'>('editor')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [dirty, setDirty]         = useState(false)

  const [storico, setStorico]     = useState<DietaVersione[]>([])
  const [dietaId, setDietaId]     = useState<string | null>(null) // id dieta attiva/draft

  const [draft, setDraftRaw]      = useState<DietaDraft>({ ...DRAFT_VUOTO, data_inizio: todayISO() })
  const [profili, setProfiliRaw]  = useState<ProfiloMacro[]>([])
  const [ciclo, setCicloRaw]      = useState<string[]>(Array(7).fill(''))
  const [compareIds, setCompareIds] = useState<string[]>([])

  const [tdee, setTdee]           = useState<{ mantenimento: number; fattori: { icon: string; label: string; impact: string }[] } | null>(null)

  // dirty wrappers
  const setDraft  = (d: DietaDraft)     => { setDraftRaw(d);  setDirty(true) }
  const setProfili = (p: ProfiloMacro[]) => { setProfiliRaw(p); setDirty(true) }
  const setCiclo  = (c: string[])       => { setCicloRaw(c);  setDirty(true) }

  // ── fetch ────────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true)

    const [storicoRes, anamnesiRes] = await Promise.all([
      supabase.from('diete')
        .select('id, data_inizio, data_fine, calorie, proteine_g, carboidrati_g, grassi_g, note_coach, delta_peso_kg, outcome_note, pasti_config, carb_cycling_abilitato, carb_cycling_start_date')
        .eq('cliente_id', clienteId)
        .order('data_inizio', { ascending: false }),
      supabase.from('anamnesi').select('*').eq('cliente_id', clienteId).maybeSingle(),
    ])

    // TDEE
    if (anamnesiRes.data && pesoCurrent) {
      const a = anamnesiRes.data as AnamnesIData
      const tdeeVal = stimaTDEE(a, pesoCurrent)
      if (tdeeVal) {
        const freq = a.allenamenti_settimana ?? 0
        const fattori = [
          { icon: 'fa-briefcase', label: a.occupazione ?? 'Lavoro', impact: `PAL ${freq <= 1 ? '1.2' : freq <= 3 ? '1.375' : freq <= 5 ? '1.55' : '1.725'}` },
          ...(freq > 0 ? [{ icon: 'fa-dumbbell', label: `${freq} allenamenti/sett`, impact: `+${Math.round((tdeeVal - tdeeVal / (freq <= 1 ? 1.2 : freq <= 3 ? 1.375 : freq <= 5 ? 1.55 : 1.725)) * (freq <= 1 ? 1.2 : freq <= 3 ? 1.375 : freq <= 5 ? 1.55 : 1.725))} kcal attività` }] : []),
        ]
        setTdee({ mantenimento: tdeeVal, fattori })
      }
    }

    const versions = (storicoRes.data ?? []).map((r: any) => ({
      id: r.id,
      data_inizio: r.data_inizio,
      data_fine: r.data_fine,
      calorie: r.calorie,
      proteine_g: r.proteine_g,
      carboidrati_g: r.carboidrati_g,
      grassi_g: r.grassi_g,
      note_coach: r.note_coach,
      delta_peso_kg: r.delta_peso_kg,
      outcome_note: r.outcome_note,
      pasti_config: r.pasti_config ?? [],
      carb_cycling_abilitato: r.carb_cycling_abilitato ?? false,
    })) as DietaVersione[]

    setStorico(versions)

    const today = todayISO()
    const attiva = versions.find(v => v.data_inizio <= today && (!v.data_fine || v.data_fine >= today))
      ?? versions[0]
      ?? null

    if (attiva) {
      setDietaId(attiva.id)
      // Normalizza pasti_config: supporta sia {percentuale} (vecchio) che {pct} (nuovo)
      const pastiNorm = (attiva.pasti_config ?? []).map((p: any) => ({
        nome: p.nome ?? 'Pasto',
        pct: p.pct ?? p.percentuale ?? 0,
      }))
      setDraftRaw({
        data_inizio: attiva.data_inizio,
        macro: {
          kcal: String(attiva.calorie ?? 2000),
          prot: String(attiva.proteine_g ?? 150),
          carb: String(attiva.carboidrati_g ?? 200),
          grassi: String(attiva.grassi_g ?? 70),
          note: attiva.note_coach ?? '',
        },
        pasti: {
          count: pastiNorm.length || 4,
          split: pastiNorm.length > 0 ? pastiNorm : DRAFT_VUOTO.pasti.split,
        },
        carb_cycling_abilitato: attiva.carb_cycling_abilitato,
        carb_cycling_start_date: (attiva as any).carb_cycling_start_date ?? '',
      })

      // Carica profili e ciclo
      const [profiliRes, cicloRes] = await Promise.all([
        supabase.from('dieta_profili_macro').select('*').eq('dieta_id', attiva.id).order('label'),
        supabase.from('dieta_ciclo').select('*').eq('dieta_id', attiva.id).order('giorno'),
      ])
      if (profiliRes.data) setProfiliRaw(profiliRes.data as ProfiloMacro[])
      if (cicloRes.data) {
        const c = Array(7).fill('')
        for (const row of cicloRes.data as any[]) c[row.giorno - 1] = row.profilo_id ?? ''
        setCicloRaw(c)
      }
    } else {
      setDraftRaw({ ...DRAFT_VUOTO, data_inizio: today })
    }

    setDirty(false)
    setLoading(false)
  }, [clienteId, pesoCurrent])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── salva ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const pct = draft.pasti.split.reduce((a, b) => a + b.pct, 0)
    if (pct !== 100) { alert(`La somma delle % pasti deve essere 100 (ora è ${pct}%).`); return }
    if (!draft.data_inizio) { alert('Seleziona una data di inizio.'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // Archivia la versione precedente: data_fine = data_inizio nuova − 1
    if (dietaId) {
      const prevDate = new Date(draft.data_inizio)
      prevDate.setDate(prevDate.getDate() - 1)
      const dataFinePrec = prevDate.toISOString().split('T')[0]
      await supabase.from('diete').update({ data_fine: dataFinePrec }).eq('id', dietaId).neq('data_inizio', draft.data_inizio)
    }

    // Inserisce nuova versione — salva pasti_config nel formato {nome, percentuale} (standard)
    const { data: nuovaDieta, error } = await supabase.from('diete').insert({
      cliente_id: clienteId,
      coach_id: user.id,
      data_inizio: draft.data_inizio,
      calorie: parseInt(draft.macro.kcal) || null,
      proteine_g: parseInt(draft.macro.prot) || null,
      carboidrati_g: parseInt(draft.macro.carb) || null,
      grassi_g: parseInt(draft.macro.grassi) || null,
      note_coach: draft.macro.note.trim() || null,
      pasti_config: draft.pasti.split.map(s => ({ nome: s.nome, percentuale: s.pct })),
      carb_cycling_abilitato: draft.carb_cycling_abilitato,
      carb_cycling_start_date: draft.carb_cycling_start_date || null,
    }).select('id').single()

    if (error || !nuovaDieta) { setSaving(false); alert('Errore nel salvataggio.'); return }

    // Profili e ciclo carb cycling
    if (draft.carb_cycling_abilitato && profili.length > 0) {
      const { data: insProf } = await supabase.from('dieta_profili_macro').insert(
        profili.map(p => ({ dieta_id: nuovaDieta.id, label: p.label, kcal: p.kcal, prot: p.prot, carb: p.carb, grassi: p.grassi, color: p.color }))
      ).select('id, label')

      if (insProf) {
        const labelToId = Object.fromEntries(insProf.map((r: any) => [r.label, r.id]))
        const oldIdToLabel = Object.fromEntries(profili.map(p => [p.id, p.label]))
        const cicloRows = ciclo.map((pid, i) => ({
          dieta_id: nuovaDieta.id,
          giorno: i + 1,
          profilo_id: labelToId[oldIdToLabel[pid]] ?? null,
        })).filter(r => r.profilo_id)
        if (cicloRows.length > 0) await supabase.from('dieta_ciclo').insert(cicloRows)
      }
    }

    setSaving(false)
    setDirty(false)
    await fetchAll()
  }

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const iniziali = clienteNome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'oklch(0 0 0 / 72%)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 920, height: '90vh',
          borderRadius: 20, overflow: 'hidden',
          background: 'var(--c-10)', border: '1px solid var(--c-w10)',
          boxShadow: '0 40px 100px -20px oklch(0 0 0 / 60%), 0 0 0 1px var(--c-w6)',
          display: 'flex', flexDirection: 'column',
        }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px', flexShrink: 0,
          background: 'linear-gradient(135deg, oklch(0.70 0.19 46 / 10%), transparent)',
          borderBottom: '1px solid var(--c-w6)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, oklch(0.70 0.19 46), oklch(0.55 0.19 46))',
            color: 'oklch(0.14 0.02 40)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, Inter', fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em',
          }}>{iniziali}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-97)', letterSpacing: '-0.01em' }}>
              Dieta · {clienteNome}
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-60)', marginTop: 2 }}>
              {clienteObiettivo && <span>{clienteObiettivo} · </span>}
              {pesoCurrent && <strong style={{ color: 'var(--c-85)' }}>{pesoCurrent} kg</strong>}
              {pesoCurrent && pesoTarget && <span style={{ margin: '0 6px', color: 'var(--c-35)' }}>→</span>}
              {pesoTarget && <span style={{ color: 'oklch(0.70 0.18 150)' }}>target {pesoTarget} kg</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-15)', color: 'var(--c-75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 15 }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 22px', borderBottom: '1px solid var(--c-w6)', display: 'flex', gap: 4, flexShrink: 0 }}>
          {[
            { id: 'editor',    label: 'Editor',    icon: faPenToSquare },
            { id: 'storico',   label: 'Storico',   icon: faClockRotateLeft },
            { id: 'confronto', label: 'Confronto', icon: faCodeCompare, badge: compareIds.length || null },
          ].map(it => {
            const active = it.id === tab
            return (
              <button key={it.id} onClick={() => setTab(it.id as typeof tab)} style={{
                padding: '14px 18px', background: 'transparent',
                color: active ? 'var(--c-97)' : 'var(--c-60)',
                fontSize: 13, fontWeight: 700,
                borderBottom: '2px solid ' + (active ? 'oklch(0.70 0.19 46)' : 'transparent'),
                marginBottom: -1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <FontAwesomeIcon icon={it.icon} style={{ fontSize: 11 }} />
                {it.label}
                {it.badge !== null && it.badge !== undefined && (
                  <span style={{ padding: '2px 6px', borderRadius: 999, background: 'oklch(0.65 0.14 200 / 18%)', color: 'oklch(0.72 0.14 200)', fontSize: 10, fontWeight: 800 }}>
                    {it.badge}/2
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BynariLoader />
            </div>
          ) : (
            <>
              {tab === 'editor'    && <NutEditorTab draft={draft} setDraft={setDraft} profili={profili} setProfili={setProfili} ciclo={ciclo} setCiclo={setCiclo} tdee={tdee} />}
              {tab === 'storico'   && <NutStoricoTab versions={storico} compareIds={compareIds} onToggleCompare={toggleCompare} />}
              {tab === 'confronto' && <NutConfrontoTab versions={storico} ids={compareIds} />}
            </>
          )}
        </div>

        {/* Footer */}
        {tab === 'editor' ? (
          <div style={{
            padding: '16px 22px', borderTop: '1px solid var(--c-w6)',
            background: 'var(--c-10)', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 11, color: 'var(--c-55)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faCircle} style={{ fontSize: 6, color: dirty ? 'oklch(0.82 0.13 85)' : 'var(--c-35)' }} />
              <span>{dirty ? 'Bozza non salvata' : 'Nessuna modifica'}</span>
            </div>
            <div style={{ flex: 1 }} />
            <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 11, background: 'var(--c-15)', color: 'var(--c-85)', fontSize: 12, fontWeight: 700 }}>
              Annulla
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 18px', borderRadius: 11,
                background: saving ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)',
                color: 'oklch(0.14 0.02 40)',
                fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
                boxShadow: saving ? 'none' : '0 6px 14px -4px oklch(0.70 0.19 46 / 50%)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <FontAwesomeIcon icon={faCheck} style={{ fontSize: 11 }} />
              {saving ? 'Salvataggio…' : 'SALVA E PROGRAMMA'}
            </button>
          </div>
        ) : (
          <div style={{ padding: '16px 22px', borderTop: '1px solid var(--c-w6)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 11, background: 'var(--c-15)', color: 'var(--c-85)', fontSize: 12, fontWeight: 700 }}>
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
