'use client'

import { useRef, useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon, faSun, faDownload } from '@fortawesome/free-solid-svg-icons'

interface EsercizioHighlight {
  nome: string
  pesoMax: number
  tipoInput?: string
  durataMax?: number
}

interface Props {
  giornoNome: string
  volume: number
  serie: number
  durata: string
  esercizi: EsercizioHighlight[] // tutti gli esercizi della sessione
  coachNome?: string | null
}

export default function ShareOverlay({ giornoNome, volume, serie, durata, esercizi, coachNome }: Props) {
  const [tema, setTema] = useState<'dark' | 'light'>('dark')
  const [downloading, setDownloading] = useState(false)
  const [selezionati, setSelezionati] = useState<EsercizioHighlight[]>([])
  const [showCoach, setShowCoach] = useState(false)
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
    const hasHighlights = selezionati.length > 0
    const totalRows = stats.length
      + (hasHighlights ? 1 : 0)  // riga HIGHLIGHTS
      + selezionati.length
      + (showCoach && coachNome ? 1 : 0)  // riga coach
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
      ctx.font = '900 11px "Big Shoulders Display", sans-serif'
      ctx.fillStyle = accent
      ctx.fillText(prefisso.toUpperCase(), W / 2, y + 13)
      y += 20
    }
    ctx.font = '900 30px "Big Shoulders Display", sans-serif'
    ctx.fillStyle = textPrimary
    ctx.fillText(parola.toUpperCase(), W / 2, y + 30)
    y += prefisso ? 48 : 52

    // Stats
    ctx.textAlign = 'left'
    const allRows = [
      ...stats.map(s => ({ label: s.label, value: s.value, isAccent: false, isHeader: false })),
      ...(hasHighlights ? [{ label: 'HIGHLIGHTS', value: '', isAccent: false, isHeader: true }] : []),
      ...selezionati.map(s => ({
        label: `\u25cf ${s.nome}`,
        value: s.tipoInput === 'timer' ? `${s.durataMax ?? 0}s` : `${s.pesoMax} kg`,
        isAccent: true,
        isHeader: false,
      })),
      ...(showCoach && coachNome ? [{ label: 'Coach', value: coachNome, isAccent: false, isHeader: false }] : []),
    ]

    allRows.forEach((row, i) => {
      const rowY = y + i * (rowH + 1)

      // Divisore
      if (i > 0) {
        ctx.fillStyle = dividerColor
        ctx.fillRect(padH, rowY - 1, W - padH * 2, 0.5)
      }

      // Header "HIGHLIGHTS"
      if ((row as any).isHeader) {
        ctx.font = '900 9px "Big Shoulders Display", sans-serif'
        ctx.fillStyle = accent
        ctx.textAlign = 'left'
        ctx.fillText('— ' + row.label + ' —', padH, rowY + 28)
        return
      }

      // Label
      ctx.font = row.isAccent
        ? '700 11px "Big Shoulders Display", sans-serif'
        : '400 11px "Big Shoulders Display", sans-serif'
      ctx.fillStyle = row.isAccent ? accent : textSecondary
      ctx.textAlign = 'left'
      ctx.fillText(row.label, padH, rowY + (row.isAccent ? 22 : 26))

      // Valore
      ctx.font = row.isAccent
        ? '800 16px "Big Shoulders Display", sans-serif'
        : '800 21px "Big Shoulders Display", sans-serif'
      ctx.fillStyle = row.isAccent ? accent : textPrimary
      ctx.textAlign = 'right'
      if (row.value) ctx.fillText(row.value, W - padH, rowY + (row.isAccent ? 24 : 28))
    })

    y += allRows.length * (rowH + 1) + padV

    // Divisore logo
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
  }, [tema, selezionati, giornoNome, volume, serie, durata])

  const handleDownload = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setDownloading(true)
    drawCard(canvas)

    canvas.toBlob(async (blob) => {
      if (!blob) { setDownloading(false); return }
      const file = new File([blob], `bynari-${giornoNome.toLowerCase().replace(/\s/g, '-')}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Bynari' })
        } catch { fallbackDownload(canvas) }
      } else {
        fallbackDownload(canvas)
      }
      setDownloading(false)
    }, 'image/png')
  }

  const fallbackDownload = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a')
    link.download = `bynari-${giornoNome.toLowerCase().replace(/\s/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="space-y-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img id="__bynari_logo__" src={isDark ? '/logo/Bynari_W1.png' : '/logo/Bynari_B1.png'}
        alt="" style={{ display: 'none' }}
        onLoad={() => { if (canvasRef.current) drawCard(canvasRef.current) }} />
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
            {t === 'dark' ? <><FontAwesomeIcon icon={faMoon} /> Dark</> : <><FontAwesomeIcon icon={faSun} /> Light</>}
          </button>
        ))}
      </div>

      {/* Flag nome coach */}
      {coachNome && (
        <div className="flex items-center justify-center">
          <button onClick={() => setShowCoach(p => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: showCoach ? 'oklch(0.60 0.15 200 / 20%)' : 'oklch(0.22 0 0)',
              color: showCoach ? 'oklch(0.60 0.15 200)' : 'oklch(0.50 0 0)',
              border: `1px solid ${showCoach ? 'oklch(0.60 0.15 200 / 40%)' : 'oklch(1 0 0 / 8%)'}`,
            }}>
            <span style={{ fontSize: 10 }}>{showCoach ? '✓' : '○'}</span>
            Mostra coach: {coachNome}
          </button>
        </div>
      )}

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
                    {ese.tipoInput === 'timer' ? `${ese.durataMax ?? 0}s` : `${ese.pesoMax} kg`}
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
          {downloading ? 'Generando...' : <><FontAwesomeIcon icon={faDownload} /> Scarica / Condividi</>}
        </button>
      </div>

      {/* Tutorial */}
      <details className="rounded-2xl overflow-hidden" style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
        <summary className="px-4 py-3 text-xs font-semibold cursor-pointer flex items-center justify-between select-none"
          style={{ color: 'oklch(0.60 0 0)' }}>
          <span>💡 Come condividerlo su Instagram</span>
          <span style={{ fontSize: 10 }}>▼</span>
        </summary>
        <div className="px-4 pb-4 space-y-2.5" style={{ borderTop: '1px solid oklch(1 0 0 / 6%)' }}>
          <p className="text-xs pt-3" style={{ color: 'oklch(0.50 0 0)' }}>Segui questi semplici passaggi:</p>
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
              <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.65 0 0)' }}>{step.text}</p>
            </div>
          ))}
          <p className="text-xs pt-1" style={{ color: 'oklch(0.40 0 0)' }}>
            Funziona allo stesso modo su TikTok, WhatsApp e tutti i social con le storie.
          </p>
        </div>
      </details>
    </div>
  )
}
