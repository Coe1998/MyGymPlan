import type { Giorno } from './types'

interface Props {
  giorni: Giorno[]
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  configurati: number
  inAttesa: number
}

export default function DayTabs({ giorni, activeId, onSelect, onAdd, configurati, inAttesa }: Props) {
  return (
    <div style={{
      padding: '14px 22px 0',
      display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto',
    }}>
      {giorni.map(g => (
        <button key={g.id} onClick={() => onSelect(g.id)} style={{
          padding: '8px 16px', borderRadius: 999, whiteSpace: 'nowrap',
          background: g.id === activeId ? 'var(--accent)' : 'var(--c-18)',
          color: g.id === activeId ? 'oklch(0.14 0.02 40)' : 'var(--c-70)',
          fontSize: 12.5, fontWeight: 800, letterSpacing: '-0.005em',
          boxShadow: g.id === activeId ? '0 8px 18px -8px oklch(0.70 0.19 46 / 50%)' : 'none',
        }}>
          {g.nome}
        </button>
      ))}
      {giorni.length === 0 ? (
        <button onClick={onAdd} style={{
          padding: '8px 16px', borderRadius: 999, flexShrink: 0,
          background: 'oklch(0.70 0.19 46 / 14%)', border: '1.5px dashed oklch(0.70 0.19 46 / 50%)',
          color: 'var(--accent)', fontSize: 12.5, fontWeight: 800, letterSpacing: '-0.005em',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />
          Aggiungi giorno
        </button>
      ) : (
        <button onClick={onAdd} aria-label="Aggiungi giorno" style={{
          padding: '8px 12px', borderRadius: 999, flexShrink: 0,
          background: 'oklch(0.70 0.19 46 / 10%)', border: '1px solid oklch(0.70 0.19 46 / 30%)',
          color: 'var(--accent)', fontSize: 11.5, fontWeight: 800,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />
          Giorno
        </button>
      )}

      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 10.5, color: 'var(--c-45)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span><strong style={{ color: 'var(--c-80)', fontWeight: 800 }}>{configurati}</strong> ok</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--c-30)', display: 'inline-block' }} />
        <span style={{ color: inAttesa > 0 ? 'var(--accent)' : 'var(--c-45)' }}>
          <strong style={{ fontWeight: 800 }}>{inAttesa}</strong> in attesa
        </span>
      </div>
    </div>
  )
}
