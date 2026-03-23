'use client'

import { useRef, useState } from 'react'

interface Props {
  giornoNome: string
  volume: number
  serie: number
  durata: string
  newPR: { nome: string; peso: number } | null
}

export default function ShareOverlay({ giornoNome, volume, serie, durata, newPR }: Props) {
  const [tema, setTema] = useState<'dark' | 'light'>('dark')
  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const isDark = tema === 'dark'

  const handleDownload = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `mgp-${giornoNome.toLowerCase().replace(/\s/g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error(err)
    }
    setDownloading(false)
  }

  return (
    <div className="space-y-4">
      {/* Selettore tema */}
      <div className="flex gap-2 justify-center">
        {(['dark', 'light'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTema(t)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: tema === t ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
              color: tema === t ? 'oklch(0.13 0 0)' : 'oklch(0.55 0 0)',
              border: '1px solid oklch(1 0 0 / 8%)',
            }}>
            {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        ))}
      </div>

      {/* Card preview */}
      <div className="flex justify-center">
        <div
          ref={cardRef}
          style={{
            width: '280px',
            borderRadius: '16px',
            padding: '24px 28px',
            textAlign: 'center',
            background: isDark ? '#1a1a1a' : '#f0ece6',
            fontFamily: 'system-ui, sans-serif',
          }}>
          {/* Nome giorno */}
          <div style={{
            fontSize: '12px', fontWeight: 700, color: '#f97316',
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '20px',
          }}>
            {giornoNome}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px', textAlign: 'left' }}>
            {[
              { label: 'Kg volume', value: volume.toLocaleString('it-IT') },
              { label: 'Serie', value: serie.toString() },
              { label: 'Durata', value: durata },
            ].map((stat, i, arr) => (
              <div key={stat.label}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                    {stat.label}
                  </span>
                  <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: isDark ? '#fff' : '#1a1a1a' }}>
                    {stat.value}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ height: '0.5px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)', marginTop: '10px' }} />
                )}
              </div>
            ))}

            {newPR && (
              <>
                <div style={{ height: '0.5px', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }} />
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>
                    🏆 NEW PR · {newPR.nome}
                  </span>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: '#f97316', letterSpacing: '-0.02em' }}>
                    {newPR.peso} kg
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Logo */}
          <div style={{
            paddingTop: '16px',
            borderTop: `0.5px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '0.08em', lineHeight: 1, color: isDark ? '#fff' : '#1a1a1a' }}>
              MG<span style={{ color: '#f97316' }}>P</span>
            </div>
            <div style={{ fontSize: '8px', fontWeight: 400, color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)', letterSpacing: '0.35em', textTransform: 'uppercase', marginTop: '3px' }}>
              MyGymPlan
            </div>
          </div>
        </div>
      </div>

      {/* Bottone download */}
      <div className="flex justify-center">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: downloading ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)',
            color: 'oklch(0.13 0 0)',
            cursor: downloading ? 'not-allowed' : 'pointer',
          }}>
          {downloading ? 'Generando...' : '⬇️ Scarica overlay'}
        </button>
      </div>
    </div>
  )
}
