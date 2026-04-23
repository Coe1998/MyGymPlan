'use client'
import { useState } from 'react'
import type { Giorno } from './types'

interface Props {
  giorni: Giorno[]
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onRinomina: (id: string, nome: string) => void
  configurati: number
  inAttesa: number
}

export default function DayTabs({ giorni, activeId, onSelect, onAdd, onRinomina, configurati, inAttesa }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNome, setEditingNome] = useState('')

  const startEdit = (g: Giorno) => {
    setEditingId(g.id)
    setEditingNome(g.nome)
  }

  const commitEdit = (id: string) => {
    const trimmed = editingNome.trim()
    if (trimmed) onRinomina(id, trimmed)
    setEditingId(null)
  }

  return (
    <div style={{
      padding: '14px 22px 0',
      display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto',
    }}>
      {giorni.map(g =>
        editingId === g.id ? (
          <input
            key={g.id}
            autoFocus
            value={editingNome}
            onChange={e => setEditingNome(e.target.value)}
            onBlur={() => commitEdit(g.id)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit(g.id)
              if (e.key === 'Escape') setEditingId(null)
            }}
            style={{
              padding: '8px 16px', borderRadius: 999, flexShrink: 0,
              background: 'var(--accent)', color: 'oklch(0.14 0.02 40)',
              fontSize: 12.5, fontWeight: 800, letterSpacing: '-0.005em',
              outline: 'none', minWidth: 80, maxWidth: 160,
              boxShadow: '0 8px 18px -8px oklch(0.70 0.19 46 / 50%)',
            }}
          />
        ) : (
          <button
            key={g.id}
            onClick={() => onSelect(g.id)}
            onDoubleClick={() => startEdit(g)}
            title="Doppio click per rinominare"
            style={{
              padding: '8px 16px', borderRadius: 999, whiteSpace: 'nowrap',
              background: g.id === activeId ? 'var(--accent)' : 'var(--c-18)',
              color: g.id === activeId ? 'oklch(0.14 0.02 40)' : 'var(--c-70)',
              fontSize: 12.5, fontWeight: 800, letterSpacing: '-0.005em',
              boxShadow: g.id === activeId ? '0 8px 18px -8px oklch(0.70 0.19 46 / 50%)' : 'none',
            }}>
            {g.nome}
          </button>
        )
      )}

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
