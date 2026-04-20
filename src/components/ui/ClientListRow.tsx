import { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import StatoBadge from './StatoBadge'

interface ClientListRowProps {
  nome: string
  initiale: string
  stato: string
  alertLabel?: string
  sessioni: number
  giorniInattivo: number | null
  isNuovo?: boolean
  hasAlert?: boolean
  onClick?: () => void
  isLast?: boolean
}

const ClientListRow = memo(function ClientListRow({
  nome, initiale, stato, alertLabel, sessioni, giorniInattivo,
  isNuovo = false, hasAlert = false, onClick, isLast = false,
}: ClientListRowProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--c-w4)',
        cursor: 'pointer', background: 'transparent',
        minHeight: 44,
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: hasAlert ? 'oklch(0.65 0.22 27 / 18%)' : 'oklch(0.70 0.19 46 / 15%)',
          color: hasAlert ? 'oklch(0.78 0.14 27)' : 'oklch(0.70 0.19 46)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14,
        }}>
          {initiale}
        </div>
        {isNuovo && (
          <span style={{
            position: 'absolute', top: -2, right: -4,
            fontSize: 8, fontWeight: 800, padding: '1.5px 4px',
            borderRadius: 4, background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)',
            letterSpacing: '0.04em',
          }}>NEW</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-97)' }}>{nome}</div>
        {hasAlert && alertLabel ? (
          <div style={{ fontSize: 11.5, color: 'oklch(0.78 0.14 27)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: 9 }} />
            {alertLabel}
          </div>
        ) : (
          <div style={{ fontSize: 11.5, color: 'var(--c-50)', marginTop: 2 }}>
            <StatoBadge stato={stato} size="sm" />
            <span style={{ marginLeft: 6 }}>
              {sessioni} sessioni
              {giorniInattivo !== null && ` · ${giorniInattivo === 0 ? 'oggi' : giorniInattivo === 1 ? 'ieri' : `${giorniInattivo}gg fa`}`}
            </span>
          </div>
        )}
      </div>

      <FontAwesomeIcon icon={faChevronRight} style={{ color: 'var(--c-40)', fontSize: 11, flexShrink: 0 }} />
    </button>
  )
})

export default ClientListRow
