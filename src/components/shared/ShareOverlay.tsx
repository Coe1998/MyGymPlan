'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon, faSun, faDownload } from '@fortawesome/free-solid-svg-icons'
import html2canvas from 'html2canvas'
import { fmtVolumeNum, fmtDate, fmtDateExtended } from '@/lib/format/workout'
import EditorialCard from '@/components/share-card/variants/EditorialCard'
import BrutalistCard from '@/components/share-card/variants/BrutalistCard'
import GlassCard from '@/components/share-card/variants/GlassCard'
import RingCard from '@/components/share-card/variants/RingCard'

type ShareVariant = 'editorial' | 'brutalist' | 'glass' | 'ring'

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
  esercizi: EsercizioHighlight[]
  coachNome?: string | null
}

const VARIANTS: { id: ShareVariant; label: string; emoji: string; desc: string }[] = [
  { id: 'editorial', label: 'Editorial', emoji: '📰', desc: 'Magazine poster' },
  { id: 'brutalist', label: 'Brutalist', emoji: '⬛', desc: 'Data ticket' },
  { id: 'glass',     label: 'Glass',     emoji: '◎', desc: 'Floating blur' },
  { id: 'ring',      label: 'Ring',      emoji: '⚬', desc: 'Activity ring' },
]

function parseGiornoNome(nome: string) {
  const parts = nome.split(/[-–—]/).map(p => p.trim())
  const heroTitle = (parts.length >= 2 ? parts[parts.length - 1] : nome).toUpperCase()
  const base = heroTitle.charAt(0) + heroTitle.slice(1).toLowerCase()
  const dateStr = fmtDate(new Date())
  return {
    heroTitle,
    eyebrow: `${base} · ${dateStr}`,
    dateStr,
    dateExtended: fmtDateExtended(new Date()),
  }
}

function makeShortId() {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
}

