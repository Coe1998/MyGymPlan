'use client'

import { useRef, useState, useEffect } from 'react'

interface EsercizioHighlight {
  nome: string
  pesoMax: number
}

interface Props {
  giornoNome: string
  volume: number
  serie: number
  durata: string
  esercizi: EsercizioHighlight[] // tutti gli esercizi della sessione
}

export default function ShareOverlay({ giornoNome, volume, serie, durata, esercizi }: Props) {
  const [tema, setTema] = useState<'dark' | 'light'>('dark')
  const [downloading, setDownloading] = useState(false)
  const [selezionati, setSelezionati] = useState<EsercizioHighlight[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const isDark = tema === 'dark'
  const textPrimary = isDark ? '#ffffff' : '#1a1a1a'
  const textSecondary = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const logoSub = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'
  const accent = '#f97316'

  // Divide il nome del giorno in prefisso e parola principale
  // Es: "GIORNO A - PUSH" → prefisso "GIORNO A" + parola "PUSH"
  const parseNomeGiorno = (nome: string) => {
    const parts = nome.split(/[-–—]/).map(p => p.trim())
    if (parts.length >= 2) {
      return { prefisso: parts.slice(0, -1).join(' - '), parola: parts[parts.length - 1] }
    }
    return { prefisso: '', parola: nome }
  }

  const { prefisso, parola } = parseNomeGiorno(giornoNome)

  const toggleEsercizio = (ese: EsercizioHighlight) => {
    const isSelected = selezionati.some(s => s.nome === ese.nome)
    if (isSelected) {
      setSelezionati(prev => prev.filter(s => s.nome !== ese.nome))
    } else {
      if (selezionati.length >= 3) return // max 3
      setSelezionati(prev => [...prev, ese])
    }
  }

  const drawCard = (canvas: HTMLCanvasElement) => {
    const scale = 3
    const W = 280
    const padH = 28
    const padV = 24

    const stats = [
      { label: 'Kg volume', value: volume.toLocaleString('it-IT') },
      { label: 'Serie', value: serie.toString() },
      { label: 'Durata', value: durata },
    ]

    const titleH = prefisso ? 68 : 52  // spazio per nome giorno
    const rowH = 46
    const highlightRowH = 38
    const logoH = 62
    const totalRows = stats.length + selezionati.length
    const totalH = padV + titleH + (totalRows * rowH) + ((totalRows - 1) * 1) + padV + logoH + padV

    canvas.width = W * scale
    canvas.height = totalH * scale
    canvas.style.width = W + 'px'
    canvas.style.height = totalH + 'px'

    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    ctx.clearRect(0, 0, W, totalH)

    let y = padV

    // Nome giorno — prefisso piccolo sopra, parola grande sotto
    ctx.textAlign = 'center'
    if (prefisso) {
      ctx.font = '900 11px -apple-system, system-ui, sans-serif'
      ctx.fillStyle = accent
      ctx.fillText(prefisso.toUpperCase(), W / 2, y + 13)
      y += 20
    }
    ctx.font = '900 30px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = textPrimary
    ctx.fillText(parola.toUpperCase(), W / 2, y + 30)
    y += prefisso ? 48 : 52

    // Stats
    ctx.textAlign = 'left'
    const allRows = [
      ...stats.map(s => ({ label: s.label, value: s.value, isAccent: false })),
      ...selezionati.map(s => ({ label: `\u25cf ${s.nome}`, value: `${s.pesoMax} kg`, isAccent: true })),
    ]

    allRows.forEach((row, i) => {
      const rowY = y + i * (rowH + 1)

      // Divisore
      if (i > 0) {
        ctx.fillStyle = dividerColor
        ctx.fillRect(padH, rowY - 1, W - padH * 2, 0.5)
      }

      // Label
      ctx.font = row.isAccent
        ? '700 11px -apple-system, system-ui, sans-serif'
        : '400 11px -apple-system, system-ui, sans-serif'
      ctx.fillStyle = row.isAccent ? accent : textSecondary
      ctx.textAlign = 'left'
      ctx.fillText(row.label, padH, rowY + (row.isAccent ? 22 : 26))

      // Valore
      ctx.font = row.isAccent
        ? '800 16px -apple-system, system-ui, sans-serif'
        : '800 21px -apple-system, system-ui, sans-serif'
      ctx.fillStyle = row.isAccent ? accent : textPrimary
      ctx.textAlign = 'right'
      ctx.fillText(row.value, W - padH, rowY + (row.isAccent ? 24 : 28))
    })

    y += allRows.length * (rowH + 1) + padV

    // Divisore logo
    ctx.fillStyle = dividerColor
    ctx.fillRect(padH, y, W - padH * 2, 0.5)
    y += 16

    // Logo MGP
    ctx.textAlign = 'left'
    ctx.font = '800 24px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = textPrimary
    const mgW = ctx.measureText('MG').width
    const pW = ctx.measureText('P').width
    const startX = (W - mgW - pW) / 2
    ctx.fillText('MG', startX, y + 24)
    ctx.fillStyle = accent
    ctx.fillText('P', startX + mgW, y + 24)

    ctx.font = '400 8px -apple-system, system-ui, sans-serif'
    ctx.fillStyle = logoSub
    ctx.textAlign = 'center'
    ctx.fillText('MYGYMPLAN', W / 2, y + 40)
  }

  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current)
  }, [tema, selezionati, giornoNome, volume, serie, durata])

  const handleDownload = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setDownloading(true)
    drawCard(canvas)

    canvas.toBlob(async (blob) => {
      if (!blob) { setDownloading(false); return }
      const file = new File([blob], `mgp-${giornoNome.toLowerCase().replace(/\s/g, '-')}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'MyGymPlan' })
        } catch { fallbackDownload(canvas) }
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
    <div className="space-y-5">
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

      {/* Selezione esercizi highlight */}
      {esercizi.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
            <p className="text-xs font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>
              Scegli fino a 3 highlights
            </p>
            <span className="text-xs px-2 py-1 rounded-full"
              style={{
                background: selezionati.length === 3 ? 'oklch(0.70 0.19 46 / 20%)' : 'oklch(0.30 0 0)',
                color: selezionati.length === 3 ? 'oklch(0.70 0.19 46)' : 'oklch(0.50 0 0)',
              }}>
              {selezionati.length}/3
            </span>
          </div>
          <div>
            {esercizi.map((ese, i) => {
              const isSelected = selezionati.some(s => s.nome === ese.nome)
              const isDisabled = !isSelected && selezionati.length >= 3
              return (
                <button
                  key={ese.nome}
                  onClick={() => !isDisabled && toggleEsercizio(ese)}
                  className="w-full flex items-center justify-between px-4 py-3 transition-all text-left"
                  style={{
                    borderBottom: i < esercizi.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none',
                    background: isSelected ? 'oklch(0.70 0.19 46 / 10%)' : 'transparent',
                    opacity: isDisabled ? 0.35 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: isSelected ? 'oklch(0.70 0.19 46)' : 'oklch(0.30 0 0)',
                        border: isSelected ? 'none' : '1px solid oklch(1 0 0 / 15%)',
                      }}>
                      {isSelected && (
                        <span style={{ color: 'oklch(0.13 0 0)', fontSize: '11px', fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                    <span className="text-sm font-medium" style={{ color: isSelected ? 'oklch(0.97 0 0)' : 'oklch(0.70 0 0)' }}>
                      {ese.nome}
                    </span>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0"
                    style={{ color: isSelected ? 'oklch(0.70 0.19 46)' : 'oklch(0.50 0 0)' }}>
                    {ese.pesoMax} kg
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Preview canvas */}
      <div className="flex justify-center">
        <div style={{
          borderRadius: '16px',
          overflow: 'hidden',
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

      {/* Download */}
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
