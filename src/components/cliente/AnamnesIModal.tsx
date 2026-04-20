'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faArrowLeft, faCheck, faCamera, faXmark } from '@fortawesome/free-solid-svg-icons'

interface Props {
  onComplete: () => void
}

const STEPS = [
  'Dati personali',
  'Stile di vita',
  'Sonno',
  'Alimentazione',
  'Allenamento',
  'Salute',
  'Carattere e foto',
]

async function compressImage(file: File, maxWidth = 1200): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        resolve(blob!)
        URL.revokeObjectURL(url)
      }, 'image/jpeg', 0.82)
    }
    img.src = url
  })
}

export default function AnamnesIModal({ onComplete }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    eta: '',
    altezza_cm: '',
    sesso: '' as 'M' | 'F' | '',
    prima_pesata: '',
    occupazione: '',
    ore_piedi_giorno: '',
    ore_seduto_giorno: '',
    ore_sonno: '',
    qualita_sonno: 3,
    orario_sonno: '',
    giornata_alimentare_esempio: '',
    timing_pasti: '',
    allenamenti_settimana: 3,
    durata_allenamento_minuti: '',
    orario_allenamento: '',
    patologie: '',
    intolleranze: '',
    farmaci: false,
    farmaci_dettaglio: '',
    descrizione_caratteriale: '',
  })
  const [foto, setFoto] = useState<(File | null)[]>([null, null, null, null])
  const [fotoPreview, setFotoPreview] = useState<(string | null)[]>([null, null, null, null])

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const handleFoto = async (index: number, file: File | null) => {
    if (!file) return
    const preview = URL.createObjectURL(file)
    setFoto(prev => { const n = [...prev]; n[index] = file; return n })
    setFotoPreview(prev => { const n = [...prev]; n[index] = preview; return n })
  }

  const removeFoto = (index: number) => {
    setFoto(prev => { const n = [...prev]; n[index] = null; return n })
    setFotoPreview(prev => { const n = [...prev]; n[index] = null; return n })
  }

  const handleSubmit = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    // Upload foto compresse
    const fotoUrls: string[] = []
    for (let i = 0; i < 4; i++) {
      const f = foto[i]
      if (!f) continue
      const compressed = await compressImage(f)
      const path = `${user.id}/foto_${i}.jpg`
      const { error } = await supabase.storage.from('anamnesi-foto').upload(path, compressed, { upsert: true })
      if (!error) fotoUrls.push(path)
    }

    await supabase.from('anamnesi').upsert({
      cliente_id: user.id,
      eta: form.eta ? parseInt(form.eta) : null,
      altezza_cm: form.altezza_cm ? parseFloat(form.altezza_cm) : null,
      sesso: form.sesso || null,
      occupazione: form.occupazione || null,
      ore_piedi_giorno: form.ore_piedi_giorno ? parseFloat(form.ore_piedi_giorno) : null,
      ore_seduto_giorno: form.ore_seduto_giorno ? parseFloat(form.ore_seduto_giorno) : null,
      ore_sonno: form.ore_sonno ? parseFloat(form.ore_sonno) : null,
      qualita_sonno: form.qualita_sonno,
      orario_sonno: form.orario_sonno || null,
      giornata_alimentare_esempio: form.giornata_alimentare_esempio || null,
      timing_pasti: form.timing_pasti || null,
      allenamenti_settimana: form.allenamenti_settimana,
      durata_allenamento_minuti: form.durata_allenamento_minuti ? parseInt(form.durata_allenamento_minuti) : null,
      orario_allenamento: form.orario_allenamento || null,
      patologie: form.patologie || null,
      intolleranze: form.intolleranze || null,
      farmaci: form.farmaci,
      farmaci_dettaglio: form.farmaci && form.farmaci_dettaglio ? form.farmaci_dettaglio : null,
      descrizione_caratteriale: form.descrizione_caratteriale || null,
      foto_urls: fotoUrls,
      completata_at: new Date().toISOString(),
    }, { onConflict: 'cliente_id' })

    // Prima pesata opzionale → inserita in misurazioni così il grafico è già aggiornato
    if (form.prima_pesata) {
      await supabase.from('misurazioni').insert({
        cliente_id: user.id,
        peso_kg: parseFloat(form.prima_pesata),
        data: new Date().toISOString().split('T')[0],
        note: 'Pesata iniziale',
      })
    }

    setSaving(false)
    onComplete()
  }

  const inputStyle = {
    background: 'var(--c-20)',
    border: '1px solid var(--c-w10)',
    color: 'var(--c-97)',
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl text-sm outline-none transition-all'

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Sesso</label>
            <div className="grid grid-cols-2 gap-3">
              {([{ v: 'M', label: '♂ Uomo' }, { v: 'F', label: '♀ Donna' }] as const).map(({ v, label }) => (
                <button key={v} onClick={() => set('sesso', v)}
                  className="py-3 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: form.sesso === v ? 'oklch(0.70 0.19 46)' : 'var(--c-20)',
                    color: form.sesso === v ? 'var(--c-13)' : 'var(--c-55)',
                    border: `1px solid ${form.sesso === v ? 'oklch(0.70 0.19 46)' : 'var(--c-w8)'}`,
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Età</label>
            <input type="number" placeholder="es. 28" value={form.eta} onChange={e => set('eta', e.target.value)}
              className={inputClass} style={inputStyle} min={10} max={99} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Altezza (cm)</label>
            <input type="number" placeholder="es. 175" value={form.altezza_cm} onChange={e => set('altezza_cm', e.target.value)}
              className={inputClass} style={inputStyle} min={100} max={250} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>
              Peso attuale (kg) <span style={{ color: 'var(--c-45)' }}>— opzionale</span>
            </label>
            <input type="number" placeholder="es. 72.5" value={form.prima_pesata} onChange={e => set('prima_pesata', e.target.value)}
              className={inputClass} style={inputStyle} min={30} max={300} step={0.1} />
            <p className="text-xs" style={{ color: 'var(--c-40)' }}>
              Verrà salvata automaticamente nel tuo storico pesi
            </p>
          </div>
        </div>
      )

      case 1: return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Occupazione</label>
            <input type="text" placeholder="es. Studente universitario, Impiegato ufficio, Operaio..." value={form.occupazione}
              onChange={e => set('occupazione', e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Ore in piedi/giorno</label>
              <input type="number" placeholder="es. 3" value={form.ore_piedi_giorno} onChange={e => set('ore_piedi_giorno', e.target.value)}
                className={inputClass} style={inputStyle} min={0} max={16} step={0.5} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Ore seduto/giorno</label>
              <input type="number" placeholder="es. 8" value={form.ore_seduto_giorno} onChange={e => set('ore_seduto_giorno', e.target.value)}
                className={inputClass} style={inputStyle} min={0} max={16} step={0.5} />
            </div>
          </div>
        </div>
      )

      case 2: return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Ore di sonno</label>
              <input type="number" placeholder="es. 7.5" value={form.ore_sonno} onChange={e => set('ore_sonno', e.target.value)}
                className={inputClass} style={inputStyle} min={3} max={12} step={0.5} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Orario in cui vai a letto</label>
              <input type="text" placeholder="es. 23:30" value={form.orario_sonno} onChange={e => set('orario_sonno', e.target.value)}
                className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Qualità del sonno</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(v => (
                <button key={v} onClick={() => set('qualita_sonno', v)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: form.qualita_sonno === v ? 'oklch(0.70 0.19 46)' : 'var(--c-20)',
                    color: form.qualita_sonno === v ? 'var(--c-13)' : 'var(--c-50)',
                    border: '1px solid var(--c-w8)',
                  }}>
                  {v}
                </button>
              ))}
            </div>
            <div className="flex justify-between px-1">
              <span className="text-xs" style={{ color: 'var(--c-45)' }}>Pessima</span>
              <span className="text-xs" style={{ color: 'var(--c-45)' }}>Ottima</span>
            </div>
          </div>
        </div>
      )

      case 3: return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Esempio di giornata alimentare tipica</label>
            <p className="text-xs" style={{ color: 'var(--c-45)' }}>Cosa mangi in una giornata normale? Anche approssimativo va bene.</p>
            <textarea value={form.giornata_alimentare_esempio} onChange={e => set('giornata_alimentare_esempio', e.target.value)}
              rows={4} placeholder="es. Colazione: caffè e brioche. Pranzo: pasta. Cena: carne con verdure..." 
              className={`${inputClass} resize-none`} style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Timing dei pasti</label>
            <input type="text" placeholder="es. Colazione 7:00, spuntino 10:00, pranzo 13:00, cena 20:00"
              value={form.timing_pasti} onChange={e => set('timing_pasti', e.target.value)}
              className={inputClass} style={inputStyle} />
          </div>
        </div>
      )

      case 4: return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>
              Allenamenti a settimana: <span style={{ color: 'oklch(0.70 0.19 46)' }}>{form.allenamenti_settimana}</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5, 6, 7].map(v => (
                <button key={v} onClick={() => set('allenamenti_settimana', v)}
                  className="w-10 h-10 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: form.allenamenti_settimana === v ? 'oklch(0.70 0.19 46)' : 'var(--c-20)',
                    color: form.allenamenti_settimana === v ? 'var(--c-13)' : 'var(--c-55)',
                    border: '1px solid var(--c-w8)',
                  }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Durata media (min)</label>
              <input type="number" placeholder="es. 60" value={form.durata_allenamento_minuti}
                onChange={e => set('durata_allenamento_minuti', e.target.value)}
                className={inputClass} style={inputStyle} min={0} max={300} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Orario preferito</label>
              <input type="text" placeholder="es. Mattina, ore 18" value={form.orario_allenamento}
                onChange={e => set('orario_allenamento', e.target.value)}
                className={inputClass} style={inputStyle} />
            </div>
          </div>
        </div>
      )

      case 5: return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Patologie o infortuni</label>
            <textarea value={form.patologie} onChange={e => set('patologie', e.target.value)}
              rows={3} placeholder="es. Lombosciatalgia, lesione menisco sx, nessuna..."
              className={`${inputClass} resize-none`} style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Intolleranze e allergie</label>
            <input type="text" placeholder="es. Lattosio, glutine, nichel, nessuna..." value={form.intolleranze}
              onChange={e => set('intolleranze', e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Assumi farmaci?</label>
              <button onClick={() => set('farmaci', !form.farmaci)} className="relative flex-shrink-0">
                <div className="w-12 h-7 rounded-full transition-colors duration-200"
                  style={{ background: form.farmaci ? 'oklch(0.65 0.18 150)' : 'var(--c-30)' }}>
                  <div className="absolute top-0.5 w-6 h-6 rounded-full shadow-md transition-transform duration-200"
                    style={{ background: 'var(--c-97)', transform: form.farmaci ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }} />
                </div>
              </button>
            </div>
            {form.farmaci && (
              <input type="text" placeholder="Quali farmaci?" value={form.farmaci_dettaglio}
                onChange={e => set('farmaci_dettaglio', e.target.value)} className={inputClass} style={inputStyle} />
            )}
          </div>
        </div>
      )

      case 6: return (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>Descriviti come persona</label>
            <p className="text-xs" style={{ color: 'var(--c-45)' }}>es. costantemente stressata, tranquilla, ansiosa, molto motivata...</p>
            <textarea value={form.descrizione_caratteriale} onChange={e => set('descrizione_caratteriale', e.target.value)}
              rows={3} placeholder="Descriviti brevemente dal punto di vista caratteriale..."
              className={`${inputClass} resize-none`} style={inputStyle} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'var(--c-75)' }}>
              4 foto in posizione anatomica <span style={{ color: 'var(--c-50)' }}>(opzionale)</span>
            </label>
            <p className="text-xs" style={{ color: 'var(--c-45)' }}>
              Total body in boxer/mutande: frontale, laterale sx, laterale dx, posteriore. Stanza illuminata, luci fredde.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['Frontale', 'Laterale sx', 'Laterale dx', 'Posteriore'] as const).map((label, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden"
                  style={{ background: 'var(--c-18)', border: '1px solid var(--c-w10)' }}>
                  {fotoPreview[i] ? (
                    <>
                      <img src={fotoPreview[i]!} alt={label} className="w-full h-full object-cover" />
                      <button onClick={() => removeFoto(i)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'oklch(0 0 0 / 60%)' }}>
                        <FontAwesomeIcon icon={faXmark} className="text-xs" style={{ color: 'var(--c-97)' }} />
                      </button>
                    </>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer gap-1.5">
                      <FontAwesomeIcon icon={faCamera} style={{ color: 'var(--c-40)', fontSize: '1.25rem' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--c-45)' }}>{label}</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden"
                        onChange={e => handleFoto(i, e.target.files?.[0] ?? null)} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )

      default: return null
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'oklch(0 0 0 / 80%)' }}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: 'var(--c-13)', border: '1px solid var(--c-w8)', maxHeight: '92dvh' }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.70 0.19 46)' }}>
                Anamnesi corporea
              </p>
              <h2 className="text-xl font-black mt-0.5" style={{ color: 'var(--c-97)' }}>
                {STEPS[step]}
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
              {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{ background: i <= step ? 'oklch(0.70 0.19 46)' : 'var(--c-25)' }} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--c-w8)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"
              style={{ background: 'var(--c-22)', color: 'var(--c-60)' }}>
              <FontAwesomeIcon icon={faArrowLeft} /> Indietro
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)' }}>
              Avanti <FontAwesomeIcon icon={faArrowRight} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: saving ? 'oklch(0.50 0.12 46)' : 'oklch(0.70 0.19 46)', color: 'var(--c-13)', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Salvataggio...' : <><FontAwesomeIcon icon={faCheck} /> Completa anamnesi</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
