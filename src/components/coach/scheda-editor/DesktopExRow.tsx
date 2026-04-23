'use client'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronUp, faChevronDown, faTrash } from '@fortawesome/free-solid-svg-icons'
import { getTipo, getProgress } from '@/lib/scheda-constants'
import DesktopInlineForm from './DesktopInlineForm'
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

function NumCell({ w, v, isPlaceholder }: { w: number; v?: string | null; isPlaceholder: boolean }) {
  return (
    <div style={{ width: w }}>
      {v ? (
        <span style={{ fontFamily: 'Syne, Inter', fontWeight: 700, fontSize: 13, color: 'var(--c-97)', fontVariantNumeric: 'tabular-nums' }}>
          {v}
        </span>
      ) : (
        <span style={{ fontSize: 11, color: isPlaceholder ? 'oklch(0.70 0.19 46 / 55%)' : 'var(--c-40)' }}>—</span>
      )}
    </div>
  )
}

export default function DesktopExRow({ index, form, isPlaceholder, esercizi, intensita, onConfigura, onDelete, onCreaEsercizio }: Props) {
  const [expanded, setExpanded] = useState(isPlaceholder)

  const ese = esercizi.find(e => e.id === form.esercizio_id)
  const tipo = getTipo(form.tipo)
  const prog = getProgress(form.progressione_tipo)
  const complete = !isPlaceholder && !!ese

  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      background: isPlaceholder ? 'oklch(0.70 0.19 46 / 5%)' : expanded ? 'var(--c-14)' : 'var(--c-15)',
      border: isPlaceholder
        ? '1px dashed oklch(0.70 0.19 46 / 35%)'
        : `1px solid ${expanded ? tipo.color.replace(')', ' / 28%)') : 'var(--c-w6)'}`,
      transition: 'background 200ms, border-color 200ms',
    }}>
      {/* Compact row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        {/* # */}
        <div style={{ width: 36, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7,
            background: isPlaceholder ? 'oklch(0.70 0.19 46 / 20%)' : 'var(--c-22)',
            color: isPlaceholder ? 'var(--accent)' : 'var(--c-70)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800,
          }}>{index}</div>
        </div>

        {/* Esercizio */}
        <div style={{ flex: 1.5, minWidth: 0 }}>
          {complete ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-97)', letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ese!.nome}
              </div>
              <div style={{ fontSize: 10, color: 'var(--c-50)', marginTop: 1 }}>
                {ese!.muscoli?.join(' · ')}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: isPlaceholder ? 'var(--accent)' : 'var(--c-45)' }}>
              {isPlaceholder ? 'Scegli esercizio…' : '—'}
            </div>
          )}
        </div>

        {/* Tipo */}
        <div style={{ width: 110 }}>
          {complete ? (
            <span style={{ display: 'inline-block', padding: '4px 9px', borderRadius: 7, background: tipo.bg, color: tipo.color, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em' }}>
              {tipo.label.toUpperCase()}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--c-40)' }}>—</span>
          )}
        </div>

        <NumCell w={60}  v={form.serie}      isPlaceholder={isPlaceholder} />
        <NumCell w={80}  v={form.ripetizioni} isPlaceholder={isPlaceholder} />
        <NumCell w={60}  v={form.recupero ? form.recupero + 's' : null} isPlaceholder={isPlaceholder} />

        {/* Progressione */}
        <div style={{ width: 110 }}>
          {complete ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: prog.color }}>{prog.label}</span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--c-40)' }}>—</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ width: 68, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setExpanded(e => !e)}
            aria-label={expanded ? 'Chiudi' : 'Espandi'}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: expanded ? 'oklch(0.70 0.19 46 / 22%)' : 'var(--c-25)',
              color: expanded ? 'var(--accent)' : 'var(--c-80)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 160ms',
            }}>
            <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} style={{ fontSize: 10 }} />
          </button>
          <button onClick={onDelete} aria-label="Elimina" style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'oklch(0.65 0.22 27 / 35%)', color: 'oklch(0.85 0.16 27)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FontAwesomeIcon icon={faTrash} style={{ fontSize: 11 }} />
          </button>
        </div>
      </div>

      {expanded && (
        <DesktopInlineForm
          data={form}
          esercizi={esercizi}
          intensita={intensita}
          onConfigura={f => { onConfigura(f); setExpanded(false) }}
          onClose={() => setExpanded(false)}
          onCreaEsercizio={onCreaEsercizio}
        />
      )}
    </div>
  )
}
