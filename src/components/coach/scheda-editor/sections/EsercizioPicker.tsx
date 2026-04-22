'use client'
import { useState } from 'react'
import { SCHEDA_MUSCOLI } from '@/lib/scheda-constants'
import FilterChip from '../shared/FilterChip'
import type { Esercizio } from '../types'

interface Props {
  esercizi: Esercizio[]
  selected: string
  onSelect: (id: string) => void
  onCrea: (nome: string, muscoli: string[]) => Promise<void>
}

export default function EsercizioPicker({ esercizi, selected, onSelect, onCrea }: Props) {
  const [search, setSearch] = useState('')
  const [filtroMuscolo, setFiltroMuscolo] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'' | 'reps' | 'reps_unilaterale' | 'timer' | 'timer_unilaterale'>('')
  const [nuovoNome, setNuovoNome] = useState('')
  const [nuovoMuscoli, setNuovoMuscoli] = useState<string[]>([])
  const [creando, setCreando] = useState(false)
  const [showCrea, setShowCrea] = useState(false)

  const selectedEse = esercizi.find(e => e.id === selected)

  const filt = esercizi.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) &&
    (!filtroMuscolo || e.muscoli?.includes(filtroMuscolo)) &&
    (!filtroTipo || e.tipo_input === filtroTipo)
  ).slice(0, 30)

  const handleCrea = async () => {
    if (!nuovoNome.trim() || creando) return
    setCreando(true)
    await onCrea(nuovoNome.trim(), nuovoMuscoli)
    setNuovoNome(''); setNuovoMuscoli([]); setShowCrea(false)
    setCreando(false)
  }

  if (selectedEse) {
    return (
      <div style={{
        padding: '10px 12px', borderRadius: 10,
        background: 'oklch(0.65 0.18 150 / 10%)',
        border: '1px solid oklch(0.65 0.18 150 / 28%)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <i className="fa-solid fa-circle-check" style={{ color: 'oklch(0.68 0.18 150)', fontSize: 14 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-97)' }}>{selectedEse.nome}</div>
          {selectedEse.muscoli && (
            <div style={{ fontSize: 10.5, color: 'var(--c-55)', marginTop: 1 }}>{selectedEse.muscoli.join(' · ')}</div>
          )}
        </div>
        <button onClick={() => onSelect('')} style={{
          padding: '4px 8px', borderRadius: 6,
          background: 'var(--c-w6)', color: 'var(--c-60)',
          fontSize: 10, fontWeight: 700,
        }}>Cambia</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Muscolo chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <FilterChip label="Tutti" active={!filtroMuscolo} onClick={() => setFiltroMuscolo('')} />
        {SCHEDA_MUSCOLI.map(m => (
          <FilterChip key={m} label={m} active={filtroMuscolo === m}
            onClick={() => setFiltroMuscolo(filtroMuscolo === m ? '' : m)} />
        ))}
      </div>

      {/* Tipo input chips */}
      <div style={{ display: 'flex', gap: 4 }}>
        {([['', 'Tutti'], ['reps', 'Reps'], ['reps_unilaterale', 'Unilat.'], ['timer', 'Timer']] as const).map(([id, lbl]) => (
          <FilterChip key={id} label={lbl} active={filtroTipo === id}
            onClick={() => setFiltroTipo(id as any)} />
        ))}
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 9,
        background: 'var(--c-18)', border: '1px solid var(--c-w8)',
      }}>
        <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 11, color: 'var(--c-50)' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cerca esercizio…" autoFocus
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--c-97)', fontFamily: 'inherit' }}
        />
      </div>

      {/* List */}
      <div style={{ maxHeight: 180, overflowY: 'auto', borderRadius: 9, background: 'oklch(0.10 0 0)', border: '1px solid var(--c-w4)' }}>
        {filt.length === 0 && (
          <div style={{ padding: 14, fontSize: 11, color: 'var(--c-45)', textAlign: 'center' }}>Nessun risultato</div>
        )}
        {filt.map(e => (
          <button key={e.id} onClick={() => onSelect(e.id)} style={{
            width: '100%', textAlign: 'left',
            padding: '9px 12px', borderBottom: '1px solid var(--c-w4)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}
          onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--c-w4)')}
          onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-90)' }}>{e.nome}</span>
            <span style={{ fontSize: 10, color: 'var(--c-45)', flexShrink: 0 }}>{e.muscoli?.join(' · ')}</span>
          </button>
        ))}
      </div>

      {/* Crea */}
      {!showCrea ? (
        <button onClick={() => setShowCrea(true)} style={{
          width: '100%', padding: '8px', borderRadius: 8,
          background: 'transparent', border: '1px dashed oklch(0.65 0.18 280 / 40%)',
          color: 'oklch(0.72 0.18 280)', fontSize: 11, fontWeight: 700,
        }}>
          <i className="fa-solid fa-plus" style={{ marginRight: 6, fontSize: 10 }} />
          Crea nuovo esercizio
        </button>
      ) : (
        <div style={{ padding: 10, borderRadius: 10, background: 'var(--c-20)', border: '1px solid oklch(0.65 0.18 280 / 25%)' }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', color: 'oklch(0.72 0.18 280)', marginBottom: 8 }}>
            CREA ESERCIZIO
          </div>
          <input value={nuovoNome} onChange={e => setNuovoNome(e.target.value)} placeholder="Nome esercizio *"
            style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: 'var(--c-25)', border: '1px solid var(--c-w8)', color: 'var(--c-97)', fontSize: 12, outline: 'none', marginBottom: 6 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {SCHEDA_MUSCOLI.map(m => (
              <button key={m} onClick={() => setNuovoMuscoli(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                style={{
                  padding: '3px 7px', borderRadius: 999, fontSize: 9.5, fontWeight: 700,
                  background: nuovoMuscoli.includes(m) ? 'oklch(0.70 0.19 46 / 20%)' : 'var(--c-25)',
                  color: nuovoMuscoli.includes(m) ? 'var(--accent)' : 'var(--c-55)',
                }}>
                {m}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setShowCrea(false)} style={{ flex: 1, padding: '7px', borderRadius: 7, background: 'var(--c-25)', color: 'var(--c-60)', fontSize: 11, fontWeight: 700 }}>
              Annulla
            </button>
            <button onClick={handleCrea} disabled={!nuovoNome.trim() || creando} style={{
              flex: 1, padding: '7px', borderRadius: 7, fontSize: 11, fontWeight: 800,
              background: nuovoNome.trim() ? 'oklch(0.65 0.18 280 / 20%)' : 'var(--c-20)',
              color: nuovoNome.trim() ? 'oklch(0.72 0.18 280)' : 'var(--c-45)',
            }}>
              {creando ? '…' : 'Crea'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
