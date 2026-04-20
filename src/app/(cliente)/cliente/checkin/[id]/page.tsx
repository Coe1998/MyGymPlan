'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BynariLoader from '@/components/shared/BynariLoader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft, faChevronRight, faCircleCheck,
  faImage, faXmark,
} from '@fortawesome/free-solid-svg-icons'

interface Domanda {
  id: string
  testo: string
  tipo: 'scala' | 'numero' | 'testo' | 'foto'
  ordine: number
}

interface Schedulazione {
  id: string
  richiedi_foto: boolean
  progress_check_set: {
    titolo: string
    progress_check_domande: Domanda[]
  } | null
}

export default function ClienteCheckinPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [schedulazione, setSchedulazione] = useState<Schedulazione | null>(null)
  const [domande, setDomande] = useState<Domanda[]>([])
  const [step, setStep] = useState(0)
  const [risposte, setRisposte] = useState<Record<string, any>>({})
  const [foto, setFoto] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [inviato, setInviato] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('progress_check_schedulazioni')
        .select('id, richiedi_foto, progress_check_set(titolo, progress_check_domande(id, testo, tipo, ordine))')
        .eq('id', id)
        .single()

      if (data) {
        setSchedulazione(data as any)
        const doms = ((data as any).progress_check_set?.progress_check_domande ?? [])
          .sort((a: Domanda, b: Domanda) => a.ordine - b.ordine)
        setDomande(doms)
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  // Domande + eventuale step foto alla fine
  const totalSteps = domande.length + ((schedulazione?.richiedi_foto) ? 1 : 0)
  const isLastStep = step === totalSteps - 1
  const isFotoStep = schedulazione?.richiedi_foto && step === domande.length
  const currentDomanda = !isFotoStep ? domande[step] : null

  const canProceed = () => {
    if (isFotoStep) return true
    if (!currentDomanda) return false
    const r = risposte[currentDomanda.id]
    if (currentDomanda.tipo === 'testo') return true
    return r !== undefined && r !== ''
  }

  const handleRisposta = (val: any) => {
    if (!currentDomanda) return
    setRisposte(prev => ({ ...prev, [currentDomanda.id]: val }))
  }

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFoto(prev => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFoto = (i: number) => setFoto(prev => prev.filter((_, idx) => idx !== i))

  const handleInvia = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // Upload foto
    const fotoUrls: string[] = []
    for (const f of foto) {
      const path = `progress-check/${id}/${user.id}/${Date.now()}_${f.name}`
      const { data } = await supabase.storage.from('uploads').upload(path, f)
      if (data) {
        const { data: url } = supabase.storage.from('uploads').getPublicUrl(path)
        fotoUrls.push(url.publicUrl)
      }
    }

    await supabase.from('progress_check_risposte').insert({
      schedulazione_id: id,
      cliente_id: user.id,
      risposte,
      foto_urls: fotoUrls,
    })

    setSaving(false)
    setInviato(true)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <BynariLoader file="blue" size={80} />
    </div>
  )

  if (!schedulazione) return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="text-center space-y-3">
        <p className="text-5xl">❌</p>
        <p className="font-bold text-lg" style={{ color: 'var(--c-97)' }}>Check-in non trovato</p>
        <button onClick={() => router.push('/cliente/dashboard')}
          className="text-sm" style={{ color: 'oklch(0.60 0.15 200)' }}>
          Torna alla dashboard
        </button>
      </div>
    </div>
  )

  // Inviato con successo
  if (inviato) return (
    <div className="flex items-center justify-center min-h-screen px-6">
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'oklch(0.65 0.18 150 / 20%)' }}>
          <FontAwesomeIcon icon={faCircleCheck} className="text-4xl" style={{ color: 'oklch(0.65 0.18 150)' }} />
        </div>
        <div>
          <p className="text-2xl font-black" style={{ color: 'var(--c-97)' }}>Check-in inviato!</p>
          <p className="text-sm mt-2" style={{ color: 'var(--c-50)' }}>
            Il tuo coach riceverà le tue risposte a breve.
          </p>
        </div>
        <button onClick={() => router.push('/cliente/dashboard')}
          className="w-full py-3 rounded-xl text-sm font-bold"
          style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)' }}>
          Torna alla dashboard
        </button>
      </div>
    </div>
  )

  const titolo = schedulazione.progress_check_set?.titolo ?? 'Check-in'

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto px-5 py-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => step > 0 ? setStep(p => p - 1) : router.push('/cliente/dashboard')}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--c-22)', color: 'var(--c-60)' }}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold" style={{ color: 'oklch(0.70 0.19 46)' }}>{titolo}</p>
          <p className="text-sm font-bold" style={{ color: 'var(--c-97)' }}>
            Domanda {step + 1} di {totalSteps}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-8" style={{ background: 'var(--c-25)' }}>
        <div className="h-1 rounded-full transition-all duration-300"
          style={{ background: 'oklch(0.70 0.19 46)', width: `${((step + 1) / totalSteps) * 100}%` }} />
      </div>

      {/* Contenuto domanda */}
      <div className="flex-1 space-y-6">

        {/* Step domanda normale */}
        {currentDomanda && (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: 'var(--c-45)' }}>
                {currentDomanda.tipo === 'scala' ? 'Scala 1–5' :
                 currentDomanda.tipo === 'numero' ? 'Numero' :
                 currentDomanda.tipo === 'testo' ? 'Testo libero' : 'Risposta'}
              </p>
              <p className="text-2xl font-black leading-snug" style={{ color: 'var(--c-97)' }}>
                {currentDomanda.testo}
              </p>
            </div>

            {/* Scala 1-5 */}
            {currentDomanda.tipo === 'scala' && (
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button key={v}
                    onClick={() => handleRisposta(v)}
                    className="aspect-square rounded-2xl flex items-center justify-center text-2xl font-black transition-all active:scale-95"
                    style={{
                      background: risposte[currentDomanda.id] === v ? 'oklch(0.70 0.19 46)' : 'var(--c-22)',
                      color: risposte[currentDomanda.id] === v ? 'var(--c-13)' : 'var(--c-55)',
                      border: `2px solid ${risposte[currentDomanda.id] === v ? 'oklch(0.70 0.19 46)' : 'transparent'}`,
                    }}>
                    {v}
                  </button>
                ))}
              </div>
            )}

            {/* Numero */}
            {currentDomanda.tipo === 'numero' && (
              <input
                type="number"
                inputMode="decimal"
                value={risposte[currentDomanda.id] ?? ''}
                onChange={e => handleRisposta(e.target.value)}
                placeholder="0"
                className="w-full px-5 py-5 rounded-2xl text-4xl font-black text-center outline-none"
                style={{ background: 'var(--c-22)', border: '1px solid oklch(0.70 0.19 46 / 40%)', color: 'var(--c-97)' }}
                autoFocus
              />
            )}

            {/* Testo */}
            {currentDomanda.tipo === 'testo' && (
              <textarea
                value={risposte[currentDomanda.id] ?? ''}
                onChange={e => handleRisposta(e.target.value)}
                placeholder="Scrivi qui..."
                rows={5}
                className="w-full px-4 py-4 rounded-2xl text-sm outline-none resize-none"
                style={{ background: 'var(--c-22)', border: '1px solid var(--c-w10)', color: 'var(--c-97)' }}
                autoFocus
              />
            )}
          </>
        )}

        {/* Step foto */}
        {isFotoStep && (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: 'var(--c-45)' }}>
                Foto progress
              </p>
              <p className="text-2xl font-black leading-snug" style={{ color: 'var(--c-97)' }}>
                Aggiungi le tue foto
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--c-45)' }}>
                Opzionale — frontale, laterale, posteriore
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {foto.map((f, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden"
                  style={{ background: 'var(--c-22)' }}>
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeFoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'oklch(0 0 0 / 70%)', color: 'white' }}>
                    <FontAwesomeIcon icon={faXmark} className="text-xs" />
                  </button>
                </div>
              ))}
              {foto.length < 6 && (
                <label className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ background: 'var(--c-22)', border: '1.5px dashed var(--c-w15)' }}>
                  <FontAwesomeIcon icon={faImage} style={{ color: 'var(--c-40)', fontSize: 20 }} />
                  <span className="text-xs" style={{ color: 'var(--c-40)' }}>Aggiungi</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFoto} />
                </label>
              )}
            </div>
          </>
        )}
      </div>

      {/* Riepilogo rapido prima di inviare */}
      {isLastStep && Object.keys(risposte).length > 0 && (
        <div className="mt-6 rounded-2xl p-4 space-y-2"
          style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--c-45)' }}>
            Riepilogo
          </p>
          {domande.map(d => (
            risposte[d.id] !== undefined && (
              <div key={d.id} className="flex justify-between items-center">
                <p className="text-xs truncate flex-1 mr-3" style={{ color: 'var(--c-55)' }}>{d.testo}</p>
                <p className="text-xs font-bold flex-shrink-0" style={{ color: 'oklch(0.70 0.19 46)' }}>
                  {d.tipo === 'scala' ? `${risposte[d.id]}/5` : risposte[d.id]}
                </p>
              </div>
            )
          ))}
        </div>
      )}

      {/* Bottone avanti / invia */}
      <div className="mt-6">
        {isLastStep ? (
          <button onClick={handleInvia} disabled={saving}
            className="w-full py-4 rounded-2xl text-sm font-black transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Invio in corso...' : '✓ Invia check-in'}
          </button>
        ) : (
          <button onClick={() => canProceed() && setStep(p => p + 1)}
            className="w-full py-4 rounded-2xl text-sm font-black transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: canProceed() ? 'oklch(0.70 0.19 46)' : 'var(--c-22)',
              color: canProceed() ? 'var(--c-13)' : 'var(--c-40)',
            }}>
            Avanti <FontAwesomeIcon icon={faChevronRight} />
          </button>
        )}
      </div>
    </div>
  )
}
