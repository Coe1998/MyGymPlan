'use client'
import React from 'react'
import type { ShareCardInputProps } from './EditorialCard'
import { getCardTheme } from '../theme'

export default function GlassCard({
  heroTitle, eyebrow, volumeNum, durata, serie, esercizi, highlights, coachName, tema,
}: ShareCardInputProps) {
  const accent = 'oklch(0.78 0.20 50)'
  const t = getCardTheme(tema)

  return (
    <div style={{
      width: 360, height: 640, position: 'relative',
      fontFamily: "'Inter',sans-serif", color: t.text,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 10,
      boxSizing: 'border-box', padding: '0 28px', overflow: 'hidden',
    }}>
      {/* Chip */}
      <div style={{ padding: '5px 12px', borderRadius: 100, background: t.bgChip, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${t.borderChip}`, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, color: t.text }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}`, flexShrink: 0 }} />
        {eyebrow}
      </div>

      {/* Hero number */}
      <div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 76, lineHeight: '0.88', letterSpacing: '-0.04em', textAlign: 'center', textShadow: tema === 'dark' ? '0 4px 30px rgba(0,0,0,0.5)' : '0 4px 30px rgba(0,0,0,0.15)', color: t.text }}>
          {volumeNum}<span style={{ fontSize: 22, opacity: 0.75, fontWeight: 700, marginLeft: 4 }}>kg</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', color: t.textSub, textTransform: 'uppercase', marginTop: -6, textAlign: 'center' }}>Volume Totale</div>
      </div>

      {/* Workout title */}
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: '-0.02em', textShadow: tema === 'dark' ? '0 2px 12px rgba(0,0,0,0.6)' : '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center', color: t.text }}>
        {heroTitle}
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ v: String(serie), l: 'serie' }, { v: durata, l: 'durata' }, { v: String(esercizi), l: 'esercizi' }].map(s => (
          <div key={s.l} style={{ padding: '7px 12px', borderRadius: 10, background: t.bgPill, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: `1px solid ${t.borderPill}`, display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em', color: t.text }}>{s.v}</span>
            <span style={{ fontSize: 9, color: t.textSub, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.l}</span>
          </div>
        ))}
      </div>

      {/* Highlights card */}
      {highlights.length > 0 && (
        <div style={{ width: '100%', background: t.bgGlass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${t.borderGlass}`, borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ fontSize: 8.5, letterSpacing: '0.25em', fontWeight: 700, color: accent, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            🏆 Top del giorno
          </div>
          {highlights.map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: i > 0 ? `1px solid ${t.hiRowBorder}` : 'none' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: t.text }}>{h.name}</span>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: accent }}>{h.valueStr}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: t.textSub }}>
        {coachName && <span>w/ {coachName}</span>}
        {coachName && <span style={{ opacity: 0.3 }}>·</span>}
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, letterSpacing: '-0.03em', fontSize: 12, color: t.text }}>
          B<span style={{ color: accent }}>Y</span>NARI
        </span>
      </div>
    </div>
  )
}
