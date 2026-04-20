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
    ctx.font = '900 10px "Big Shoulders Display", sans-serif'
    ctx.fillStyle = accent
    ctx.fillText('RIEPILOGO SETTIMANALE', W / 2, y + 12)
    y += 18

    ctx.font = '900 28px "Big Shoulders Display", sans-serif'
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
      ctx.font = '400 11px "Big Shoulders Display", sans-serif'
      ctx.fillStyle = textSecondary
      ctx.textAlign = 'left'
      ctx.fillText(row.label, padH, rowY + 26)
      ctx.font = '800 21px "Big Shoulders Display", sans-serif'
      ctx.fillStyle = textPrimary
      ctx.textAlign = 'right'
      ctx.fillText(row.value, W - padH, rowY + 28)
    })

    y += rows.length * rowH + padV

    // Divisore
    ctx.fillStyle = dividerColor
    ctx.fillRect(padH, y, W - padH * 2, 0.5)
    y += 16

    // Logo PNG reale
    const logoEl = document.getElementById('__bynari_logo__') as HTMLImageElement | null
    if (logoEl && logoEl.complete && logoEl.naturalWidth > 0) {
      const lH = isDark ? 38 : 62
      const lW = Math.round(logoEl.naturalWidth * lH / logoEl.naturalHeight)
      ctx.drawImage(logoEl, (W - lW) / 2, y + 4, lW, lH)
    }
  }


  // Carica Big Shoulders Display per il canvas
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&display=swap'
    if (!document.querySelector('link[href*="Big+Shoulders"]')) document.head.appendChild(link)
    document.fonts.ready.then(() => { if (canvasRef.current) drawCard(canvasRef.current) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tema])

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
      <img id="__bynari_logo__" src={isDark ? '/logo/Bynari_W1.png' : '/logo/Bynari_B1.png'}
        alt="" style={{ display: 'none' }}
        onLoad={() => { if (canvasRef.current) drawCard(canvasRef.current) }} />
      {/* Tema */}
      <div className="flex gap-2 justify-center">
        {(['dark', 'light'] as const).map(t => (
          <button key={t} onClick={() => setTema(t)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: tema === t ? 'oklch(0.70 0.19 46)' : 'var(--c-22)',
              color: tema === t ? 'var(--c-13)' : 'var(--c-55)',
              border: '1px solid var(--c-w8)',
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

      <p className="text-xs text-center" style={{ color: 'var(--c-40)' }}>
        La scacchiera indica la trasparenza del PNG finale
      </p>

      <div className="flex justify-center">
        <button onClick={handleDownload} disabled={downloading}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: downloading ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)',
            color: 'var(--c-13)',
          }}>
          {downloading ? 'Generando...' : <><FontAwesomeIcon icon={faDownload} /> Scarica / Condividi</>}
        </button>
      </div>

      {/* Tutorial */}
      <details className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)' }}>
        <summary className="px-4 py-3 text-xs font-semibold cursor-pointer flex items-center justify-between select-none"
          style={{ color: 'var(--c-60)' }}>
          <span>💡 Come condividerlo su Instagram</span>
          <span style={{ fontSize: 10 }}>▼</span>
        </summary>
        <div className="px-4 pb-4 space-y-2.5" style={{ borderTop: '1px solid var(--c-w6)' }}>
          <p className="text-xs pt-3" style={{ color: 'var(--c-50)' }}>Segui questi semplici passaggi:</p>
          {[
            { n: '1', text: 'Scarica il badge con il bottone qui sopra' },
            { n: '2', text: 'Vai nella galleria, tieni premuto sull\'immagine → Copia' },
            { n: '3', text: 'Apri Instagram e avvia una nuova Storia' },
            { n: '4', text: 'Scegli una tua foto come sfondo della storia' },
            { n: '5', text: 'Tocca lo schermo come se volessi scrivere del testo, poi premi Incolla' },
            { n: '6', text: 'Il badge apparirà sulla storia — ridimensionalo e posizionalo dove vuoi!' },
          ].map(step => (
            <div key={step.n} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                style={{ background: 'oklch(0.70 0.19 46 / 20%)', color: 'oklch(0.70 0.19 46)' }}>
                {step.n}
              </span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--c-65)' }}>{step.text}</p>
            </div>
          ))}
          <p className="text-xs pt-1" style={{ color: 'var(--c-40)' }}>
            Funziona allo stesso modo su TikTok, WhatsApp e tutti i social con le storie.
          </p>
        </div>
      </details>
    </div>
  )
}
