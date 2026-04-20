'use client'
import React from 'react'
import type { ShareCardInputProps } from './EditorialCard'

export default function GlassCard({
  heroTitle, eyebrow, volumeNum, durata, serie, esercizi, highlights, coachName,
}: ShareCardInputProps) {
  const accent = 'oklch(0.78 0.20 50)'
  return (
    <div style={{
      width: 360, height: 640, position: 'relative',
      fontFamily: "'Inter', sans-serif", color: 'white',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 10,
      boxSizing: 'border-box', padding: '0 28px', overflow: 'hidden',
    }}>
      {/* Chip */}
      <div style={{ padding: '5px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}`, flexShrink: 0 }} />
        {eyebrow}
      </div>

      {/* Hero number */}
      <div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 76, lineHeight: '0.88', letterSpacing: '-0.04em', textAlign: 'center', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
          {volumeNum}<span style={{ fontSize: 22, opacity: 0.75, fontWeight: 700, marginLeft: 4 }}>kg</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', opacity: 0.8, textTransform: 'uppercase', marginTop: -6, textAlign: 'center' }}>Volume Totale</div>
      </div>

      {/* Workout title */}
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.6)', textAlign: 'center' }}>
        {heroTitle}
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { v: String(serie), l: 'serie' },
          { v: durata, l: 'durata' },
          { v: String(esercizi), l: 'esercizi' },
        ].map(s => (
          <div key={s.l} style={{ padding: '7px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>{s.v}</span>
            <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.l}</span>
          </div>
        ))}
      </div>

      {/* Highlights card */}
      {highlights.length > 0 && (
        <div style={{ width: '100%', background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 8.5, letterSpacing: '0.25em', fontWeight: 700, color: accent, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            🏆 Top del giorno
          </div>
          {highlights.map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600 }}>{h.name}</span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, color: accent }}>{h.valueStr}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, opacity: 0.75 }}>
        {coachName && <span>w/ {coachName}</span>}
        {coachName && <span style={{ opacity: 0.3 }}>·</span>}
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, letterSpacing: '-0.03em', fontSize: 12 }}>
          B<span style={{ color: accent }}>Y</span>NARI
        </span>
      </div>
    </div>
  )
}
