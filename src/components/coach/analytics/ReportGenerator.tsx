'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faDownload, faPaperPlane, faSpinner } from '@fortawesome/free-solid-svg-icons'
import type { PeriodoGiorni } from './AnalyticsHeader'

interface Kpi {
  sessioni: number
  completamento: number
  benessere: number | null
}

interface Props {
  clienteId: string
  nomeCliente: string
  periodo: PeriodoGiorni
  kpi: Kpi
  ultimoPeso: number | null
  onClose: () => void
}

interface EsercizioReport {
  nome: string
  deltaE1rm: number
}

interface MuscoloReport {
  muscolo: string
  delta: number
}

const PERIODO_LABEL: Record<PeriodoGiorni, string> = {
  30: '30 giorni',
  90: '90 giorni',
  180: '6 mesi',
  9999: 'tutto',
}

export default function ReportGenerator({ clienteId, nomeCliente, periodo, kpi, ultimoPeso, onClose }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const reportRef = useRef<HTMLDivElement>(null)
  const [messaggio, setMessaggio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const [esercizi, setEsercizi] = useState<EsercizioReport[]>([])
  const [muscoliTop, setMuscoliTop] = useState<MuscoloReport[]>([])
  const [muscoliCalo, setMuscoliCalo] = useState<MuscoloReport[]>([])
  const [pesoInizio, setPesoInizio] = useState<number | null>(null)
  const [coachId, setCoachId] = useState<string | null>(null)

  const msPerDay = 86400000
  const dataInizio = periodo === 9999
    ? '2000-01-01'
    : new Date(Date.now() - periodo * msPerDay).toISOString()
  const periodoLabel = PERIODO_LABEL[periodo]
  const dataOggi = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCoachId(user.id)

      const [sessRes, pesoRes] = await Promise.all([
        supabase.from('sessioni')
          .select('id')
          .eq('cliente_id', clienteId)
          .eq('completata', true)
          .gte('data', dataInizio),
        supabase.from('misurazioni')
          .select('peso_kg')
          .eq('cliente_id', clienteId)
          .gte('data', dataInizio)
          .order('data', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ])

      setPesoInizio(pesoRes.data?.peso_kg ?? null)

      const sessIds = (sessRes.data ?? []).map(s => s.id)
      if (sessIds.length === 0) { setLoading(false); return }

      const { data: logs } = await supabase
        .from('log_serie')
        .select(`
          sessione_id, peso_kg, ripetizioni, completata,
          scheda_esercizi!inner (
            esercizi!scheda_esercizi_esercizio_id_fkey ( id, nome, muscoli, tipo_input )
          )
        `)
        .in('sessione_id', sessIds)
        .eq('completata', true)

      // Raggruppa per esercizio per sessione — calcola e1RM max
      const eseSessioneMap = new Map<string, Map<string, number>>()
      const eseNomiMap = new Map<string, string>()
      const muscoloVolumeMap = new Map<string, number>()

      for (const log of (logs ?? []) as any[]) {
        const ese = log.scheda_esercizi?.esercizi
        if (!ese || ese.tipo_input === 'timer' || ese.tipo_input === 'timer_unilaterale') continue
        const eseId = ese.id
        const nome = ese.nome
        const peso = parseFloat(log.peso_kg) || 0
        const reps = parseInt(log.ripetizioni) || 0
        if (peso <= 0 || reps <= 0) continue
        const e1rm = reps === 1 ? peso : Math.round((peso * (1 + reps / 30)) * 10) / 10

        eseNomiMap.set(eseId, nome)
        const sessId = log.sessione_id
        if (!eseSessioneMap.has(eseId)) eseSessioneMap.set(eseId, new Map())
        const sessMap = eseSessioneMap.get(eseId)!
        sessMap.set(sessId, Math.max(sessMap.get(sessId) ?? 0, e1rm))

        const muscoli: string[] = ese.muscoli ?? []
        const vol = peso * reps
        for (const m of muscoli) {
          muscoloVolumeMap.set(m, (muscoloVolumeMap.get(m) ?? 0) + vol)
        }
      }

      // Calcola trend e1RM per esercizio (prima metà vs seconda metà del periodo)
      const eseResult: EsercizioReport[] = []
      for (const [eseId, sessMap] of eseSessioneMap) {
        const valori = Array.from(sessMap.values()).sort((a, b) => a - b)
        if (valori.length < 2) continue
        const prima = valori[0]
        const ultima = valori[valori.length - 1]
        if (prima <= 0) continue
        const delta = Math.round(((ultima - prima) / prima) * 100)
        eseResult.push({ nome: eseNomiMap.get(eseId) ?? eseId, deltaE1rm: delta })
      }
      eseResult.sort((a, b) => b.deltaE1rm - a.deltaE1rm)

      setEsercizi(eseResult.filter(e => e.deltaE1rm > 0).slice(0, 3))

      // Muscoli — calcola vs periodo precedente
      const dataInizioPrec = periodo === 9999
        ? '2000-01-01'
        : new Date(Date.now() - periodo * 2 * msPerDay).toISOString()
      const dataFinePrec = dataInizio

      const sessPreRes = await supabase.from('sessioni')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('completata', true)
        .gte('data', dataInizioPrec)
        .lt('data', dataFinePrec)

      const sessIdsPrec = (sessPreRes.data ?? []).map(s => s.id)
      const muscoloVolumePrec = new Map<string, number>()

      if (sessIdsPrec.length > 0) {
        const { data: logsPrec } = await supabase
          .from('log_serie')
          .select(`peso_kg, ripetizioni, completata, scheda_esercizi!inner ( esercizi!scheda_esercizi_esercizio_id_fkey ( muscoli, tipo_input ) )`)
          .in('sessione_id', sessIdsPrec)
          .eq('completata', true)
        for (const log of (logsPrec ?? []) as any[]) {
          const ese = log.scheda_esercizi?.esercizi
          if (!ese || ese.tipo_input === 'timer' || ese.tipo_input === 'timer_unilaterale') continue
          const muscoli: string[] = ese.muscoli ?? []
          const vol = (parseFloat(log.peso_kg) || 0) * (parseInt(log.ripetizioni) || 0)
          for (const m of muscoli) muscoloVolumePrec.set(m, (muscoloVolumePrec.get(m) ?? 0) + vol)
        }
      }

      const muscoliStats = Array.from(muscoloVolumeMap.entries()).map(([m, vol]) => {
        const prec = muscoloVolumePrec.get(m) ?? 0
        const delta = prec > 0 ? Math.round(((vol - prec) / prec) * 100) : 0
        return { muscolo: m, delta, volume: vol }
      }).sort((a, b) => b.volume - a.volume)

      setMuscoliTop(muscoliStats.filter(m => m.delta > 0).slice(0, 2))
      setMuscoliCalo(muscoliStats.filter(m => m.delta < -10).slice(0, 2))

      setLoading(false)
    }
    fetchData()
  }, [clienteId, periodo])

  const deltaPeso = pesoInizio && ultimoPeso
    ? Math.round((ultimoPeso - pesoInizio) * 10) / 10
    : null

  const generaImmagine = async (): Promise<string | null> => {
    if (!reportRef.current) return null
    const html2canvas = (await import('html2canvas')).default

    // html2canvas non supporta oklch — puliamo i colori nel clone prima del render
    const cleanOklch = (el: HTMLElement) => {
      const all = el.querySelectorAll<HTMLElement>('*')
      const targets = [el, ...Array.from(all)]
      for (const node of targets) {
        const s = node.style
        const props = ['color', 'background', 'backgroundColor', 'borderColor',
          'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor']
        for (const p of props) {
          const val = (s as any)[p] ?? ''
          if (val.includes('oklch') || val.includes('lab(') || val.includes('lch(')) {
            (s as any)[p] = ''
          }
        }
        // Rimuovi anche le classi Tailwind che potrebbero iniettare oklch via computed style
        node.removeAttribute('class')
      }
    }

    const canvas = await html2canvas(reportRef.current, {
      backgroundColor: '#111111',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (clonedDoc, el) => {
        // Rimuove tutti i CSS della pagina — il report usa solo stili inline hex
        clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach(s => s.remove())
        cleanOklch(el)
      },
    })
    return canvas.toDataURL('image/png', 0.95)
  }

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) u8arr[n] = bstr.charCodeAt(n)
    return new Blob([u8arr], { type: mime })
  }

  const handleSalvaImmagine = async () => {
    setSaving(true)
    try {
      const dataUrl = await generaImmagine()
      if (dataUrl) {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `report-${nomeCliente.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (e) {
      console.error('Report generation error:', e)
    }
    setSaving(false)
  }

  const handleInviaChat = async () => {
    if (!coachId) return
    setSending(true)
    try {
      const dataUrl = await generaImmagine()
      if (!dataUrl) { setSending(false); return }
      const blob = dataUrlToBlob(dataUrl)

      const fileName = `report-${clienteId}-${Date.now()}.png`
      const { data: upload, error } = await supabase.storage
        .from('reports')
        .upload(fileName, blob, { contentType: 'image/png', upsert: false })

    if (error || !upload) { setSending(false); return }

    const { data: urlData } = supabase.storage.from('reports').getPublicUrl(fileName)
    const publicUrl = urlData?.publicUrl

      if (!publicUrl) { setSending(false); return }

      await supabase.from('messaggi').insert({
        coach_id: coachId,
        cliente_id: clienteId,
        testo: publicUrl,
        da_coach: true,
      })

      setSending(false)
      onClose()
    } catch (e) {
      console.error('Send report error:', e)
      setSending(false)
    }
  }

  const iniziali = nomeCliente.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'oklch(0 0 0 / 75%)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col"
        style={{ background: 'var(--c-15)', border: '1px solid var(--c-w10)', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--c-w8)' }}>
          <p className="font-bold" style={{ color: 'var(--c-97)' }}>Genera report</p>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--c-22)', color: 'var(--c-55)' }}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--c-45)' }}>
              Messaggio del coach (opzionale)
            </label>
            <textarea
              value={messaggio}
              onChange={e => setMessaggio(e.target.value)}
              placeholder="es. Ottimo lavoro questo mese! La tua costanza sta dando risultati..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)', color: 'var(--c-97)' }}
              onFocus={e => e.target.style.borderColor = 'oklch(0.70 0.19 46)'}
              onBlur={e => e.target.style.borderColor = 'var(--c-w8)'}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--c-45)' }}>
              Anteprima
            </p>

            {loading ? (
              <div className="rounded-2xl py-12 text-center"
                style={{ background: 'oklch(0.12 0 0)' }}>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl"
                  style={{ color: 'oklch(0.70 0.19 46)' }} />
              </div>
            ) : (
              <div
                ref={reportRef}
                style={{
                  background: '#111111',
                  borderRadius: 16,
                  padding: 24,
                  width: '100%',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#E8893C', letterSpacing: '0.05em' }}>BYNARI</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      Report · ultimi {periodoLabel} · {dataOggi}
                    </div>
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(232,137,60,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#E8893C' }}>
                    {iniziali}
                  </div>
                </div>

                <div style={{ fontSize: 20, fontWeight: 700, color: '#F5F5F4', margin: '0 0 2px' }}>{nomeCliente}</div>
                {ultimoPeso && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>{ultimoPeso} kg</div>}

                {messaggio.trim() && (
                  <div style={{ background: 'rgba(232,137,60,0.1)', borderLeft: '3px solid #E8893C', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 1.5 }}>
                    "{messaggio.trim()}"
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                  {[
                    { val: kpi.sessioni, lbl: 'Sessioni' },
                    { val: `${kpi.completamento}%`, lbl: 'Completamento' },
                    { val: kpi.benessere ?? '—', lbl: 'Benessere' },
                  ].map(k => (
                    <div key={k.lbl} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#E8893C', lineHeight: 1 }}>{k.val}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{k.lbl}</div>
                    </div>
                  ))}
                </div>

                {esercizi.length > 0 && (
                  <>
                    <div style={{ height: 0.5, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
                      I tuoi punti forti
                    </div>
                    {esercizi.map(e => (
                      <div key={e.nome} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 }}>{e.nome}</div>
                        <div style={{ width: 80, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(e.deltaE1rm, 100)}%`, background: '#5DCAA5', borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#5DCAA5', width: 42, textAlign: 'right' }}>+{e.deltaE1rm}%</div>
                      </div>
                    ))}
                  </>
                )}

                {muscoliCalo.length > 0 && (
                  <>
                    <div style={{ height: 0.5, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
                      Su cui lavorare
                    </div>
                    {muscoliCalo.map(m => (
                      <div key={m.muscolo} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 }}>{m.muscolo}</div>
                        <div style={{ width: 80, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(Math.abs(m.delta), 100)}%`, background: '#E8893C', borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#E8893C', width: 42, textAlign: 'right' }}>{m.delta}%</div>
                      </div>
                    ))}
                  </>
                )}

                {deltaPeso !== null && (
                  <>
                    <div style={{ height: 0.5, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
                      Peso corporeo
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 }}>
                        {pesoInizio} kg → {ultimoPeso} kg
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: deltaPeso < 0 ? '#5DCAA5' : deltaPeso > 0 ? '#E8893C' : 'rgba(255,255,255,0.4)' }}>
                        {deltaPeso > 0 ? '+' : ''}{deltaPeso} kg
                      </div>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Generato il {dataOggi}</div>
                  <div style={{ fontSize: 10, color: '#E8893C', fontWeight: 600 }}>bynari.app</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 flex gap-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--c-w8)' }}>
          <button
            onClick={handleSalvaImmagine}
            disabled={loading || saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'var(--c-22)', color: 'var(--c-80)', border: '1px solid var(--c-w8)', opacity: loading ? 0.5 : 1 }}>
            {saving
              ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              : <FontAwesomeIcon icon={faDownload} />}
            Salva immagine
          </button>
          <button
            onClick={handleInviaChat}
            disabled={loading || sending}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)', opacity: loading ? 0.5 : 1 }}>
            {sending
              ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              : <FontAwesomeIcon icon={faPaperPlane} />}
            Invia in chat
          </button>
        </div>
      </div>
    </div>
  )
}
