import Link from 'next/link'

interface SectionHeaderProps {
  label: string
  href?: string
  linkLabel?: string
  className?: string
}

export default function SectionHeader({ label, href, linkLabel = 'Tutti →', className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-2.5 ${className}`}>
      <span style={{
        fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.10em', color: 'var(--c-80)',
      }}>
        {label}
      </span>
      {href && (
        <Link href={href} style={{ fontSize: 11.5, color: 'var(--c-50)', fontWeight: 600 }}>
          {linkLabel}
        </Link>
      )}
    </div>
  )
}
