'use client'

import { useRef, useState, useEffect } from 'react'

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
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const isDark = tema === 'dark'
  const textPrimary = isDark ? '#ffffff' : '#1a1a1a'
  const textSecondary = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'
  const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'
  const logoSub = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const accent = '#f97316'

  const drawCard = (canvas: HTMLCanvasElement) => {
    const scale = 3
    const W = 280
    const padH = 28
    const padV = 24

    const rows = [
      { label: 'Kg volume', value: volume.toLocaleString('it-IT') },
      { label: 'Serie', value: serie.toString() },
      { label: 'Durata', value: durata },
      ...(newPR ? [{ label: `🏆 NEW PR · ${newPR.nome}`, value: `${newPR.peso} kg`, isAccent: true }] : []),
    ]

    const titleH = 40       // nome giorno
    const rowH = 46         // altezza ogni riga stat
    const dividerH = 1      // divisore tra righe
    const logoH = 60        // area logo in fondo
    const totalH = padV + titleH + (rows.length * rowH) + ((rows.length - 1) * dividerH) + padV + logoH + padV

    canvas.width = W * scale
    canvas.height = totalH * scale
    canvas.style.width = W + 'px'
    canvas.style.height = totalH + 'px'

    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)

    // Sfondo TRASPARENTE — non disegnare nulla come background
    ctx.clearRect(0, 0, W, totalH)

    let y = padV

    // Nome giorno centrato
    ctx.font = '700 11px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = accent
    ctx.textAlign = 'center'
    ctx.fillText(giornoNome.toUpperCase(), W / 2, y + 14)
    y += titleH

    // Stats
    ctx.textAlign = 'left'
    rows.forEach((row, i) => {
      const isAccent = (row as any).isAccent
      const rowY = y + i * (rowH + dividerH)

      // Divisore sopra ogni riga (tranne la prima)
      if (i > 0) {
        ctx.fillStyle = dividerColor
        ctx.fillRect(padH, rowY - dividerH, W - padH * 2, dividerH)
      }

      // Label
      ctx.font = isAccent ? '700 11px -apple-system, system-ui, sans-serif' : '400 11px -apple-system, system-ui, sans-serif'
      ctx.fillStyle = isAccent ? accent : textSecondary
      ctx.textAlign = 'left'
      ctx.fillText(row.label, padH, rowY + 26)

      // Valore
      ctx.font = '800 21px -apple-system, system-ui, sans-serif'
      ctx.fillStyle = isAccent ? accent : textPrimary
      ctx.textAlign = 'right'
      ctx.fillText(row.value, W - padH, rowY + 28)
    })

    y += rows.length * (rowH + dividerH) + padV

    // Divisore logo
    ctx.fillStyle = dividerColor
    ctx.fillRect(padH, y, W - padH * 2, 1)
    y += 16

    // Logo MGP centrato
    ctx.textAlign = 'center'

    // "MG" in bianco/nero
    ctx.font = '800 24px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = textPrimary

    // Misura le due parti separatamente per centrare
    const mgWidth = ctx.measureText('MG').width
    const pWidth = ctx.measureText('P').width
    const totalWidth = mgWidth + pWidth
    const startX = (W - totalWidth) / 2

    ctx.textAlign = 'left'
    ctx.fillText('MG', startX, y + 24)

    // "P" in arancione
    ctx.fillStyle = accent
    ctx.fillText('P', startX + mgWidth, y + 24)

    // Sottotitolo
    ctx.font = '400 8px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = logoSub
    ctx.textAlign = 'center'
    ctx.fillText('MYGYMPLAN', W / 2, y + 40)
  }

  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current)
  }, [tema, giornoNome, volume, serie, durata, newPR])

  const handleDownload = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setDownloading(true)

    // Ridisegna prima del download
    drawCard(canvas)

    canvas.toBlob(async (blob) => {
      if (!blob) { setDownloading(false); return }

      const file = new File([blob], `mgp-${giornoNome.toLowerCase().replace(/\s/g, '-')}.png`, { type: 'image/png' })

      // Web Share API — apre il menu nativo su iOS e Android
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'MyGymPlan' })
        } catch {
          fallbackDownload(canvas)
        }
      } else {
        fallbackDownload(canvas)
      }
      setDownloading(false)
    }, 'image/png')
  }

  const fallbackDownload = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a')
    link.download = `mgp-${giornoNome.toLowerCase().replace(/\s/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="space-y-4">
      {/* Selettore tema */}
      <div className="flex gap-2 justify-center">
        {(['dark', 'light'] as const).map(t => (
          <button key={t} onClick={() => setTema(t)}
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

      {/* Preview — sfondo a scacchi per mostrare la trasparenza */}
      <div className="flex justify-center">
        <div style={{
          borderRadius: '16px',
          overflow: 'hidden',
          // Scacchiera per indicare trasparenza nella preview
          background: isDark
            ? 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 0 0 / 16px 16px'
            : 'repeating-conic-gradient(#e0dcd8 0% 25%, #f0ece6 0% 50%) 0 0 / 16px 16px',
        }}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: 'oklch(0.45 0 0)' }}>
        La scacchiera indica la trasparenza — il PNG finale non avrà sfondo
      </p>

      {/* Bottone */}
      <div className="flex justify-center">
        <button onClick={handleDownload} disabled={downloading}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: downloading ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)',
            color: 'oklch(0.13 0 0)',
            cursor: downloading ? 'not-allowed' : 'pointer',
          }}>
          {downloading ? 'Generando...' : '⬇️ Scarica / Condividi'}
        </button>
      </div>
    </div>
  )
}
