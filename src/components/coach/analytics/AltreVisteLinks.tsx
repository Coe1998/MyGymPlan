'use client'
import Link from 'next/link'

interface Row { href: string; label: string; sub: string; badge: string }

interface Props { clienteId: string }

export default function AltreVisteLinks({ clienteId }: Props) {
  const rows: Row[] = [
    { href: `/coach/clienti/${clienteId}/analytics/massimi`,  label: 'Massimi per gruppo muscolare', sub: 'top e1RM per muscolo', badge: '→' },
    { href: `/coach/clienti/${clienteId}/analytics/benessere`, label: 'Pattern benessere',             sub: 'energia · stress · sonno', badge: '→' },
    { href: `/coach/clienti/${clienteId}/analytics/peso`,      label: 'Andamento peso',               sub: 'grafico e trend settimanale', badge: '→' },
    { href: `/coach/clienti/${clienteId}/analytics/storico`,   label: 'Storico sessioni',             sub: 'lista completa con dettagli', badge: '→' },
  ]

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--c-50)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10 }}>
        Altre viste
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(row => (
          <Link key={row.href} href={row.href}
            style={{
              background: 'var(--c-18)', border: '1px solid var(--c-w6)',
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              textDecoration: 'none', minHeight: 56,
            }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-97)', letterSpacing: -0.2, lineHeight: 1.3 }}>{row.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--c-50)', marginTop: 2 }}>{row.sub}</div>
            </div>
            <div style={{ color: 'oklch(0.70 0.19 46)', fontSize: 18, flexShrink: 0, marginLeft: 12, fontWeight: 700 }}>›</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
