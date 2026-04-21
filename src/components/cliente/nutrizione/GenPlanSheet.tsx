'use client'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUtensils, faCalendarDay, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import SheetShell from './SheetShell'

interface Props {
  onClose: () => void
  onGenerate: (tipo: 'pasto' | 'giornata') => void
  generando?: boolean
}

export default function GenPlanSheet({ onClose, onGenerate, generando }: Props) {
  const [tipo, setTipo] = useState<'pasto' | 'giornata'>('pasto')

  return (
    <SheetShell title="Genera piano" subtitle="L'AI costruisce un pasto o una giornata intera su misura" onClose={onClose}>
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--c-55)', marginBottom: 8 }}>
          COSA GENERARE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          {([
            { id: 'pasto' as const,    icon: faUtensils,    t: 'Prossimo pasto',  s: 'Chiude i macro residui' },
            { id: 'giornata' as const, icon: faCalendarDay, t: 'Giornata intera', s: 'Tutti i pasti di oggi' },
          ] as const).map(o => (
            <button key={o.id} onClick={() => setTipo(o.id)} style={{
              padding: 14, borderRadius: 14,
              background: tipo === o.id ? 'oklch(0.70 0.19 46 / 10%)' : 'var(--c-16)',
              border: tipo === o.id ? '1.5px solid oklch(0.70 0.19 46 / 45%)' : '1px solid var(--c-w6)',
              textAlign: 'left', width: '100%',
            }}>
              <FontAwesomeIcon icon={o.icon} style={{ fontSize: 14, color: tipo === o.id ? 'oklch(0.70 0.19 46)' : 'var(--c-60)' }} />
              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--c-97)', marginTop: 8 }}>{o.t}</div>
              <div style={{ fontSize: 10.5, color: 'var(--c-50)', marginTop: 2 }}>{o.s}</div>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--c-55)', marginBottom: 8 }}>
          PREFERENZE
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: 'var(--c-16)', border: '1px solid var(--c-w6)', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {[
            { l: 'Budget tempo', v: '~25 min' },
            { l: 'Stile cucina',  v: 'Italiana' },
            { l: 'Esclusioni',    v: 'Nessuna' },
          ].map(r => (
            <div key={r.l} className="flex justify-between" style={{ fontSize: 12 }}>
              <span style={{ color: 'var(--c-55)' }}>{r.l}</span>
              <span style={{ color: 'var(--c-97)', fontWeight: 600 }}>{r.v}</span>
            </div>
          ))}
        </div>

        <button onClick={() => onGenerate(tipo)} className="w-full flex items-center justify-center gap-2" style={{
          padding: 14, borderRadius: 14,
          background: 'linear-gradient(135deg, oklch(0.70 0.19 46), oklch(0.62 0.19 40))',
          color: 'oklch(0.14 0.02 40)', fontSize: 13.5, fontWeight: 800,
          boxShadow: '0 10px 28px -12px oklch(0.70 0.19 46 / 60%)',
        }}>
          <FontAwesomeIcon icon={faWandMagicSparkles} />
          {generando ? 'Generazione in corso…' : 'Genera ora'}
        </button>
      </div>
    </SheetShell>
  )
}
