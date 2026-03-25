'use client'

import { useRef, useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon, faSun, faDownload } from '@fortawesome/free-solid-svg-icons'

interface Props {
  weekLabel: string        // es. "WEEK 13" o "24–30 MAR"
  volume: number           // kg totali
  reps: number             // reps totali
  sessioni: number         // allenamenti completati
  durata: string           // es. "02:34:00" totale settimana
}

export default function ShareOverlayWeek({ weekLabel, volume, reps, sessioni, durata }: Props) {
  const [tema, setTema] = useState<'dark' | 'light'>('dark')
  const [downloading, setDownloading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const isDark = tema === 'dark'
  const textPrimary = isDark ? '#ffffff' : '#1a1a1a'
  const textSecondary = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const logoSub = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const accent = '#f97316'

  const drawCard = (canvas: HTMLCanvasElement) => {
    const scale = 3
    const W = 280
    const padH = 28
    const padV = 24
    const rowH = 46
    const logoH = 62

    const rows = [
      { label: 'Kg volume totale', value: volume.toLocaleString('it-IT') },
      { label: 'Reps totali', value: reps.toLocaleString('it-IT') },
      { label: 'Allenamenti', value: sessioni.toString() },
      { label: 'Tempo totale', value: durata },
    ]

    const totalH = padV + 72 + rows.length * rowH + padV + logoH + padV

    canvas.width = W * scale
    canvas.height = totalH * scale
    canvas.style.width = W + 'px'
    canvas.style.height = totalH + 'px'

    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    ctx.clearRect(0, 0, W, totalH)

    let y = padV

    // Header — "RIEPILOGO" piccolo + weekLabel grande
    ctx.textAlign = 'center'
    ctx.font = '900 10px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = accent
    ctx.fillText('RIEPILOGO SETTIMANALE', W / 2, y + 12)
    y += 18

    ctx.font = '900 28px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = textPrimary
    ctx.fillText(weekLabel.toUpperCase(), W / 2, y + 30)
    y += 54

    // Rows
    ctx.textAlign = 'left'
    rows.forEach((row, i) => {
      const rowY = y + i * rowH
      if (i > 0) {
        ctx.fillStyle = dividerColor
        ctx.fillRect(padH, rowY - 1, W - padH * 2, 0.5)
      }
      ctx.font = '400 11px -apple-system, system-ui, sans-serif'
      ctx.fillStyle = textSecondary
      ctx.textAlign = 'left'
      ctx.fillText(row.label, padH, rowY + 26)
      ctx.font = '800 21px -apple-system, system-ui, sans-serif'
      ctx.fillStyle = textPrimary
      ctx.textAlign = 'right'
      ctx.fillText(row.value, W - padH, rowY + 28)
    })

    y += rows.length * rowH + padV

    // Divisore
    ctx.fillStyle = dividerColor
    ctx.fillRect(padH, y, W - padH * 2, 0.5)
    y += 16

    // Logo PNG — Bynari_W1 su dark, Bynari_B1 su light
    const logoEl = document.getElementById('__bynari_logo__') as HTMLImageElement | null
    if (logoEl && logoEl.complete && logoEl.naturalWidth > 0) {
      const lH = 38
      const lW = Math.round(logoEl.naturalWidth * lH / logoEl.naturalHeight)
      ctx.drawImage(logoEl, (W - lW) / 2, y + 4, lW, lH)
    }
  }

  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current)
  }, [tema, weekLabel, volume, reps, sessioni, durata])

  const handleDownload = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setDownloading(true)
    drawCard(canvas)
    canvas.toBlob(async (blob) => {
      if (!blob) { setDownloading(false); return }
      const file = new File([blob], `bynari-week-${weekLabel}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Bynari Weekly' }) }
        catch { fallback(canvas) }
      } else { fallback(canvas) }
      setDownloading(false)
    }, 'image/png')
  }

  const fallback = (canvas: HTMLCanvasElement) => {
    const a = document.createElement('a')
    a.download = `bynari-week-${weekLabel}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  return (
    <div className="space-y-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        id="__bynari_logo__"
        src={isDark ? '/logo/Bynari_W1.png' : '/logo/Bynari_B1.png'}
        alt=""
        style={{ display: 'none' }}
        onLoad={() => { if (canvasRef.current) drawCard(canvasRef.current) }}
      />
      {/* Tema */}
      <div className="flex gap-2 justify-center">
        {(['dark', 'light'] as const).map(t => (
          <button key={t} onClick={() => setTema(t)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: tema === t ? 'oklch(0.70 0.19 46)' : 'oklch(0.22 0 0)',
              color: tema === t ? 'oklch(0.13 0 0)' : 'oklch(0.55 0 0)',
              border: '1px solid oklch(1 0 0 / 8%)',
            }}>
            {t === 'dark' ? <><FontAwesomeIcon icon={faMoon} /> Dark</> : <><FontAwesomeIcon icon={faSun} /> Light</>}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="flex justify-center">
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          background: isDark
            ? 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 0 0 / 16px 16px'
            : 'repeating-conic-gradient(#e0dcd8 0% 25%, #f0ece6 0% 50%) 0 0 / 16px 16px',
        }}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: 'oklch(0.40 0 0)' }}>
        La scacchiera indica la trasparenza del PNG finale
      </p>

      <div className="flex justify-center">
        <button onClick={handleDownload} disabled={downloading}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: downloading ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)',
            color: 'oklch(0.13 0 0)',
          }}>
          {downloading ? 'Generando...' : <><FontAwesomeIcon icon={faDownload} /> Scarica / Condividi</>}
        </button>
      </div>
    </div>
  )
}
