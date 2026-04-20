'use client'
import React from 'react'
import type { ShareCardInputProps } from './EditorialCard'

export default function BrutalistCard({
  heroTitle, eyebrow, volumeNum, durata, serie, esercizi, highlights, coachName, shortId, dateStr,
}: ShareCardInputProps) {
  const accent = 'oklch(0.78 0.20 50)'
  // dateStr "20 APR" → dotted "20.04.26"
  const now = new Date()
  const dotDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getFullYear()).slice(2)}`

  return (
    <div style={{
      width: 360, height: 640, position: 'relative',
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      color: 'white', padding: '44px 28px',
      boxSizing: 'border-box', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 10, borderBottom: '1.5px dashed rgba(255,255,255,0.35)', marginBottom: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.15em', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>
          <span style={{ color: accent, marginRight: 4 }}>●</span>Session Log · {heroTitle}
        </div>
        <div style={{ fontSize: 9, opacity: 0.55, textAlign: 'right' }}>
          #{shortId}<br />{dotDate}
        </div>
      </div>

      {/* Hero volume */}
      <div style={{ textAlign: 'center', margin: '6px 0 20px' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 46, letterSpacing: '-0.03em', lineHeight: '0.88', background: 'linear-gradient(180deg, #fff 0%, #fff 50%, rgba(255,255,255,0.75) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 6 }}>
          {volumeNum} kg
        </div>
        <div style={{ fontSize: 10, letterSpacing: '0.25em', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>Volume Totale</div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 16 }}>
        {[
          { v: String(serie), l: 'Serie' },
          { v: durata, l: 'Durata' },
          { v: String(esercizi), l: 'Esercizi' },
        ].map(k => (
          <div key={k.l} style={{ textAlign: 'center', padding: '10px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 26, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 4 }}>{k.v}</div>
            <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.18em', opacity: 0.6, textTransform: 'uppercase' }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Top Lifts */}
      {highlights.length > 0 && (
        <div style={{ border: `1.5px solid ${accent}`, borderRadius: 6, padding: '10px 12px', marginBottom: 16, background: 'rgba(235,140,60,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px dashed rgba(255,255,255,0.2)' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, color: accent, textTransform: 'uppercase' }}>Top Lifts</span>
            <span style={{ fontSize: 9, opacity: 0.5 }}>{highlights.length}/3</span>
          </div>
          {highlights.map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 10.5 }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ color: accent, fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
                {h.name}
              </span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em' }}>{h.valueStr}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: 40, left: 28, right: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1.5px dashed rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: '0.1em', opacity: 0.75 }}>
        <span>{coachName ? `w/ COACH ${coachName.toUpperCase()}` : 'BYNARI FITNESS'}</span>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, letterSpacing: '-0.03em', fontSize: 12 }}>
          B<span style={{ color: accent }}>Y</span>NARI
        </span>
      </div>
    </div>
  )
}
