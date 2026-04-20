'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  clienteId: string
  frequenzaDichiarata?: number | null
  obiettivo?: string | null
}

interface Insight {
  tipo: 'warning' | 'info' | 'tip'
  titolo: string
  testo: string
  categoria: 'aderenza' | 'forza' | 'volume' | 'benessere' | 'peso' | 'nutrizione'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

function epley(peso: number, reps: number) {
  if (reps === 1) return peso
  return Math.round(peso * (1 + reps / 30))
}

export default function ClienteInsights({ clienteId, frequenzaDichiarata, obiettivo }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const compute = async () => {
      setLoading(true)
      const now = new Date()
      const da90 = new Date(now.getTime() - 90 * 86400000).toISOString()
      const da30 = new Date(now.getTime() - 30 * 86400000).toISOString()
      // Formato YYYY-MM-DD per la query sulla colonna 'data'
      const da30Date = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]

      // ── Fetch dati ───────────────────────────────────────────────────────────

      const [sessRes, logRes, checkinRes, pesoRes, macroRes, anamnesiRes] = await Promise.all([
        supabase.from('sessioni')
          .select('id, data, completata, durata_secondi')
          .eq('cliente_id', clienteId)
          .eq('completata', true)
          .gte('data', da90)
          .order('data'),
        supabase.from('log_serie')
          .select(`
            peso_kg, ripetizioni, completata,
            sessione_id,
            scheda_esercizi!inner(
              esercizi!scheda_esercizi_esercizio_id_fkey(id, nome, muscoli, tipo_input)
            )
          `)
          .in('sessione_id',
            (await supabase.from('sessioni').select('id')
              .eq('cliente_id', clienteId).eq('completata', true).gte('data', da90)).data?.map(s => s.id) ?? []
          )
          .eq('completata', true),
        supabase.from('checkin_giornalieri')
          .select('energia, stress, motivazione, created_at')
          .eq('cliente_id', clienteId)
          .gte('created_at', da30)
          .order('created_at'),
        supabase.from('misurazioni')
          .select('peso_kg, data')
          .eq('cliente_id', clienteId)
          .gte('data', da90)
          .order('data'),
        supabase.from('pasto_log') // CORRETTO: Nome tabella
          .select('calorie, data')   // CORRETTO: Campi tabella
          .eq('cliente_id', clienteId)
          .gte('data', da30Date)      // CORRETTO: Filtro su colonna data
          .order('data'),
        supabase.from('anamnesi')
          .select('allenamenti_settimana, ore_sonno, descrizione_caratteriale')
          .eq('cliente_id', clienteId)
          .maybeSingle(),
      ])

      const sessioni = sessRes.data ?? []
      const logs = (logRes.data ?? []) as any[]
      const checkin = checkinRes.data ?? []
      const peso = pesoRes.data ?? []
      const logPasto = macroRes.data ?? []
      const anamnesi = anamnesiRes.data

      const result: Insight[] = []

      // ── 1. ADERENZA FREQUENZA ────────────────────────────────────────────────
      const freqDichiarata = frequenzaDichiarata ?? anamnesi?.allenamenti_settimana ?? null
      const freqReale = sessioni.length / 12.86 

      if (freqDichiarata !== null && freqDichiarata > 0) {
        const scarto = freqReale / freqDichiarata
        if (scarto < 0.6) {
          result.push({
            tipo: 'warning', categoria: 'aderenza',
            titolo: 'Grande scarto dichiarato/reale',
            testo: `Si allena ${freqReale.toFixed(1)}x/settimana ma dichiara ${freqDichiarata}x. Gap del ${Math.round((1 - scarto) * 100)}% — verificare la reale disponibilità e ridimensionare la scheda`,
          })
        } else if (scarto < 0.8) {
          result.push({
            tipo: 'info', categoria: 'aderenza',
            titolo: 'Frequenza inferiore al dichiarato',
            testo: `Si allena ${freqReale.toFixed(1)}x/settimana vs ${freqDichiarata} dichiarate. Considerare una scheda con meno giorni ma più sostenibile`,
          })
        } else if (scarto > 1.3) {
          result.push({
            tipo: 'tip', categoria: 'aderenza',
            titolo: 'Frequenza superiore al dichiarato',
            testo: `Si allena ${freqReale.toFixed(1)}x/settimana, più del dichiarato (${freqDichiarata}x). Ottima costanza — verificare che il recupero sia adeguato`,
          })
        }
      }

      // ── 2. SESSIONI INCOMPLETE ───────────────────────────────────────────────
      const [totAvviate] = await Promise.all([
        supabase.from('sessioni')
          .select('id', { count: 'exact' })
          .eq('cliente_id', clienteId)
          .gte('data', da90),
      ])
      const totali = (totAvviate.count ?? 0)
      const completate = sessioni.length
      const pctCompletate = pct(completate, totali)
      if (totali > 5 && pctCompletate < 65) {
        result.push({
          tipo: 'warning', categoria: 'aderenza',
          titolo: 'Molte sessioni abbandonate',
          testo: `Solo ${pctCompletate}% delle sessioni avviate vengono completate. Potrebbe indicare sessioni troppo lunghe o volume eccessivo — valutare una riduzione`,
        })
      }

      // ── 3. PAUSE PROLUNGATE ─────────────────────────────────────────────────
      if (sessioni.length >= 2) {
        let maxPausa = 0
        for (let i = 1; i < sessioni.length; i++) {
          const days = (new Date(sessioni[i].data).getTime() - new Date(sessioni[i - 1].data).getTime()) / 86400000
          if (days > maxPausa) maxPausa = days
        }
        if (maxPausa >= 14) {
          result.push({
            tipo: 'warning', categoria: 'aderenza',
            titolo: `Pausa di ${Math.round(maxPausa)} giorni rilevata`,
            testo: `Interruzione di ${Math.round(maxPausa)} giorni negli ultimi 90. Dopo pause >10 giorni ridurre temporaneamente il volume del 20-30% per evitare DOMS eccessivo`,
          })
        }
      }

      // ── 4. VOLUME MUSCOLARE E SQUILIBRI ─────────────────────────────────────
      const volMuscolo: Record<string, number> = {}
      for (const log of logs) {
        const muscoli: string[] = log.scheda_esercizi?.esercizi?.muscoli ?? []
        for (const m of muscoli) {
          volMuscolo[m] = (volMuscolo[m] ?? 0) + 1
        }
      }
      const seriePerSett: Record<string, number> = {}
      for (const [m, s] of Object.entries(volMuscolo)) {
        seriePerSett[m] = Math.round((s / 12.86) * 10) / 10
      }

      const gambe = (seriePerSett['Quadricipiti'] ?? 0) + (seriePerSett['Femorali'] ?? 0) + (seriePerSett['Glutei'] ?? 0)
      const push = (seriePerSett['Petto'] ?? 0) + (seriePerSett['Spalle'] ?? 0) + (seriePerSett['Tricipiti'] ?? 0)
      const pull = (seriePerSett['Dorsali'] ?? 0) + (seriePerSett['Bicipiti'] ?? 0)

      if (gambe < 4 && sessioni.length > 4) {
        result.push({
          tipo: 'warning', categoria: 'volume',
          titolo: 'Volume gambe quasi assente',
          testo: `Solo ${gambe.toFixed(1)} serie/settimana per quadricipiti, femorali e glutei. Squilibrio muscolare e rischio dolori lombari — inserire almeno 6-8 serie/settimana`,
        })
      }

      if (push > 0 && pull > 0 && push / pull > 2.5) {
        result.push({
          tipo: 'warning', categoria: 'volume',
          titolo: 'Squilibrio push/pull',
          testo: `${push.toFixed(1)} serie push vs ${pull.toFixed(1)} serie pull/settimana. Rapporto squilibrato — rischio postura cifotica e problemi spalla. Aumentare volume dorsali`,
        })
      } else if (pull > 0 && push > 0 && pull / push > 2.5) {
        result.push({
          tipo: 'info', categoria: 'volume',
          titolo: 'Volume pull molto superiore al push',
          testo: `${pull.toFixed(1)} serie pull vs ${push.toFixed(1)} serie push/settimana. Insolito — verificare se intenzionale o se mancano esercizi di spinta`,
        })
      }

      // ── 5. PROGRESSIONE FORZA ───────────────────────────────────────────────
      const e1rmEse: Record<string, { prima: number[]; seconda: number[] }> = {}
      const meta = new Date(now.getTime() - 45 * 86400000).toISOString()

      const sessData = sessioni.reduce((acc, s) => {
        acc[s.id] = s.data
        return acc
      }, {} as Record<string, string>)

      for (const log of logs) {
        const ese = log.scheda_esercizi?.esercizi
        if (!ese || ese.tipo_input === 'timer' || ese.tipo_input === 'timer_unilaterale') continue
        const peso_kg = parseFloat(log.peso_kg)
        const reps = parseInt(log.ripetizioni)
        if (!peso_kg || !reps || reps > 30) continue
        const e1rm = epley(peso_kg, reps)
        const nome = ese.nome as string
        if (!e1rmEse[nome]) e1rmEse[nome] = { prima: [], seconda: [] }
        const data = sessData[log.sessione_id]
        if (data && data < meta) {
          e1rmEse[nome].prima.push(e1rm)
        } else {
          e1rmEse[nome].seconda.push(e1rm)
        }
      }

      let cali = 0
      let caloPeso = 0
      for (const [nome, { prima, seconda }] of Object.entries(e1rmEse)) {
        if (prima.length < 2 || seconda.length < 2) continue
        const avgPrima = prima.reduce((a, b) => a + b) / prima.length
        const avgSeconda = seconda.reduce((a, b) => a + b) / seconda.length
        const delta = (avgSeconda - avgPrima) / avgPrima
        if (delta <= -0.08) {
          cali++
          if (delta <= -0.15) {
            result.push({
              tipo: 'warning', categoria: 'forza',
              titolo: `Calo forza significativo: ${nome}`,
              testo: `e1RM su ${nome} calato del ${Math.abs(Math.round(delta * 100))}% nella seconda metà del periodo. Possibile overtraining, recupero insufficiente o tecnica degradata`,
            })
            caloPeso++
          }
        }
      }
      if (cali >= 3 && caloPeso < 2) {
        result.push({
          tipo: 'warning', categoria: 'forza',
          titolo: 'Regressione forza su più esercizi',
          testo: `${cali} esercizi mostrano calo di e1RM negli ultimi 45 giorni. Segnale di overtraining o deficit calorico eccessivo — considerare deload`,
        })
      }

      // ── 6. CHECK-IN BENESSERE ───────────────────────────────────────────────
      if (checkin.length >= 5) {
        const energiaMedia = checkin.reduce((a, c) => a + (c.energia ?? 3), 0) / checkin.length
        const stressMedia = checkin.reduce((a, c) => a + (c.stress ?? 3), 0) / checkin.length
        const motivMedia = checkin.reduce((a, c) => a + (c.motivazione ?? 3), 0) / checkin.length

        if (energiaMedia < 2 && stressMedia > 3.5) {
          result.push({
            tipo: 'warning', categoria: 'benessere',
            titolo: 'Energia bassa + stress elevato',
            testo: `Energia media ${energiaMedia.toFixed(1)}/5 con stress ${stressMedia.toFixed(1)}/5 negli ultimi 30 giorni — combinazione ad alto rischio burnout. Ridurre il volume e aggiungere sessioni di recupero attivo`,
          })
        } else if (energiaMedia < 2) {
          result.push({
            tipo: 'warning', categoria: 'benessere',
            titolo: 'Energia cronicamente bassa',
            testo: `Energia media ${energiaMedia.toFixed(1)}/5 negli ultimi 30 giorni. Controllare sonno, alimentazione e volume settimanale`,
          })
        }

        if (motivMedia > 3.5 && energiaMedia < 2) {
          result.push({
            tipo: 'warning', categoria: 'benessere',
            titolo: 'Segnale overtraining: vuole allenarsi ma il corpo non regge',
            testo: `Motivazione alta (${motivMedia.toFixed(1)}/5) ma energia molto bassa (${energiaMedia.toFixed(1)}/5) — pattern classico di overtraining. Imporre un deload anche se non richiesto`,
          })
        }

        const half = Math.floor(checkin.length / 2)
        const energiaPrima = checkin.slice(0, half).reduce((a, c) => a + (c.energia ?? 3), 0) / half
        const energiaSeconda = checkin.slice(half).reduce((a, c) => a + (c.energia ?? 3), 0) / (checkin.length - half)
        if (energiaSeconda < energiaPrima - 0.8) {
          result.push({
            tipo: 'info', categoria: 'benessere',
            titolo: 'Energia in calo nelle ultime settimane',
            testo: `L'energia si è ridotta da ${energiaPrima.toFixed(1)} a ${energiaSeconda.toFixed(1)}/5 nel corso del mese. Monitorare nelle prossime settimane`,
          })
        }
      }

      // ── 7. PESO E COMPOSIZIONE ──────────────────────────────────────────────
      if (peso.length >= 2) {
        const pesoInizio = peso[0].peso_kg
        const pesoFine = peso[peso.length - 1].peso_kg
        const deltaPeso = pesoFine - pesoInizio
        const settimane = (new Date(peso[peso.length - 1].data).getTime() - new Date(peso[0].data).getTime()) / (7 * 86400000)
        const velKgSett = settimane > 0 ? Math.abs(deltaPeso) / settimane : 0

        if (deltaPeso < 0 && velKgSett > 0.8) {
          result.push({
            tipo: 'warning', categoria: 'peso',
            titolo: 'Calo peso troppo rapido',
            testo: `Perde ${velKgSett.toFixed(2)} kg/settimana — superiore a 0.8 kg/sett. Rischio perdita massa muscolare significativa. Target consigliato: 0.3-0.5 kg/settimana`,
          })
        }

        const obDimagrimento = /dimagrimento|peso/i.test(obiettivo ?? '')
        if (obDimagrimento && deltaPeso > 0.5 && settimane >= 4) {
          result.push({
            tipo: 'warning', categoria: 'peso',
            titolo: 'Peso in aumento con obiettivo dimagrimento',
            testo: `Ha preso ${deltaPeso.toFixed(1)} kg negli ultimi ${Math.round(settimane)} settimane, contrariamente all'obiettivo. Rivedere il piano nutrizionale`,
          })
        }

        if (Math.abs(deltaPeso) < 0.3 && settimane >= 8 && obDimagrimento) {
          result.push({
            tipo: 'info', categoria: 'peso',
            titolo: 'Stallo peso con obiettivo dimagrimento',
            testo: `Peso sostanzialmente invariato (${deltaPeso > 0 ? '+' : ''}${deltaPeso.toFixed(1)} kg in ${Math.round(settimane)} settimane). Rivedere il deficit calorico o variare lo stimolo metabolico`,
          })
        }
      }

      // ── 8. NUTRIZIONE (VERSIONE CORRETTA) ───────────────────────────────────
      if (logPasto.length > 0) {
        // CORRETTO: Conta i giorni distinti usando il campo 'data'
        const giorniLoggati = new Set(logPasto.map(l => l.data)).size
        const pctLog = pct(giorniLoggati, 30)

        if (pctLog < 20) {
          result.push({
            tipo: 'info', categoria: 'nutrizione',
            titolo: 'Tracciamento nutrizionale quasi assente',
            testo: `Loggato solo ${pctLog}% dei giorni del mese. Senza dati è impossibile ottimizzare la nutrizione — incoraggiare almeno 4-5 giorni/settimana`,
          })
        } else {
          const macroTargetRes = await supabase.from('macro_target')
            .select('calorie')
            .eq('cliente_id', clienteId)
            .maybeSingle()
          const target = macroTargetRes.data?.calorie ?? null

          if (target) {
            // CORRETTO: Somma il campo 'calorie' e divide per i giorni loggati
            const kcalTotaliPeriodo = logPasto.reduce((a, l) => a + (Number(l.calorie) ?? 0), 0)
            const kcalMedia = kcalTotaliPeriodo / giorniLoggati

            if (kcalMedia < target * 0.8) {
              result.push({
                tipo: 'warning', categoria: 'nutrizione',
                titolo: 'Apporto calorico molto sotto il target',
                testo: `Mangia in media ${Math.round(kcalMedia)} kcal vs target ${target} kcal (−${Math.round(target - kcalMedia)} kcal). Deficit eccessivo — rischio perdita massa muscolare e fatica cronica`,
              })
            } else if (kcalMedia > target * 1.25 && /dimagrimento/i.test(obiettivo ?? '')) {
              result.push({
                tipo: 'warning', categoria: 'nutrizione',
                titolo: 'Calorie sopra il target con obiettivo dimagrimento',
                testo: `Media ${Math.round(kcalMedia)} kcal vs target ${target} kcal (+${Math.round(kcalMedia - target)} kcal). Il surplus impedisce il dimagrimento`,
              })
            }
          }
        }
      } else {
        result.push({
          tipo: 'tip', categoria: 'nutrizione',
          titolo: 'Nessun dato nutrizionale',
          testo: 'Non ci sono log pasto negli ultimi 30 giorni. Attivare il piano nutrizionale per avere dati su cui lavorare',
        })
      }

      setInsights(result)
      setLoading(false)
    }

