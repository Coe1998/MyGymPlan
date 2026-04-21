'use client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWandMagicSparkles, faUtensils, faBasketShopping, faArrowRight } from '@fortawesome/free-solid-svg-icons'

interface Props {
  kcalResidue: number
  onGenPlan: () => void
  onFrigo: () => void
}

export default function DietaIntelligenteHero({ kcalResidue, onGenPlan, onFrigo }: Props) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 24,
      overflow: 'hidden',
      border: '1px solid oklch(0.70 0.19 46 / 22%)',
      background: `
        radial-gradient(ellipse 120% 80% at 100% 0%, oklch(0.70 0.19 46 / 22%) 0%, transparent 55%),
        radial-gradient(ellipse 80% 60% at 0% 100%, oklch(0.60 0.15 200 / 14%) 0%, transparent 60%),
        linear-gradient(165deg, oklch(0.19 0.02 40) 0%, oklch(0.14 0.01 30) 100%)
      `,
      boxShadow: '0 20px 40px -20px oklch(0.70 0.19 46 / 35%)',
    }}>
      {/* Shimmer */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(110deg, transparent 40%, oklch(1 0 0 / 3%) 50%, transparent 60%)',
        animation: 'shimmer 6s ease-in-out infinite',
      }} />

      {/* Header row */}
      <div className="flex items-center justify-between" style={{ padding: '16px 18px 0' }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center" style={{
            width: 28, height: 28, borderRadius: 9,
            background: 'oklch(0.70 0.19 46 / 18%)',
            border: '1px solid oklch(0.70 0.19 46 / 32%)',
            boxShadow: '0 0 14px oklch(0.70 0.19 46 / 30%) inset',
          }}>
            <FontAwesomeIcon icon={faWandMagicSparkles} style={{ fontSize: 11, color: 'oklch(0.70 0.19 46)' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'oklch(0.70 0.19 46)' }}>
              DIETA INTELLIGENTE
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-55)', marginTop: 1 }}>
              adatta al tuo target di oggi
            </div>
          </div>
        </div>
        <div style={{
          padding: '3px 7px', borderRadius: 6,
          background: 'var(--c-w6)', fontSize: 9, fontWeight: 700,
          color: 'var(--c-60)', letterSpacing: '0.06em',
        }}>AI</div>
      </div>

      {/* Headline */}
      <div style={{ padding: '14px 18px 4px' }}>
        <div style={{
          fontSize: 22, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.015em',
          color: 'var(--c-97)', fontFamily: 'Syne, Inter, sans-serif',
        }}>
          Ti mancano <span style={{ color: 'oklch(0.70 0.19 46)' }}>{kcalResidue}</span> kcal
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--c-55)', marginTop: 4, lineHeight: 1.45 }}>
          Genero pasti che chiudono esattamente i tuoi macro di oggi.
          Oppure parti da cosa hai in casa.
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 8 }}>
        <HeroAction onClick={onGenPlan} primary icon={faUtensils} title="Genera piano" subtitle="1 pasto · 1 giorno" />
        <HeroAction onClick={onFrigo} icon={faBasketShopping} title="Ho nel frigo" subtitle="usa ciò che hai" />
      </div>
    </div>
  )
}

function HeroAction({ onClick, primary, icon, title, subtitle }: {
  onClick: () => void; primary?: boolean
  icon: any; title: string; subtitle: string
}) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left', padding: '14px',
      borderRadius: 16,
      background: primary
        ? 'linear-gradient(135deg, oklch(0.70 0.19 46), oklch(0.62 0.19 40))'
        : 'oklch(1 0 0 / 5%)',
      border: primary
        ? '1px solid oklch(0.82 0.19 46 / 40%)'
        : '1px solid var(--c-w10)',
      boxShadow: primary ? '0 8px 24px -10px oklch(0.70 0.19 46 / 60%)' : 'none',
      color: primary ? 'oklch(0.14 0.02 40)' : 'var(--c-97)',
      display: 'flex', flexDirection: 'column', gap: 10,
      minHeight: 86, position: 'relative', overflow: 'hidden', width: '100%',
    }}>
      <FontAwesomeIcon icon={icon} style={{
        fontSize: 15, color: primary ? 'oklch(0.14 0.02 40)' : 'oklch(0.70 0.19 46)',
      }} />
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 10.5, marginTop: 3, fontWeight: 500, color: primary ? 'oklch(0.14 0.02 40 / 65%)' : 'var(--c-50)' }}>
          {subtitle}
        </div>
      </div>
      <FontAwesomeIcon icon={faArrowRight} style={{
        position: 'absolute', right: 12, top: 12, fontSize: 11,
        opacity: primary ? 0.5 : 0.3,
      }} />
    </button>
  )
}
