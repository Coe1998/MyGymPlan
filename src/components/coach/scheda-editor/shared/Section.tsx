'use client'
import { useState } from 'react'

export default function Section({ icon, label, children, active, collapsible }: {
  icon: string; label: string; children: React.ReactNode
  active?: boolean; collapsible?: boolean
}) {
  const [open, setOpen] = useState(!collapsible)
  return (
    <div style={{ borderRadius: 11, background: 'var(--c-15)', border: '1px solid var(--c-w6)', overflow: 'hidden' }}>
      <button
        onClick={() => collapsible && setOpen(o => !o)}
        disabled={!collapsible}
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          background: 'oklch(0.14 0 0 / 70%)',
          borderBottom: open ? '1px solid var(--c-w4)' : 'none',
          cursor: collapsible ? 'pointer' : 'default',
        }}>
        <i className={`fa-solid ${icon}`} style={{ fontSize: 10, color: active ? 'var(--accent)' : 'var(--c-50)' }} />
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em',
          color: active ? 'var(--c-80)' : 'var(--c-55)', flex: 1,
        }}>{label}</span>
        {collapsible && (
          <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 9, color: 'var(--c-50)' }} />
        )}
      </button>
      {open && <div style={{ padding: 12 }}>{children}</div>}
    </div>
  )
}
