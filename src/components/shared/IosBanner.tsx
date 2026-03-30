'use client'

import { useEffect, useState } from 'react'

const DISMISS_KEY = 'bynari-ios-banner-dismissed-at'
const DAYS_BEFORE_RESHOWING = 7

export default function IosBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in window.navigator && (window.navigator as any).standalone === true)

    // Controlla se è stato chiuso di recente (entro 7 giorni)
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    const recentlyDismissed = dismissedAt
      ? (Date.now() - parseInt(dismissedAt)) < DAYS_BEFORE_RESHOWING * 24 * 60 * 60 * 1000
      : false

    if (isIos && isSafari && !isStandalone && !recentlyDismissed) {
      setTimeout(() => setVisible(true), 2000)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-4"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div
        className="w-full max-w-sm mx-auto rounded-2xl p-4 flex items-start gap-3"
        style={{
          background: 'oklch(0.18 0 0)',
          border: '1px solid oklch(0.70 0.19 46 / 35%)',
          boxShadow: '0 8px 32px oklch(0 0 0 / 60%)',
        }}
      >
        {/* Logo */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
          style={{ background: 'oklch(0.70 0.19 46)', color: 'oklch(0.11 0 0)' }}
        >
          B
        </div>

        {/* Testo */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>
            Installa Bynari
          </p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'oklch(0.60 0 0)' }}>
            Tocca{' '}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded align-middle mx-0.5"
              style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.80 0 0)', fontSize: 11 }}>
              ⬆
            </span>
            {' '}poi <strong style={{ color: 'oklch(0.80 0 0)' }}>"Aggiungi a schermata Home"</strong> per usarla come un&apos;app
          </p>
        </div>

        {/* Chiudi */}
        <button
          onClick={dismiss}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm transition-opacity hover:opacity-70"
          style={{ background: 'oklch(0.25 0 0)', color: 'oklch(0.55 0 0)' }}
          aria-label="Chiudi"
        >
          ✕
        </button>
      </div>

      {/* Freccia verso il basso che punta alla toolbar Safari */}
      <div className="flex justify-center mt-2">
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid oklch(0.70 0.19 46 / 35%)',
          }}
        />
      </div>
    </div>
  )
}
