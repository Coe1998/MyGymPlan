'use client'
import React from 'react'

export interface ShareCardInputProps {
  heroTitle: string
  eyebrow: string
  dateStr: string
  dateExtended: string
  volumeNum: string
  durata: string
  serie: number
  esercizi: number
  highlights: Array<{ name: string; valueStr: string }>
  coachName?: string
  shortId: string
}

export default function EditorialCard({
  heroTitle, eyebrow, volumeNum, durata, serie, highlights, coachName,
}: ShareCardInputProps) {
  const accent = 'oklch(0.78 0.20 50)'
  return (
    <div style={{
      width: 360, height: 640, position: 'relative',
      fontFamily: "'Syne', sans-serif",
      color: 'white', padding: '44px 28px 0',
      boxSizing: 'border-box', overflow: 'hidden',
    }}>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Volume', num: volumeNum, unit: 'kg' },
          { label: 'Serie', num: String(serie), unit: '' },
          { label: 'Durata', num: durata, unit: '' },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>{s.label}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, lineHeight: '0.95', letterSpacing: '-0.02em' }}>
              {s.num}{s.unit && <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginLeft: 2 }}>{s.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Title block */}
      <div style={{ borderTop: '2px solid white', paddingTop: 14, marginBottom: 18 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', fontWeight: 700, opacity: 0.75, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', marginBottom: 4 }}>{eyebrow}</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 46, fontWeight: 900, lineHeight: '0.9', letterSpacing: '-0.03em', margin: 0 }}>{heroTitle}</h1>
        {coachName && (
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.82, marginTop: 6, letterSpacing: '0.02em', fontFamily: "'Inter', sans-serif" }}>
            con {coachName}
          </div>
        )}
      </div>

      {/* Highlights */}
      {highlights.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 8.5, letterSpacing: '0.25em', fontWeight: 700, opacity: 0.55, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            Highlights
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)' }} />
          </div>
          {highlights.map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: i < highlights.length - 1 ? '1px dashed rgba(255,255,255,0.18)' : 'none', fontFamily: "'Inter', sans-serif" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{h.name}</span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em' }}>{h.valueStr}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer — absolute */}
      <div style={{ position: 'absolute', bottom: 45, left: 28, right: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '2px solid white', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, letterSpacing: '0.02em' }}>
          <b style={{ color: accent, fontWeight: 700 }}>{highlights.length}</b> esercizi in evidenza
        </div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, letterSpacing: '-0.03em', fontSize: 14 }}>
          B<span style={{ color: accent }}>Y</span>NARI
        </div>
      </div>
    </div>
  )
}