export default function ShareOverlay({ giornoNome, volume, serie, durata, esercizi, coachNome }: Props) {
  const [tema, setTema] = useState<'dark' | 'light'>('dark')
  const [variante, setVariante] = useState<ShareVariant>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('bynari_share_variant') as ShareVariant) ?? 'glass'
    }
    return 'glass'
  })
  const [downloading, setDownloading] = useState(false)
  const [selezionati, setSelezionati] = useState<EsercizioHighlight[]>([])
  const [showCoach, setShowCoach] = useState(!!coachNome)
  const [coachInput, setCoachInput] = useState(coachNome ?? '')
  const [shortId] = useState(makeShortId)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem('bynari_share_variant', variante)
  }, [variante])

  // Load JetBrains Mono for brutalist variant
  useEffect(() => {
    const href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap'
    if (!document.querySelector(`link[href*="JetBrains"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'; link.href = href
      document.head.appendChild(link)
    }
  }, [])

  const toggleEsercizio = useCallback((ese: EsercizioHighlight) => {
    setSelezionati(prev => {
      const isSelected = prev.some(s => s.nome === ese.nome)
      if (isSelected) return prev.filter(s => s.nome !== ese.nome)
      if (prev.length >= 3) return prev
      return [...prev, ese]
    })
  }, [])

  const { heroTitle, eyebrow, dateStr, dateExtended } = parseGiornoNome(giornoNome)
  const coachNameFinal = showCoach && coachInput.trim() ? coachInput.trim() : undefined

  const highlights = selezionati.map(s => ({
    name: s.nome,
    valueStr: s.tipoInput === 'timer' ? `${s.durataMax ?? 0}s` : `${s.pesoMax} kg`,
  }))

  const cardProps = {
    heroTitle,
    eyebrow,
    dateStr,
    dateExtended,
    volumeNum: fmtVolumeNum(volume),
    durata,
    serie,
    esercizi: esercizi.length,
    highlights,
    coachName: coachNameFinal,
    shortId,
  }

  const SelectedCard = variante === 'editorial' ? EditorialCard
    : variante === 'brutalist' ? BrutalistCard
    : variante === 'glass' ? GlassCard
    : RingCard

  const handleDownload = async () => {
    const el = exportRef.current
    if (!el) return
    setDownloading(true)
    try {
      await document.fonts.ready
      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        width: 360,
        height: 640,
      })
      canvas.toBlob(async (blob) => {
        if (!blob) { setDownloading(false); return }
        const file = new File([blob], `bynari-${heroTitle.toLowerCase()}.png`, { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Bynari Workout' }) }
          catch { fallbackDownload(canvas) }
        } else {
          fallbackDownload(canvas)
        }
        setDownloading(false)
      }, 'image/png')
    } catch (e) {
      console.error('Export failed', e)
      setDownloading(false)
    }
  }

  const fallbackDownload = (canvas: HTMLCanvasElement) => {
    const a = document.createElement('a')
    a.download = `bynari-${heroTitle.toLowerCase()}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  const checkerBg = tema === 'dark'
    ? 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 0 0 / 16px 16px'
    : 'repeating-conic-gradient(#e0dcd8 0% 25%, #f0ece6 0% 50%) 0 0 / 16px 16px'

  return (
    <div className="space-y-5">
      {/* Dark / Light toggle */}
      <div className="flex gap-2 justify-center">
        {(['dark', 'light'] as const).map(t => (
          <button key={t} onClick={() => setTema(t)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: tema === t ? 'oklch(0.70 0.19 46)' : 'var(--c-22)', color: tema === t ? 'var(--c-13)' : 'var(--c-55)', border: '1px solid var(--c-w8)' }}>
            {t === 'dark' ? <><FontAwesomeIcon icon={faMoon} /> Dark</> : <><FontAwesomeIcon icon={faSun} /> Light</>}
          </button>
        ))}
      </div>

      {/* Coach toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowCoach(p => !p)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0"
          style={{ background: showCoach ? 'oklch(0.60 0.15 200 / 20%)' : 'var(--c-22)', color: showCoach ? 'oklch(0.60 0.15 200)' : 'var(--c-50)', border: `1px solid ${showCoach ? 'oklch(0.60 0.15 200 / 40%)' : 'var(--c-w8)'}` }}>
          <span style={{ fontSize: 10 }}>{showCoach ? '✓' : '○'}</span>Coach / PT
        </button>
        {showCoach && (
          <input type="text" value={coachInput} onChange={e => setCoachInput(e.target.value)}
            placeholder="Nome coach o PT..."
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: 'var(--c-22)', border: '1px solid var(--c-w10)', color: 'var(--c-97)' }} />
        )}
      </div>

      {/* Variant selector 2×2 */}
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--c-55)' }}>Scegli variante</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {VARIANTS.map(v => {
            const isActive = variante === v.id
            return (
              <button key={v.id} onClick={() => setVariante(v.id)}
                className="relative flex flex-col items-start gap-1 p-3 rounded-xl transition-all text-left"
                style={{ background: isActive ? 'oklch(0.70 0.19 46 / 12%)' : 'var(--c-22)', border: `2px solid ${isActive ? 'oklch(0.70 0.19 46)' : 'var(--c-w8)'}`, cursor: 'pointer' }}>
                {isActive && (
                  <span style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: 'oklch(0.70 0.19 46)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--c-13)', fontWeight: 800 }}>✓</span>
                )}
                <span style={{ fontSize: 18 }}>{v.emoji}</span>
                <span className="text-xs font-bold" style={{ color: isActive ? 'oklch(0.70 0.19 46)' : 'var(--c-80)' }}>{v.label}</span>
                <span className="text-xs" style={{ color: 'var(--c-45)' }}>{v.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Highlights selector */}
      {esercizi.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-22)', border: '1px solid var(--c-w6)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--c-w6)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--c-97)' }}>Scegli fino a 3 highlights</p>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: selezionati.length === 3 ? 'oklch(0.70 0.19 46 / 20%)' : 'var(--c-30)', color: selezionati.length === 3 ? 'oklch(0.70 0.19 46)' : 'var(--c-50)' }}>
              {selezionati.length}/3
            </span>
          </div>
          <div>
            {esercizi.map((ese, i) => {
              const isSelected = selezionati.some(s => s.nome === ese.nome)
              const isDisabled = !isSelected && selezionati.length >= 3
              return (
                <button key={ese.nome} onClick={() => !isDisabled && toggleEsercizio(ese)}
                  className="w-full flex items-center justify-between px-4 py-3 transition-all text-left"
                  style={{ borderBottom: i < esercizi.length - 1 ? '1px solid var(--c-w4)' : 'none', background: isSelected ? 'oklch(0.70 0.19 46 / 10%)' : 'transparent', opacity: isDisabled ? 0.35 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: isSelected ? 'oklch(0.70 0.19 46)' : 'var(--c-30)', border: isSelected ? 'none' : '1px solid var(--c-w15)' }}>
                      {isSelected && <span style={{ color: 'var(--c-13)', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span className="text-sm font-medium" style={{ color: isSelected ? 'var(--c-97)' : 'var(--c-70)' }}>{ese.nome}</span>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: isSelected ? 'oklch(0.70 0.19 46)' : 'var(--c-50)' }}>
                    {ese.tipoInput === 'timer' ? `${ese.durataMax ?? 0}s` : `${ese.pesoMax} kg`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="flex flex-col items-center gap-2">
        <div style={{ width: 240, height: 427, overflow: 'hidden', borderRadius: 16, background: checkerBg, position: 'relative', flexShrink: 0 }}>
          <div style={{ transform: 'scale(0.667)', transformOrigin: 'top left', width: 360, height: 640 }}>
            <SelectedCard {...cardProps} />
          </div>
        </div>
        <p className="text-xs text-center" style={{ color: 'var(--c-40)' }}>La scacchiera indica la trasparenza del PNG finale</p>
      </div>

      {/* Hidden full-size export target */}
      <div ref={exportRef} style={{ position: 'fixed', top: -9999, left: -9999, width: 360, height: 640, overflow: 'hidden', pointerEvents: 'none' }}>
        <SelectedCard {...cardProps} />
      </div>

      {/* Download */}
      <div className="flex justify-center">
        <button onClick={handleDownload} disabled={downloading}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: downloading ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)', color: 'var(--c-13)', cursor: downloading ? 'not-allowed' : 'pointer' }}>
          {downloading ? 'Generando...' : <><FontAwesomeIcon icon={faDownload} /> Scarica / Condividi</>}
        </button>
      </div>

      {/* Tutorial */}
      <details className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)' }}>
        <summary className="px-4 py-3 text-xs font-semibold cursor-pointer flex items-center justify-between select-none" style={{ color: 'var(--c-60)' }}>
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
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5" style={{ background: 'oklch(0.70 0.19 46 / 20%)', color: 'oklch(0.70 0.19 46)' }}>{step.n}</span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--c-65)' }}>{step.text}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
