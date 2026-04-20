import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faArrowTrendUp, faArrowTrendDown } from '@fortawesome/free-solid-svg-icons'

interface KpiCardProps {
  label: string
  value: number | string
  icon: IconDefinition
  color: string
  delta?: string
  deltaLabel?: string
  /** compact-mobile = grid 2×2 mobile default · trend = sparkline desktop · inline = riga compatta */
  variant?: 'compact-mobile' | 'trend' | 'inline'
}

function Spark({ value, color }: { value: number; color: string }) {
  const seed = String(value).charCodeAt(0)
  const data = Array.from({ length: 8 }, (_, i) =>
    Math.sin(i / 1.5 + seed * 0.3) * 3 + value + Math.sin(i * 0.7) * 1.5
  )
  const w = 60, h = 20
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

export default function KpiCard({ label, value, icon, color, delta, deltaLabel, variant = 'compact-mobile' }: KpiCardProps) {
  const trendUp = delta ? !delta.startsWith('-') : true
  const trendColor = trendUp ? 'oklch(0.65 0.18 150)' : 'oklch(0.78 0.14 27)'

  if (variant === 'inline') {
    return (
      <div style={{
        background: 'var(--c-18)', border: '1px solid var(--c-w6)',
        borderRadius: 14, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--c-22)', color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <FontAwesomeIcon icon={icon} style={{ fontSize: 13 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--c-50)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 22, color: 'var(--c-97)' }}>{value}</span>
            {delta && <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>{delta}</span>}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'trend') {
    return (
      <div style={{
        background: 'var(--c-18)', border: '1px solid var(--c-w6)',
        borderRadius: 16, padding: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--c-22)', color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FontAwesomeIcon icon={icon} style={{ fontSize: 12 }} />
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--c-70)', fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14, gap: 10 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 32, color: 'var(--c-97)', lineHeight: 1 }}>
              {value}
            </div>
            {delta && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                <FontAwesomeIcon icon={trendUp ? faArrowTrendUp : faArrowTrendDown}
                  style={{ fontSize: 10, color: trendColor }} />
                <span style={{ fontSize: 11.5, color: trendColor, fontWeight: 700 }}>{delta}</span>
                {deltaLabel && <span style={{ fontSize: 11.5, color: 'var(--c-50)' }}>{deltaLabel}</span>}
              </div>
            )}
          </div>
          <Spark value={typeof value === 'number' ? value : 0} color={color} />
        </div>
      </div>
    )
  }

  // default: compact-mobile
  return (
    <div style={{
      background: 'var(--c-18)', border: '1px solid var(--c-w6)',
      borderRadius: 14, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <FontAwesomeIcon icon={icon} style={{ fontSize: 11, color }} />
        <span style={{ fontSize: 11, color: 'var(--c-55)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 24, color: 'var(--c-97)', lineHeight: 1 }}>
          {value}
        </span>
        {delta && (
          <span style={{ fontSize: 10.5, color: trendColor, fontWeight: 600 }}>{delta}</span>
        )}
      </div>
    </div>
  )
}