    compute()
  }, [clienteId, obiettivo, frequenzaDichiarata, supabase])

  const categoriaLabel: Record<string, string> = {
    aderenza: 'Aderenza',
    forza: 'Forza',
    volume: 'Volume',
    benessere: 'Benessere',
    peso: 'Peso',
    nutrizione: 'Nutrizione',
  }

  const tipoStyle: Record<string, { bg: string; border: string; color: string; dot: string }> = {
    warning: { bg: 'oklch(0.65 0.22 27 / 10%)', border: 'oklch(0.65 0.22 27 / 25%)', color: 'oklch(0.80 0.12 46)', dot: 'oklch(0.75 0.18 27)' },
    info: { bg: 'oklch(0.60 0.15 200 / 10%)', border: 'oklch(0.60 0.15 200 / 25%)', color: 'oklch(0.75 0 0)', dot: 'oklch(0.60 0.15 200)' },
    tip: { bg: 'oklch(0.65 0.18 150 / 10%)', border: 'oklch(0.65 0.18 150 / 25%)', color: 'oklch(0.75 0 0)', dot: 'oklch(0.65 0.18 150)' },
  }

  if (loading) return (
    <div className="py-6 text-center text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
      Analisi in corso...
    </div>
  )

  if (insights.length === 0) return (
    <div className="py-6 text-center text-sm" style={{ color: 'oklch(0.45 0 0)' }}>
      ✓ Nessuna anomalia rilevata negli ultimi 90 giorni
    </div>
  )

  const perCategoria = insights.reduce((acc, ins) => {
    if (!acc[ins.categoria]) acc[ins.categoria] = []
    acc[ins.categoria].push(ins)
    return acc
  }, {} as Record<string, Insight[]>)

  return (
    <div className="space-y-4">
      {Object.entries(perCategoria).map(([cat, items]) => (
        <div key={cat}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'oklch(0.40 0 0)' }}>
            {categoriaLabel[cat] ?? cat}
          </p>
          <div className="space-y-2">
            {items.map((ins, i) => {
              const s = tipoStyle[ins.tipo]
              return (
                <div key={i} className="px-4 py-3 rounded-xl"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: s.dot }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: s.color }}>{ins.titolo}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'oklch(0.60 0 0)' }}>{ins.testo}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}