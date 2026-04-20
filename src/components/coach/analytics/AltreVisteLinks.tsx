'use client'
import { useState } from 'react'
import MassimoMuscoli from './MassimoMuscoli'
import PatternBenessere from './PatternBenessere'
import AndamentoPeso from './AndamentoPeso'
import StoricoSessioni from './StoricoSessioni'

interface Props { clienteId: string }

const VISTE = [
  { id: 'massimi',   label: 'Massimi per gruppo muscolare', sub: 'top e1RM per muscolo' },
  { id: 'benessere', label: 'Pattern benessere',            sub: 'energia · stress · sonno' },
  { id: 'peso',      label: 'Andamento peso',               sub: 'grafico e trend settimanale' },
  { id: 'storico',   label: 'Storico sessioni',             sub: 'lista completa con dettagli' },
]

export default function AltreVisteLinks({ clienteId }: Props) {
  const [aperto, setAperto] = useState<string | null>(null)

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--c-50)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10 }}>
        Altre viste
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {VISTE.map(v => {
          const isOpen = aperto === v.id
          return (
            <div key={v.id} style={{
              background: 'var(--c-18)', border: `1px solid ${isOpen ? 'var(--c-w10)' : 'var(--c-w6)'}`,
              borderRadius: 12, overflow: 'hidden',
              transition: 'border-color 0.15s',
            }}>
              <button
                onClick={() => setAperto(isOpen ? null : v.id)}
                style={{
                  width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '12px 14px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', textAlign: 'left', minHeight: 52,
                }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-97)', letterSpacing: -0.2, lineHeight: 1.3 }}>{v.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--c-50)', marginTop: 2 }}>{v.sub}</div>
                </div>
                <div style={{
                  color: isOpen ? 'oklch(0.70 0.19 46)' : 'var(--c-35)',
                  fontSize: 18, fontWeight: 700, flexShrink: 0, marginLeft: 12,
                  transform: isOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s, color 0.15s',
                }}>›</div>
              </button>

              {isOpen && (
                <div style={{ borderTop: '1px solid var(--c-w6)', padding: '4px 0 8px' }}>
                  {v.id === 'massimi'   && <MassimoMuscoli   clienteId={clienteId} />}
                  {v.id === 'benessere' && <PatternBenessere  clienteId={clienteId} />}
                  {v.id === 'peso'      && <AndamentoPeso     clienteId={clienteId} />}
                  {v.id === 'storico'   && <StoricoSessioni   clienteId={clienteId} />}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
