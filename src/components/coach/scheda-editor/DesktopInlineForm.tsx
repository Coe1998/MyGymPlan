'use client'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faPlus, faCheck, faCircleCheck, faCircle } from '@fortawesome/free-solid-svg-icons'
import EsercizioPicker from './sections/EsercizioPicker'
import TipoGrid from './sections/TipoGrid'
import TipoExtra from './sections/TipoExtra'
import ProgressGrid from './sections/ProgressGrid'
import ParametriFields from './sections/ParametriFields'
import FieldInput, { FieldLabel } from './shared/FieldInput'
import Section from './shared/Section'
import { getTipo } from '@/lib/scheda-constants'
import type { EsForm, Esercizio } from './types'

interface Gruppo { id: string; label: string }

interface Props {
  data: EsForm
  esercizi: Esercizio[]
  gruppi: Gruppo[]
  intensita?: 'rpe' | 'rir' | null
  onConfigura: (form: EsForm) => void
  onClose: () => void
  onCreaEsercizio: (nome: string, muscoli: string[]) => Promise<Esercizio | null>
}

export default function DesktopInlineForm({ data, esercizi, gruppi, intensita, onConfigura, onClose, onCreaEsercizio }: Props) {
  const [local, setLocal] = useState<EsForm>({ ...data })
  const set = (k: keyof EsForm, v: string) => setLocal(p => ({ ...p, [k]: v }))

  const selectedEse = esercizi.find(e => e.id === local.esercizio_id)
  const isTimer = selectedEse?.tipo_input === 'timer' || selectedEse?.tipo_input === 'timer_unilaterale'
  const tipo = getTipo(local.tipo)
  const complete = !!local.esercizio_id

  const handleSelect = (id: string) => {
    const ese = esercizi.find(e => e.id === id)
    const timer = ese?.tipo_input === 'timer' || ese?.tipo_input === 'timer_unilaterale'
    setLocal(p => ({
      ...p,
      esercizio_id: id,
      ripetizioni: timer ? '30' : p.ripetizioni === '30' ? '8-12' : p.ripetizioni,
      progressione_tipo: timer ? 'durata' : p.progressione_tipo === 'durata' ? 'peso' : p.progressione_tipo,
    }))
  }

  const handleCrea = async (nome: string, muscoli: string[]) => {
    const newEse = await onCreaEsercizio(nome, muscoli)
    if (newEse) handleSelect(newEse.id)
  }

  const warmup: { peso: string; reps: string }[] = (() => { try { return JSON.parse(local.warmup_serie || '[]') } catch { return [] } })()
  const setWarmup = (w: { peso: string; reps: string }[]) => set('warmup_serie', JSON.stringify(w))

  const isNuovoGruppo = !!local.gruppo_id && !gruppi.some(g => g.id === local.gruppo_id)

  return (
    <div style={{
      padding: 16, borderTop: '1px solid var(--c-w6)',
      background: 'linear-gradient(180deg, oklch(0.13 0 0), oklch(0.12 0 0))',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* ── Colonna sinistra ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Section icon="fa-dumbbell" label="ESERCIZIO" active={complete}>
            <EsercizioPicker
              esercizi={esercizi}
              selected={local.esercizio_id}
              onSelect={handleSelect}
              onCrea={handleCrea}
            />
          </Section>

          <Section icon="fa-layer-group" label="TIPO SET" active={complete}>
            <TipoGrid value={local.tipo} onChange={v => set('tipo', v)} cols={4} />
            <div style={{
              fontSize: 10.5, color: 'var(--c-55)', marginTop: 6,
              padding: '5px 9px', borderRadius: 7, background: 'var(--c-w4)',
            }}>
              <i className="fa-solid fa-circle-info" style={{ fontSize: 9, marginRight: 6, opacity: 0.6 }} />
              {tipo.hint}
            </div>
            <TipoExtra tipo={local.tipo} local={local} set={set} />
          </Section>

          {/* Gruppo */}
          <Section icon="fa-object-group" label="GRUPPO SUPERSET" active={!!local.gruppo_id}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                onClick={() => set('gruppo_id', '')}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: !local.gruppo_id ? 'var(--c-30)' : 'var(--c-20)',
                  color: !local.gruppo_id ? 'var(--c-80)' : 'var(--c-48)',
                  border: !local.gruppo_id ? '1px solid var(--c-w20)' : '1px solid transparent',
                }}>
                Nessun gruppo
              </button>
              <button
                onClick={() => set('gruppo_id', crypto.randomUUID())}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: isNuovoGruppo ? tipo.bg : 'var(--c-20)',
                  color: isNuovoGruppo ? tipo.color : 'var(--c-48)',
                  border: isNuovoGruppo ? `1px solid ${tipo.color}40` : '1px solid transparent',
                }}>
                {isNuovoGruppo ? '✓ Nuovo gruppo' : '+ Nuovo gruppo'}
              </button>
              {gruppi.map(g => (
                <button key={g.id} onClick={() => set('gruppo_id', g.id)} style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: local.gruppo_id === g.id ? tipo.bg : 'var(--c-20)',
                  color: local.gruppo_id === g.id ? tipo.color : 'var(--c-48)',
                  border: local.gruppo_id === g.id ? `1px solid ${tipo.color}40` : '1px solid transparent',
                }}>
                  Gruppo {g.label}
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* ── Colonna destra ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Section icon="fa-sliders" label="PARAMETRI" active={complete}>
            <ParametriFields local={local} set={set} intensita={intensita} isTimer={isTimer} />
          </Section>

          <Section icon="fa-arrow-trend-up" label="PROGRESSIONE" active={complete}>
            <ProgressGrid value={local.progressione_tipo} onChange={v => set('progressione_tipo', v)} cols={4} />
          </Section>

          {/* Warmup specifico */}
          <Section icon="fa-fire" label="WARMUP SPECIFICO" collapsible>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, color: 'var(--c-50)' }}>
                {warmup.length === 0 ? 'Nessuna serie warmup' : `${warmup.length} serie`}
              </span>
              <button
                onClick={() => setWarmup([...warmup, { peso: '', reps: '10' }])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 7, fontSize: 10.5, fontWeight: 700,
                  background: 'oklch(0.65 0.18 150 / 15%)', color: 'oklch(0.65 0.18 150)',
                }}>
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: 9 }} />
                Serie
              </button>
            </div>
            {warmup.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'oklch(0.65 0.18 150)', width: 22, textAlign: 'center', flexShrink: 0 }}>
                  W{i + 1}
                </span>
                <input
                  type="text" value={w.peso} placeholder="kg"
                  onChange={e => { const u = [...warmup]; u[i] = { ...u[i], peso: e.target.value }; setWarmup(u) }}
                  style={{
                    flex: 1, padding: '5px 8px', borderRadius: 7, fontSize: 11, textAlign: 'center',
                    background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)', outline: 'none',
                  }}
                />
                <input
                  type="text" value={w.reps} placeholder="reps"
                  onChange={e => { const u = [...warmup]; u[i] = { ...u[i], reps: e.target.value }; setWarmup(u) }}
                  style={{
                    flex: 1, padding: '5px 8px', borderRadius: 7, fontSize: 11, textAlign: 'center',
                    background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)', outline: 'none',
                  }}
                />
                <button
                  onClick={() => setWarmup(warmup.filter((_, idx) => idx !== i))}
                  style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: 'oklch(0.65 0.22 27 / 20%)', color: 'oklch(0.75 0.18 27)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 9 }} />
                </button>
              </div>
            ))}
          </Section>

          <Section icon="fa-note-sticky" label="NOTE & ALTERNATIVA" collapsible>
            <FieldInput
              label="Note coach"
              value={local.note}
              placeholder="Indicazioni tecniche, avvertenze…"
              onChange={v => set('note', v)}
              area
            />
            <div style={{ marginTop: 8 }}>
              <FieldLabel>ALTERNATIVA</FieldLabel>
              <select
                value={local.alternativa_id}
                onChange={e => set('alternativa_id', e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  background: 'var(--c-18)', border: '1px solid var(--c-w6)',
                  color: 'var(--c-97)', fontSize: 12, fontFamily: 'inherit', outline: 'none',
                }}>
                <option value="">Nessuna alternativa</option>
                {esercizi.filter(e => e.id !== local.esercizio_id).map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
          </Section>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 0 0', borderTop: '1px solid var(--c-w4)', marginTop: 14,
      }}>
        <div style={{
          fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 6,
          color: complete ? 'oklch(0.68 0.18 150)' : 'var(--c-50)',
        }}>
          <FontAwesomeIcon icon={complete ? faCircleCheck : faCircle} style={{ fontSize: 10 }} />
          {complete ? 'Configurazione valida' : 'Seleziona un esercizio per continuare'}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onClose} style={{
            padding: '7px 14px', borderRadius: 9,
            background: 'var(--c-18)', color: 'var(--c-70)',
            fontSize: 11.5, fontWeight: 700,
          }}>Chiudi</button>
          <button onClick={() => onConfigura(local)} disabled={!complete} style={{
            padding: '7px 18px', borderRadius: 9,
            background: complete ? 'var(--accent)' : 'var(--c-20)',
            color: complete ? 'oklch(0.14 0.02 40)' : 'var(--c-45)',
            fontSize: 11.5, fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <FontAwesomeIcon icon={faCheck} style={{ fontSize: 10 }} />
            Conferma
          </button>
        </div>
      </div>
    </div>
  )
}
