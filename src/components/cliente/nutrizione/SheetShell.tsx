'use client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

interface Props {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}

export default function SheetShell({ title, subtitle, onClose, children }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'oklch(0 0 0 / 55%)', backdropFilter: 'blur(4px)', animation: 'fadeIn 200ms ease' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '88%',
          background: 'var(--c-13)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTop: '1px solid var(--c-w10)',
          overflowY: 'auto',
          animation: 'slideUp 260ms cubic-bezier(.2,.9,.3,1)',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center" style={{ padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--c-30)' }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3" style={{ padding: '10px 20px 14px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontSize: 19, fontWeight: 800, letterSpacing: '-0.015em',
              fontFamily: 'Syne, Inter, sans-serif', margin: 0, color: 'var(--c-97)',
            }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 12, color: 'var(--c-55)', marginTop: 3 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--c-20)', color: 'var(--c-60)' }}>
            <FontAwesomeIcon icon={faXmark} style={{ fontSize: 12 }} />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
