'use client'

import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowDownWideShort, faChevronDown } from '@fortawesome/free-solid-svg-icons'

interface SortOption<T extends string> {
  id: T
  label: string
}

interface SortDropdownProps<T extends string> {
  options: SortOption<T>[]
  value: T
  onChange: (v: T) => void
}

export default function SortDropdown<T extends string>({ options, value, onChange }: SortDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = options.find(o => o.id === value)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          height: 34, padding: '0 12px', borderRadius: 10,
          background: 'var(--c-22)', border: '1px solid var(--c-w8)',
          fontSize: 12, color: 'var(--c-80)', fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: 7,
          cursor: 'pointer',
        }}
      >
        <FontAwesomeIcon icon={faArrowDownWideShort} style={{ fontSize: 11, color: 'var(--c-55)' }} />
        <span>Ordina: <b style={{ color: 'var(--c-97)', fontWeight: 600 }}>{current?.label}</b></span>
        <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 9, color: 'var(--c-50)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)',
          background: 'var(--c-22)', border: '1px solid var(--c-w10)',
          borderRadius: 10, padding: 4, minWidth: 190,
          boxShadow: '0 12px 30px oklch(0 0 0 / 40%)',
          zIndex: 30,
        }}>
          {options.map(o => (
            <button
              key={o.id}
              onClick={() => { onChange(o.id); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 10px', borderRadius: 6,
                fontSize: 12.5,
                color: value === o.id ? 'var(--c-97)' : 'var(--c-70)',
                background: value === o.id ? 'var(--c-w6)' : 'transparent',
                fontWeight: value === o.id ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
