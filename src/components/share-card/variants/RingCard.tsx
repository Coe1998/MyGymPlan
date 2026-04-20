'use client'
import React, { useId } from 'react'
import type { ShareCardInputProps } from './EditorialCard'
import { getCardTheme } from '../theme'

export default function RingCard({
  heroTitle, eyebrow, volumeNum, durata, serie, esercizi, highlights, coachName, dateExtended, tema,
}: ShareCardInputProps) {
  const accent = 'oklch(0.78 0.20 50)'
  const t = getCardTheme(tema)
  const gradId = useId().replace(/:/g, '')
  const CIRCUMFERENCE = 534
  const dashOffset = CIRCUMFERENCE * (1 - 0.85)

  return (
    <div style={{
      width: 360, height: 640, position: 'relative',
      fontFamily: "'Inter',sans-serif", color: t.text,
      padding: '44px 28px', boxSizing: 'border-box', overflow: 'hidden',
    }}>
      {/* Head */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', fontWeight: 700, color: accent, textTransform: 'uppercase', marginBottom: 6 }}>
          {eyebrow}{coachName ? ` · con ${coachName}` : ''}
        </div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 44, letterSpacing: '-0.03em', lineHeight: '0.9', margin: 0, color: t.text }}>{heroTitle}</h1>
        <div style={{ fontSize: 10, color: t.textSub, fontWeight: 500, marginTop: 4, letterSpacing: '0.05em' }}>{dateExtended}</div>
      </div>

      {/* Ring */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 8px', position: 'relative' }}>
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="100" cy="100" r="85" fill="none" stroke={t.ringTrack} strokeWidth="14" />
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.82 0.17 85)" />
              <stop offset="100%" stopColor="rgba(235,140,60,1)" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="85" fill="none" stroke={`url(#${gradId})`} strokeWidth="14" strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset} filter="drop-shadow(0 0 12px rgba(235,140,60,0.5))" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 40, letterSpacing: '-0.03em', lineHeight: '0.9', color: t.text }}>
            {volumeNum}<span style={{ fontSize: 18, opacity: 0.75 }}>kg</span>
          </div>
          <div style={{ fontSize: 8.5, letterSpacing: '0.22em', fontWeight: 700, color: t.textSub, textTransform: 'uppercase', marginTop: 2 }}>Volume</div>
        </div>
      </div>

      {/* Side stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[{ l: 'Serie', v: String(serie) }, { l: 'Durata', v: durata }].map(s => (
          <div key={s.l} style={{ textAlign: 'center', padding: 8, border: `1px solid ${t.borderSideStat}`, borderRadius: 10 }}>
            <div style={{ fontSize: 8, letterSpacing: '0.2em', fontWeight: 700, color: t.textSub, textTransform: 'uppercase', marginBottom: 3 }}>{s.l}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em', color: t.text }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,rgba(235,140,60,0.12),rgba(235,140,60,0.02))', border: '1px solid rgba(235,140,60,0.3)', borderRadius: 12, padding: '10px 12px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 8.5, letterSpacing: '0.22em', fontWeight: 700, color: accent, textTransform: 'uppercase' }}>
            🏆 Highlights
          </div>
          {highlights.map((h, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '4px 0', fontSize: 11.5, alignItems: 'center' }}>
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: t.text }}>
                <span style={{ width: 4, height: 4, background: accent, borderRadius: '50%', flexShrink: 0 }} />
                {h.name}
              </span>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: accent }}>{h.valueStr}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: 40, left: 28, right: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${t.borderFooter}`, fontSize: 9.5, color: t.textSub }}>
        <span>
          <b style={{ color: accent }}>{esercizi}</b> esercizi · <b style={{ color: accent }}>{serie}</b> serie · <b style={{ color: accent }}>{durata}</b>
        </span>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, letterSpacing: '-0.03em', fontSize: 12, color: t.text }}>
          B<span style={{ color: accent }}>Y</span>NARI
        </span>
      </div>
    </div>
  )
}
