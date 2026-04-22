'use client'
import { useState } from 'react'
import { SCHEDA_TIPI, getTipo } from '@/lib/scheda-constants'
import EsercizioPicker from './sections/EsercizioPicker'
import TipoGrid from './sections/TipoGrid'
import TipoExtra from './sections/TipoExtra'
import ProgressGrid from './sections/ProgressGrid'
import ParametriFields from './sections/ParametriFields'
import FieldInput, { FieldLabel } from './shared/FieldInput'
import type { EsForm, Esercizio } from './types'

const STEPS = [
  { label: 'Esercizio', icon: 'fa-dumbbell' },
  { label: 'Tipo & dati', icon: 'fa-sliders' },
  { label: 'Avanzate',   icon: 'fa-note-sticky' },
]

interface Props {
  index: number
  initial: EsForm
  esercizi: Esercizio[]
  intensita?: 'rpe' | 'rir' | null
  onClose: () => void
  onSave: (form: EsForm) => void
  onCreaEsercizio: (nome: string, muscoli: string[]) => Promise<Esercizio | null>
}

export default function MobileConfigSheet({ index, initial, esercizi, intensita, onClose, onSave, onCreaEsercizio }: Props) {
  const [step, setStep] = useState(initial.esercizio_id ? 1 : 0)
  const [local, setLocal] = useState<EsForm>({ ...initial })
  const set = (k: keyof EsForm, v: string) => setLocal(p => ({ ...p, [k]: v }))

  const selectedEse = esercizi.find(e => e.id === local.esercizio_id)
  const isTimer = selectedEse?.tipo_input === 'timer' || selectedEse?.tipo_input === 'timer_unilaterale'
  const tipo = getTipo(local.tipo)

  const handleSelect = (id: string) => {
    const ese = esercizi.find(e => e.id === id)
    const timer = ese?.tipo_input === 'timer' || ese?.tipo_input === 'timer_unilaterale'
    setLocal(p => ({
      ...p,
      esercizio_id: id,
      ripetizioni: timer ? '30' : p.ripetizioni === '30' ? '8-12' : p.ripetizioni,
      progressione_tipo: timer ? 'durata' : p.progressione_tipo === 'durata' ? 'peso' : p.progressione_tipo,
    }))
    if (id) setStep(1)
  }

  const handleCrea = async (nome: string, muscoli: string[]) => {
    const newEse = await onCreaEsercizio(nome, muscoli)
    if (newEse) handleSelect(newEse.id)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'oklch(0 0 0 / 55%)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'sheetFadeIn 200ms cubic-bezier(.2,.9,.3,1)',
      }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, maxHeight: '92vh',
        background: 'linear-gradient(180deg, oklch(0.14 0 0), oklch(0.11 0 0))',
        borderRadius: '22px 22px 0 0',
        borderTop: '1px solid var(--c-w10)',
        boxShadow: '0 -30px 60px -10px oklch(0 0 0 / 70%)',
        display: 'flex', flexDirection: 'column',
        animation: 'sheetSlideUp 280ms cubic-bezier(.2,.9,.3,1)',
      }}>
        {/* Drag handle */}
        <div style={{ paddingTop: 10, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--c-30)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '10px 18px 14px', borderBottom: '1px solid var(--c-w4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'oklch(0.70 0.19 46 / 20%)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800,
            }}>{index}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--c-55)' }}>
                ESERCIZIO {index}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-97)', marginTop: 1, letterSpacing: '-0.01em' }}>
                {selectedEse?.nome ?? 'Configura esercizio'}
              </div>
            </div>
            <button onClick={onClose} aria-label="Chiudi" style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--c-18)', color: 'var(--c-70)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fa-solid fa-xmark" style={{ fontSize: 11 }} />
            </button>
          </div>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12 }}>
            {STEPS.map((s, i) => {
              const active = i === step
              const done = i < step && (i === 0 ? !!local.esercizio_id : true)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
                  <button
                    onClick={() => setStep(i)}
                    disabled={i > 0 && !local.esercizio_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 9px', borderRadius: 7, whiteSpace: 'nowrap',
                      background: active ? 'oklch(0.70 0.19 46 / 18%)' : done ? 'oklch(0.65 0.18 150 / 12%)' : 'var(--c-18)',
                      color: active ? 'var(--accent)' : done ? 'oklch(0.68 0.18 150)' : 'var(--c-55)',
                      fontSize: 10.5, fontWeight: 700,
                      opacity: i > 0 && !local.esercizio_id ? 0.45 : 1,
                    }}>
                    <i className={`fa-solid ${done ? 'fa-check' : s.icon}`} style={{ fontSize: 9 }} />
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 1, background: 'var(--c-w6)', marginLeft: 4 }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>
          {step === 0 && (
            <EsercizioPicker
              esercizi={esercizi}
              selected={local.esercizio_id}
              onSelect={handleSelect}
              onCrea={handleCrea}
            />
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Tipo */}
              <div>
                <FieldLabel>TIPO SET</FieldLabel>
                <TipoGrid value={local.tipo} onChange={v => set('tipo', v)} cols={3} />
                <div style={{
                  fontSize: 10.5, color: 'var(--c-55)', marginTop: 6,
                  padding: '6px 10px', borderRadius: 8, background: 'var(--c-w4)',
                }}>
                  <i className="fa-solid fa-circle-info" style={{ fontSize: 9, marginRight: 6, opacity: 0.6 }} />
                  {tipo.hint}
                </div>
                <TipoExtra tipo={local.tipo} local={local} set={set} />
              </div>

              {/* Parametri */}
              <div>
                <FieldLabel>PARAMETRI</FieldLabel>
                <ParametriFields local={local} set={set} intensita={intensita} isTimer={isTimer} />
              </div>

              {/* Progressione */}
              <div>
                <FieldLabel>PROGRESSIONE</FieldLabel>
                <ProgressGrid value={local.progressione_tipo} onChange={v => set('progressione_tipo', v)} cols={2} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FieldInput label="Note coach" value={local.note}
                placeholder="Indicazioni tecniche, avvertenze…"
                onChange={v => set('note', v)} area />

              <div>
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

              <div style={{
                padding: 14, borderRadius: 12,
                background: 'oklch(0.65 0.18 150 / 8%)', border: '1px solid oklch(0.65 0.18 150 / 22%)',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <i className="fa-solid fa-sparkles" style={{ color: 'oklch(0.72 0.18 150)', fontSize: 13, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-90)' }}>Quasi pronto</div>
                  <div style={{ fontSize: 10.5, color: 'var(--c-55)', marginTop: 2, lineHeight: 1.45 }}>
                    Tutti i campi avanzati sono opzionali: puoi salvare così o completare più tardi.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px 16px', borderTop: '1px solid var(--c-w4)',
          background: 'oklch(0.10 0 0)',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{
              padding: '12px 14px', borderRadius: 11,
              background: 'var(--c-18)', color: 'var(--c-80)',
              fontSize: 12.5, fontWeight: 700,
            }}>
              <i className="fa-solid fa-arrow-left" style={{ fontSize: 11, marginRight: 5 }} />
              Indietro
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !local.esercizio_id}
              style={{
                padding: '12px 22px', borderRadius: 11,
                background: step === 0 && !local.esercizio_id ? 'var(--c-20)' : 'var(--accent)',
                color: step === 0 && !local.esercizio_id ? 'var(--c-45)' : 'oklch(0.14 0.02 40)',
                fontSize: 12.5, fontWeight: 800,
                boxShadow: step === 0 && !local.esercizio_id ? 'none' : '0 8px 18px -8px oklch(0.70 0.19 46 / 55%)',
              }}>
              Avanti
              <i className="fa-solid fa-arrow-right" style={{ fontSize: 11, marginLeft: 6 }} />
            </button>
          ) : (
            <>
              <button onClick={() => onSave(local)} style={{
                padding: '12px 16px', borderRadius: 11,
                background: 'var(--c-18)', color: 'var(--c-80)',
                fontSize: 12, fontWeight: 700,
              }}>Salta</button>
              <button onClick={() => onSave(local)} style={{
                padding: '12px 22px', borderRadius: 11,
                background: 'var(--accent)', color: 'oklch(0.14 0.02 40)',
                fontSize: 12.5, fontWeight: 800,
                boxShadow: '0 8px 18px -8px oklch(0.70 0.19 46 / 55%)',
              }}>
                <i className="fa-solid fa-check" style={{ fontSize: 11, marginRight: 6 }} />
                Conferma
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
