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
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const isDark = tema === 'dark'

  // Colori in base al tema
  const bg = isDark ? '#1a1a1a' : '#f0ece6'
  const textPrimary = isDark ? '#ffffff' : '#1a1a1a'
  const textSecondary = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const logoSub = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const accent = '#f97316'

  const drawCard = (canvas: HTMLCanvasElement) => {
    const scale = 3
    const W = 280
    const rows = [
      { label: 'Kg volume', value: volume.toLocaleString('it-IT') },
      { label: 'Serie', value: serie.toString() },
      { label: 'Durata', value: durata },
      ...(newPR ? [{ label: `🏆 NEW PR · ${newPR.nome}`, value: `${newPR.peso} kg`, isAccent: true }] : []),
    ]
    const rowH = 44
    const padV = 24
    const padH = 28
    const titleH = 36
    const logoH = 52
    const totalH = padV + titleH + rows.length * rowH + (rows.length - 1) * 2 + padV + logoH

    canvas.width = W * scale
    canvas.height = totalH * scale
    canvas.style.width = W + 'px'
    canvas.style.height = totalH + 'px'

    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)

    // Sfondo
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(0, 0, W, totalH, 16)
    ctx.fill()

    let y = padV

    // Nome giorno centrato
    ctx.fillStyle = accent
    ctx.font = '700 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.letterSpacing = '2px'
    ctx.fillText(giornoNome.toUpperCase(), W / 2, y + 14)
    y += titleH

    // Stats
    ctx.textAlign = 'left'
    ctx.letterSpacing = '0px'

    rows.forEach((row, i) => {
      const isAccent = (row as any).isAccent
      const rowY = y + i * (rowH + 2)

      // Divider sopra
      if (i > 0) {
        ctx.fillStyle = dividerColor
        ctx.fillRect(padH, rowY - 1, W - padH * 2, 0.5)
      }

      // Label
      ctx.font = isAccent ? '700 11px system-ui, sans-serif' : '400 11px system-ui, sans-serif'
      ctx.fillStyle = isAccent ? accent : textSecondary
      ctx.fillText(row.label, padH, rowY + 22)

      // Valore
      ctx.font = '800 20px system-ui, sans-serif'
      ctx.fillStyle = isAccent ? accent : textPrimary
      ctx.textAlign = 'right'
      ctx.fillText(row.value, W - padH, rowY + 24)
      ctx.textAlign = 'left'
    })

    y += rows.length * (rowH + 2) + padV

    // Divider logo
    ctx.fillStyle = dividerColor
    ctx.fillRect(padH, y, W - padH * 2, 0.5)
    y += 16

    // Logo centrato
    ctx.textAlign = 'center'
    ctx.font = '800 24px system-ui, sans-serif'
    ctx.fillStyle = textPrimary
    ctx.fillText('MG', W / 2 - 12, y + 22)
    ctx.fillStyle = accent
    ctx.fillText('P', W / 2 + 18, y + 22)

    // Sottotitolo logo
    ctx.font = '400 8px system-ui, sans-serif'
    ctx.fillStyle = logoSub
    ctx.letterSpacing = '3px'
    ctx.fillText('MYGYMPLAN', W / 2, y + 38)
    ctx.letterSpacing = '0px'
  }

  const handleDownload = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setDownloading(true)

    try {
      drawCard(canvas)

      // Su mobile usiamo toBlob + share API se disponibile
      canvas.toBlob(async (blob) => {
        if (!blob) { setDownloading(false); return }

        // Prova Web Share API (funziona su iOS Safari e Android Chrome)
        if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'mgp.png', { type: 'image/png' })] })) {
          try {
            await navigator.share({
              files: [new File([blob], `mgp-${giornoNome.toLowerCase().replace(/\s/g, '-')}.png`, { type: 'image/png' })],
              title: 'MyGymPlan',
            })
          } catch (e) {
            // Se l'utente annulla la condivisione, fallback al download
            fallbackDownload(canvas)
          }
        } else {
          fallbackDownload(canvas)
        }
        setDownloading(false)
      }, 'image/png')
    } catch (err) {
      console.error(err)
      setDownloading(false)
    }
  }

  const fallbackDownload = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a')
    link.download = `mgp-${giornoNome.toLowerCase().replace(/\s/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Ridisegna preview quando cambia il tema
  const handleTemaChange = (t: 'dark' | 'light') => {
    setTema(t)
    setTimeout(() => {
      if (canvasRef.current) drawCard(canvasRef.current)
    }, 50)
  }

  // Disegna al mount
  const initCanvas = (el: HTMLCanvasElement | null) => {
    (canvasRef as any).current = el
    if (el) setTimeout(() => drawCard(el), 100)
  }

  return (
    <div className="space-y-4">
      {/* Selettore tema */}
      <div className="flex gap-2 justify-center">
        {(['dark', 'light'] as const).map(t => (
          <button key={t} onClick={() => handleTemaChange(t)}
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

      {/* Preview canvas */}
      <div className="flex justify-center">
        <canvas ref={initCanvas} style={{ borderRadius: '16px' }} />
      </div>

      {/* Bottone download/share */}
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
