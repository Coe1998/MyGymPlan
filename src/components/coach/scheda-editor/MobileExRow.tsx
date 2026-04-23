'use client'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { getTipo, getProgress } from '@/lib/scheda-constants'
import KPI from './shared/KPI'
import MobileConfigSheet from './MobileConfigSheet'
import type { EsForm, Esercizio } from './types'

interface Props {
  index: number
  form: EsForm
  isPlaceholder: boolean
  esercizi: Esercizio[]
  intensita?: 'rpe' | 'rir' | null
  onConfigura: (form: EsForm) => void
  onDelete: () => void
  onCreaEsercizio: (nome: string, muscoli: string[]) => Promise<Esercizio | null>
}

export default function MobileExRow({ index, form, isPlaceholder, esercizi, intensita, onConfigura, onDelete, onCreaEsercizio }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const ese = esercizi.find(e => e.id === form.esercizio_id)
  const tipo = getTipo(form.tipo)
  const prog = getProgress(form.progressione_tipo)

  if (isPlaceholder) {
    return (
      <>
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 14px', borderRadius: 13,
          background: 'oklch(0.70 0.19 46 / 6%)',
          border: '1px dashed oklch(0.70 0.19 46 / 35%)',
        }}>
          <button onClick={() => setSheetOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 12, flex: 1, textAlign: 'left',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'oklch(0.70 0.19 46 / 20%)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800,
            }}>{index}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--accent)' }}>Tocca per configurare</div>
              <div style={{ fontSize: 10.5, color: 'oklch(0.70 0.19 46 / 55%)', marginTop: 2 }}>
                esercizio, tipo, serie e reps
              </div>
            </div>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            aria-label="Rimuovi"
            style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'oklch(0.65 0.22 27 / 35%)', color: 'oklch(0.85 0.16 27)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <FontAwesomeIcon icon={faTrash} style={{ fontSize: 12 }} />
          </button>
        </div>

        {sheetOpen && (
          <MobileConfigSheet
            index={index} initial={form} esercizi={esercizi} intensita={intensita}
            onClose={() => setSheetOpen(false)}
            onSave={d => { onConfigura(d); setSheetOpen(false) }}
            onCreaEsercizio={onCreaEsercizio}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div style={{
        width: '100%', padding: 14, borderRadius: 14,
        background: 'var(--c-15)',
        border: `1px solid ${tipo.color.replace(')', ' / 28%)')}`,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <button onClick={() => setSheetOpen(true)} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, textAlign: 'left',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 2,
              background: 'var(--c-22)', color: 'var(--c-70)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800,
            }}>{index}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-97)', letterSpacing: '-0.005em', lineHeight: 1.25 }}>
                {ese?.nome ?? 'Esercizio'}
              </div>
              {ese?.muscoli && (
                <div style={{ fontSize: 10.5, color: 'var(--c-50)', marginTop: 3 }}>{ese.muscoli.join(' · ')}</div>
              )}
            </div>
            <span style={{
              padding: '3px 8px', borderRadius: 6, flexShrink: 0,
              background: tipo.bg, color: tipo.color,
              fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em',
            }}>{tipo.label.toUpperCase()}</span>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            aria-label="Rimuovi"
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'oklch(0.65 0.22 27 / 35%)', color: 'oklch(0.85 0.16 27)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <FontAwesomeIcon icon={faTrash} style={{ fontSize: 12 }} />
          </button>
        </div>

        <button onClick={() => setSheetOpen(true)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '8px 10px', borderRadius: 10, background: 'var(--c-13)' }}>
            <KPI k="SER"  v={form.serie ?? '3'} />
            <KPI k="REPS" v={form.ripetizioni ?? '8-12'} />
            <KPI k="REC"  v={(form.recupero ?? '90') + 's'} />
            <KPI k="PROG" v={prog.label.replace('+ ', '+')} color={prog.color} />
          </div>

          {form.note && (
            <div style={{
              fontSize: 11, color: 'var(--c-55)', padding: '7px 10px', borderRadius: 8,
              background: 'var(--c-w4)', display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <i className="fa-solid fa-quote-left" style={{ fontSize: 9, marginTop: 3, opacity: 0.5 }} />
              <span style={{ flex: 1 }}>{form.note}</span>
            </div>
          )}
        </button>
      </div>

      {sheetOpen && (
        <MobileConfigSheet
          index={index} initial={form} esercizi={esercizi} intensita={intensita}
          onClose={() => setSheetOpen(false)}
          onSave={d => { onConfigura(d); setSheetOpen(false) }}
          onCreaEsercizio={onCreaEsercizio}
        />
      )}
    </>
  )
}
