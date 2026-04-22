export type EditorMode = 'mobile' | 'desktop'

export default function ModeToggle({ mode, onChange }: { mode: EditorMode; onChange: (m: EditorMode) => void }) {
  return (
    <div style={{
      display: 'inline-flex', gap: 2,
      padding: 3, borderRadius: 999,
      background: 'var(--c-18)', border: '1px solid var(--c-w6)',
    }}>
      {([
        { id: 'mobile',  icon: 'fa-mobile-screen', label: 'Mobile' },
        { id: 'desktop', icon: 'fa-table-cells',   label: 'Desktop' },
      ] as const).map(m => {
        const active = mode === m.id
        return (
          <button key={m.id} onClick={() => onChange(m.id)} style={{
            padding: '4px 10px', borderRadius: 999,
            background: active ? 'var(--c-25)' : 'transparent',
            color: active ? 'var(--c-97)' : 'var(--c-55)',
            fontSize: 10.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
            border: active ? '1px solid var(--c-w10)' : '1px solid transparent',
          }}>
            <i className={`fa-solid ${m.icon}`} style={{ fontSize: 10 }} />
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
