import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CoachSessioneViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch sessione + esercizi + log
  const { data: sessione } = await supabase
    .from('sessioni')
    .select(`
      id, data, completata, durata_secondi, cliente_id,
      scheda_giorni ( nome ),
      log_serie (
        id, numero_serie, peso_kg, ripetizioni, reps_sx, reps_dx,
        durata_secondi, rpe, rir, completata,
        scheda_esercizi!log_serie_scheda_esercizio_id_fkey (
          id, serie, ripetizioni, recupero_secondi, ordine, tipo, note,
          peso_consigliato_kg, tut,
          esercizi!scheda_esercizi_esercizio_id_fkey ( nome, tipo_input )
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!sessione) redirect('/coach/dashboard')

  // Verifica che il coach abbia accesso a questo cliente
  const { data: cc } = await supabase
    .from('coach_clienti')
    .select('cliente_id')
    .eq('coach_id', user.id)
    .eq('cliente_id', (sessione as any).cliente_id)
    .maybeSingle()

  if (!cc) redirect('/coach/dashboard')

  // Fetch profilo cliente
  const { data: clienteProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', (sessione as any).cliente_id)
    .single()

  // Fetch note esercizi per questa sessione
  const { data: noteData } = await supabase
    .from('note_esercizio')
    .select('id, scheda_esercizio_id, testo')
    .eq('sessione_id', id)

  const noteMap: Record<string, string> = {}
  for (const n of (noteData ?? [])) {
    noteMap[n.scheda_esercizio_id] = n.testo
  }

  // Raggruppa i log per esercizio e ordinali
  const logSerie = (sessione as any).log_serie ?? []
  type EseGroup = {
    id: string
    nome: string
    ordine: number
    tipo: string
    note: string | null
    ripetizioni: string
    peso_consigliato_kg: number | null
    tut: string | null
    serie: {
      numero_serie: number
      peso_kg: number | null
      ripetizioni: number | null
      reps_sx: number | null
      reps_dx: number | null
      durata_secondi: number | null
      rpe: number | null
      rir: number | null
      completata: boolean
    }[]
  }

  const eseMap = new Map<string, EseGroup>()
  for (const log of logSerie) {
    const ese = log.scheda_esercizi
    if (!ese) continue
    const eseId = ese.id
    if (!eseMap.has(eseId)) {
      eseMap.set(eseId, {
        id: eseId,
        nome: ese.esercizi?.nome ?? '—',
        ordine: ese.ordine ?? 0,
        tipo: ese.tipo ?? 'standard',
        note: ese.note ?? null,
        ripetizioni: ese.ripetizioni ?? '—',
        peso_consigliato_kg: ese.peso_consigliato_kg ?? null,
        tut: ese.tut ?? null,
        serie: [],
      })
    }
    eseMap.get(eseId)!.serie.push({
      numero_serie: log.numero_serie,
      peso_kg: log.peso_kg,
      ripetizioni: log.ripetizioni,
      reps_sx: log.reps_sx,
      reps_dx: log.reps_dx,
      durata_secondi: log.durata_secondi,
      rpe: log.rpe,
      rir: log.rir,
      completata: log.completata,
    })
  }

  const esercizi = Array.from(eseMap.values())
    .sort((a, b) => a.ordine - b.ordine)
    .map(e => ({ ...e, serie: e.serie.sort((a, b) => a.numero_serie - b.numero_serie) }))

  const dataSessione = new Date((sessione as any).data).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const formatDurata = (sec: number | null) => {
    if (!sec) return null
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return h > 0 ? `${h}h ${m}min` : `${m}min`
  }

  const TIPO_COLORS: Record<string, { color: string; label: string }> = {
    superset:    { color: 'oklch(0.60 0.15 200)', label: 'Superset' },
    giant_set:   { color: 'oklch(0.65 0.20 280)', label: 'Giant Set' },
    dropset:     { color: 'oklch(0.70 0.19 46)',  label: 'Dropset' },
    rest_pause:  { color: 'oklch(0.65 0.15 300)', label: 'Rest-Pause' },
    piramidale:  { color: 'oklch(0.85 0.12 80)',  label: 'Piramidale' },
    amrap:       { color: 'oklch(0.70 0.18 330)', label: 'AMRAP' },
    emom:        { color: 'oklch(0.65 0.18 180)', label: 'EMOM' },
    max_reps:    { color: 'oklch(0.75 0.15 60)',  label: 'Max+Total' },
    jump_set:    { color: 'oklch(0.65 0.20 280)', label: 'Jump Set' },
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <Link href={`/coach/clienti/${(sessione as any).cliente_id}/analytics`}
        className="inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
        style={{ color: 'oklch(0.60 0.15 200)' }}>
        ← {clienteProfile?.full_name ?? 'Cliente'}
      </Link>

      {/* Header sessione */}
      <div className="rounded-2xl px-5 py-4"
        style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: 'oklch(0.50 0 0)' }}>Sessione</p>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'oklch(0.97 0 0)' }}>
              {(sessione as any).scheda_giorni?.nome ?? 'Allenamento'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)' }}>{dataSessione}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                background: (sessione as any).completata ? 'oklch(0.65 0.18 150 / 15%)' : 'oklch(0.70 0.19 46 / 15%)',
                color: (sessione as any).completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.70 0.19 46)',
              }}>
              {(sessione as any).completata ? '✓ Completata' : 'In corso'}
            </span>
            {formatDurata((sessione as any).durata_secondi) && (
              <p className="text-xs mt-1.5" style={{ color: 'oklch(0.45 0 0)' }}>
                ⏱ {formatDurata((sessione as any).durata_secondi)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Esercizi */}
      {esercizi.length === 0 ? (
        <div className="rounded-2xl py-12 text-center"
          style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
          <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Nessun log registrato per questa sessione</p>
        </div>
      ) : esercizi.map((ese, eseIdx) => {
        const tipoColor = TIPO_COLORS[ese.tipo]
        const notaCliente = noteMap[ese.id]
        const serieCompletate = ese.serie.filter(s => s.completata).length
        const tutteCompletate = serieCompletate === ese.serie.length && ese.serie.length > 0

        return (
          <div key={ese.id} className="rounded-2xl overflow-hidden"
            style={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(1 0 0 / 6%)' }}>
            {/* Header esercizio */}
            <div className="px-4 py-3 flex items-start gap-3"
              style={{ borderBottom: '1px solid oklch(1 0 0 / 6%)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{
                  background: tutteCompletate ? 'oklch(0.65 0.18 150 / 20%)' : 'oklch(0.60 0.15 200 / 15%)',
                  color: tutteCompletate ? 'oklch(0.65 0.18 150)' : 'oklch(0.60 0.15 200)',
                }}>
                {tutteCompletate ? '✓' : eseIdx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>{ese.nome}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className="text-xs" style={{ color: 'oklch(0.50 0 0)' }}>
                    {ese.ripetizioni} reps · {serieCompletate}/{ese.serie.length} serie
                  </span>
                  {tipoColor && ese.tipo !== 'standard' && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: `${tipoColor.color} / 15%`, color: tipoColor.color }}>
                      {tipoColor.label}
                    </span>
                  )}
                  {ese.peso_consigliato_kg != null && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: 'oklch(0.60 0.15 200 / 12%)', color: 'oklch(0.60 0.15 200)' }}>
                      ~{ese.peso_consigliato_kg}kg
                    </span>
                  )}
                  {ese.tut && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: 'oklch(0.65 0.15 300 / 15%)', color: 'oklch(0.65 0.15 300)' }}>
                      TUT {ese.tut}
                    </span>
                  )}
                </div>
                {ese.note && (
                  <p className="text-xs mt-1 leading-snug" style={{ color: 'oklch(0.70 0.19 46)', whiteSpace: 'pre-line' }}>
                    📝 {ese.note}
                  </p>
                )}
              </div>
            </div>

            {/* Nota cliente */}
            {notaCliente && (
              <div className="px-4 py-2.5 flex items-start gap-2"
                style={{ borderBottom: '1px solid oklch(1 0 0 / 5%)', background: 'oklch(0.70 0.19 46 / 5%)' }}>
                <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>📝</span>
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'oklch(0.70 0.19 46)' }}>
                    Nota del cliente
                  </p>
                  <p className="text-xs leading-snug" style={{ color: 'oklch(0.72 0 0)', whiteSpace: 'pre-line' }}>
                    {notaCliente}
                  </p>
                </div>
              </div>
            )}

            {/* Serie */}
            {ese.serie.length > 0 && (
              <div>
                {ese.serie.map((s, si) => (
                  <div key={si} className="px-4 py-2.5 flex items-center gap-3"
                    style={{
                      borderBottom: si < ese.serie.length - 1 ? '1px solid oklch(1 0 0 / 4%)' : 'none',
                      background: s.completata ? 'oklch(0.65 0.18 150 / 4%)' : 'transparent',
                    }}>
                    <span className="text-xs font-bold w-14 flex-shrink-0"
                      style={{ color: s.completata ? 'oklch(0.65 0.18 150)' : 'oklch(0.40 0 0)' }}>
                      {s.completata ? '✓' : '○'} S{s.numero_serie}
                    </span>
                    <span className="text-sm font-bold flex-1" style={{ color: s.completata ? 'oklch(0.90 0 0)' : 'oklch(0.50 0 0)' }}>
                      {s.peso_kg != null ? `${s.peso_kg} kg × ` : ''}
                      {s.ripetizioni != null ? `${s.ripetizioni} reps` : ''}
                      {s.reps_sx != null && s.reps_dx != null ? `${s.reps_sx}↑ / ${s.reps_dx}↑` : ''}
                      {s.durata_secondi != null ? `${s.durata_secondi}s` : ''}
                      {!s.peso_kg && !s.ripetizioni && !s.reps_sx && !s.durata_secondi ? '—' : ''}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.rpe != null && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
                          RPE {s.rpe}
                        </span>
                      )}
                      {s.rir != null && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
                          RIR {s.rir}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
