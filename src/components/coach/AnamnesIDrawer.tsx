'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faTriangleExclamation, faLightbulb, faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { generateNoteAnamnesi } from '@/lib/anamnesi-notes'

interface Props {
  clienteId: string
  clienteNome: string
  onClose: () => void
}

export default function AnamnesIDrawer({ clienteId, clienteNome, onClose }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [anamnesi, setAnamnesi] = useState<any>(null)
  const [fotoUrls, setFotoUrls] = useState<(string | null)[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnamnesi = async () => {
      setLoading(true)
      const { data } = await supabase.from('anamnesi').select('*').eq('cliente_id', clienteId).maybeSingle()
      setAnamnesi(data)

      if (data?.foto_urls?.length) {
        const urls = await Promise.all(
          (data.foto_urls as string[]).map(async (path: string) => {
            const { data: signedData } = await supabase.storage.from('anamnesi-foto').createSignedUrl(path, 3600)
            return signedData?.signedUrl ?? null
          })
        )
        setFotoUrls(urls)
      }

      setLoading(false)
    }
    fetchAnamnesi()
  }, [clienteId])

  const note = anamnesi ? generateNoteAnamnesi(anamnesi) : []

  const tipoIcon = (tipo: string) => {
    if (tipo === 'warning') return faTriangleExclamation
    if (tipo === 'tip') return faLightbulb
    return faCircleInfo
  }
  const tipoColor = (tipo: string) => {
    if (tipo === 'warning') return { color: 'oklch(0.75 0.15 27)', bg: 'oklch(0.65 0.22 27 / 12%)', border: 'oklch(0.65 0.22 27 / 25%)' }
    if (tipo === 'tip') return { color: 'oklch(0.75 0.18 80)', bg: 'oklch(0.75 0.18 80 / 12%)', border: 'oklch(0.75 0.18 80 / 25%)' }
    return { color: 'oklch(0.60 0.15 200)', bg: 'oklch(0.60 0.15 200 / 12%)', border: 'oklch(0.60 0.15 200 / 25%)' }
  }

  const Row = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === '') return null
    return (
      <div className="flex items-start justify-between gap-4 py-2.5"
        style={{ borderBottom: '1px solid oklch(1 0 0 / 5%)' }}>
        <span className="text-xs flex-shrink-0" style={{ color: 'oklch(0.50 0 0)', minWidth: 120 }}>{label}</span>
        <span className="text-sm text-right" style={{ color: 'oklch(0.85 0 0)' }}>{value}</span>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[55] flex justify-end" style={{ background: 'oklch(0 0 0 / 60%)' }}
      onClick={onClose}>
      <div className="w-full max-w-md h-full overflow-y-auto flex flex-col"
        style={{ background: 'oklch(0.13 0 0)', borderLeft: '1px solid oklch(1 0 0 / 8%)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5"
          style={{ background: 'oklch(0.13 0 0)', borderBottom: '1px solid oklch(1 0 0 / 8%)', paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: '1rem' }}>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.60 0 0)' }}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
          <div>
            <p className="font-black text-base" style={{ color: 'oklch(0.97 0 0)' }}>{clienteNome}</p>
            <p className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>Anamnesi corporea</p>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Caricamento...</p>
          </div>
        ) : !anamnesi ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-3xl">📋</p>
            <p className="font-semibold" style={{ color: 'oklch(0.60 0 0)' }}>Anamnesi non ancora compilata</p>
            <p className="text-sm" style={{ color: 'oklch(0.40 0 0)' }}>Il cliente la vedrà alla prossima apertura dell'app</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">

            {/* Note algoritmo */}
            {note.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'oklch(0.40 0 0)' }}>
                  Note per la programmazione
                </p>
                {note.map((n, i) => {
                  const c = tipoColor(n.tipo)
                  return (
                    <div key={i} className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
                      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                      <FontAwesomeIcon icon={tipoIcon(n.tipo)} className="flex-shrink-0 mt-0.5 text-xs" style={{ color: c.color }} />
                      <p className="text-xs leading-relaxed" style={{ color: c.color }}>{n.testo}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Dati personali */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'oklch(0.40 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                Dati personali
              </p>
              <div className="px-4">
                <Row label="Sesso" value={anamnesi.sesso === 'M' ? '♂ Uomo' : anamnesi.sesso === 'F' ? '♀ Donna' : null} />
                <Row label="Età" value={anamnesi.eta ? `${anamnesi.eta} anni` : null} />
                <Row label="Altezza" value={anamnesi.altezza_cm ? `${anamnesi.altezza_cm} cm` : null} />
              </div>
            </div>

            {/* Stile di vita */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'oklch(0.40 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                Stile di vita
              </p>
              <div className="px-4">
                <Row label="Occupazione" value={anamnesi.occupazione} />
                <Row label="Ore in piedi/giorno" value={anamnesi.ore_piedi_giorno ? `${anamnesi.ore_piedi_giorno}h` : null} />
                <Row label="Ore seduto/giorno" value={anamnesi.ore_seduto_giorno ? `${anamnesi.ore_seduto_giorno}h` : null} />
              </div>
            </div>

            {/* Sonno */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'oklch(0.40 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                Sonno
              </p>
              <div className="px-4">
                <Row label="Ore di sonno" value={anamnesi.ore_sonno ? `${anamnesi.ore_sonno}h` : null} />
                <Row label="Qualità" value={anamnesi.qualita_sonno ? `${anamnesi.qualita_sonno}/5` : null} />
                <Row label="Orario in cui va a letto" value={anamnesi.orario_sonno} />
              </div>
            </div>

            {/* Alimentazione */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'oklch(0.40 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                Alimentazione
              </p>
              <div className="px-4">
                <Row label="Timing pasti" value={anamnesi.timing_pasti} />
                {anamnesi.giornata_alimentare_esempio && (
                  <div className="py-2.5" style={{ borderBottom: '1px solid oklch(1 0 0 / 5%)' }}>
                    <p className="text-xs mb-1.5" style={{ color: 'oklch(0.50 0 0)' }}>Esempio giornata alimentare</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.80 0 0)' }}>{anamnesi.giornata_alimentare_esempio}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Allenamento pregresso */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'oklch(0.40 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                Allenamento pregresso
              </p>
              <div className="px-4">
                <Row label="Allenamenti/settimana" value={anamnesi.allenamenti_settimana !== null ? `${anamnesi.allenamenti_settimana}x` : null} />
                <Row label="Durata media" value={anamnesi.durata_allenamento_minuti ? `${anamnesi.durata_allenamento_minuti} min` : null} />
                <Row label="Orario preferito" value={anamnesi.orario_allenamento} />
              </div>
            </div>

            {/* Salute */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
              <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'oklch(0.40 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                Salute
              </p>
              <div className="px-4">
                <Row label="Patologie/infortuni" value={anamnesi.patologie || 'Nessuna'} />
                <Row label="Intolleranze/allergie" value={anamnesi.intolleranze || 'Nessuna'} />
                <Row label="Farmaci" value={anamnesi.farmaci ? (anamnesi.farmaci_dettaglio || 'Sì') : 'No'} />
              </div>
            </div>

            {/* Carattere */}
            {anamnesi.descrizione_caratteriale && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
                <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'oklch(0.40 0 0)', borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
                  Carattere
                </p>
                <p className="px-4 py-3 text-sm leading-relaxed" style={{ color: 'oklch(0.80 0 0)' }}>
                  {anamnesi.descrizione_caratteriale}
                </p>
              </div>
            )}

            {/* Foto */}
            {fotoUrls.filter(Boolean).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'oklch(0.40 0 0)' }}>
                  Foto anatomiche
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['Frontale', 'Laterale sx', 'Laterale dx', 'Posteriore'] as const).map((label, i) =>
                    fotoUrls[i] ? (
                      <div key={i} className="relative aspect-square rounded-2xl overflow-hidden"
                        style={{ background: 'oklch(0.18 0 0)' }}>
                        <img src={fotoUrls[i]!} alt={label} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
                          style={{ background: 'oklch(0 0 0 / 50%)' }}>
                          <p className="text-xs font-medium text-center" style={{ color: 'oklch(0.90 0 0)' }}>{label}</p>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Data compilazione */}
            {anamnesi.completata_at && (
              <p className="text-xs text-center" style={{ color: 'oklch(0.35 0 0)' }}>
                Compilata il {new Date(anamnesi.completata_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
