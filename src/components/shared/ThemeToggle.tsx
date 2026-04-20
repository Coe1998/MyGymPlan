'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('mgp-theme')
    if (stored === 'light') setTheme('light')
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('mgp-theme', next)
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  return (
    <button
      onClick={toggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '14px 16px',
        borderRadius: 12,
        background: 'var(--c-18)',
        border: '1px solid var(--c-w8)',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-97)' }}>
            {theme === 'dark' ? 'Modalità scura' : 'Modalità chiara'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-55)', marginTop: 2 }}>
            {theme === 'dark' ? 'Tocca per passare al tema chiaro' : 'Tocca per passare al tema scuro'}
          </div>
        </div>
      </div>
      {/* Toggle pill */}
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 99,
          background: theme === 'light' ? 'oklch(0.70 0.19 46)' : 'var(--c-35)',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: theme === 'light' ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--c-97)',
            transition: 'left 0.2s',
          }}
        />
      </div>
    </button>
  )
}
