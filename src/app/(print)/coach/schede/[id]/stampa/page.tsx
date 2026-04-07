import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface SchedaEsercizio {
  id: string
  ordine: number
  serie: number
  ripetizioni: string
  recupero_secondi: number
  note: string | null
  tipo: string
  gruppo_id: string | null
  progressione_tipo: string | null
  esercizi: {
    nome: string
    muscoli: string[] | null
    tipo_input: string
  } | null
}

interface Giorno {
  id: string
  nome: string
  ordine: number
  warmup_note: string | null
  scheda_esercizi: SchedaEsercizio[]
}

interface Scheda {
  id: string
  nome: string
  descrizione: string | null
  richiede_rpe: boolean
  richiede_rir: boolean
}

export default async function StampaSchedaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheda } = await supabase
    .from('schede')
    .select('id, nome, descrizione, richiede_rpe, richiede_rir')
    .eq('id', id)
    .eq('coach_id', user.id)
    .single()

  if (!scheda) redirect('/coach/schede')

  const { data: giorni } = await supabase
    .from('scheda_giorni')
    .select(`
      id, nome, ordine, warmup_note,
      scheda_esercizi (
        id, ordine, serie, ripetizioni, recupero_secondi, note, tipo, gruppo_id, progressione_tipo,
        esercizi!scheda_esercizi_esercizio_id_fkey ( nome, muscoli, tipo_input )
      )
    `)
    .eq('scheda_id', id)
    .order('ordine')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const TIPO_LABELS: Record<string, string> = {
    superset: 'Superset',
    giant_set: 'Giant Set',
    dropset: 'Dropset',
    rest_pause: 'Rest-Pause',
    piramidale: 'Piramidale',
  }

  const formatRecupero = (sec: number) => {
    if (sec >= 60) return `${Math.floor(sec / 60)}min${sec % 60 > 0 ? ` ${sec % 60}s` : ''}`
    return `${sec}s`
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          background: white !important;
          color: #111 !important;
          margin: 0;
          padding: 0;
        }
        .page {
          max-width: 780px;
          margin: 0 auto;
          padding: 40px 32px;
        }
        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 2px solid #111;
          padding-bottom: 16px;
          margin-bottom: 28px;
        }
        .scheda-nome {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .scheda-desc {
          font-size: 13px;
          color: #555;
          margin-top: 4px;
        }
        .meta {
          text-align: right;
          font-size: 12px;
          color: #666;
        }
        .meta strong {
          color: #111;
          display: block;
          font-size: 13px;
        }
        .badges {
          display: flex;
          gap: 6px;
          margin-top: 6px;
          justify-content: flex-end;
        }
        .badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
          border: 1px solid #ddd;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .giorno {
          margin-bottom: 28px;
          page-break-inside: avoid;
        }
        .giorno-header {
          background: #111;
          color: white;
          padding: 8px 14px;
          border-radius: 8px 8px 0 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .giorno-nome {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.2px;
        }
        .giorno-count {
          font-size: 11px;
          opacity: 0.6;
        }
        .warmup-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-top: none;
          padding: 8px 14px;
          font-size: 12px;
          color: #166534;
        }
        .warmup-title {
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }
        .warmup-serie {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .warmup-serie-item {
          font-size: 11px;
          background: #dcfce7;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .esercizi-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
          overflow: hidden;
        }
        .esercizi-table thead tr {
          background: #f9fafb;
        }
        .esercizi-table th {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          padding: 7px 10px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .esercizi-table td {
          font-size: 12px;
          padding: 8px 10px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: top;
        }
        .esercizi-table tr:last-child td {
          border-bottom: none;
        }
        .ese-nome {
          font-weight: 700;
          font-size: 13px;
          color: #111;
        }
        .ese-muscoli {
          font-size: 10px;
          color: #9ca3af;
          margin-top: 2px;
        }
        .ese-note {
          font-size: 11px;
          color: #6b7280;
          font-style: italic;
          margin-top: 3px;
        }
        .tipo-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
          background: #f3f4f6;
          color: #374151;
          display: inline-block;
          margin-top: 3px;
        }
        .group-separator {
          background: #f9fafb;
        }
        .group-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          padding: 4px 10px;
        }
        .log-box {
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          width: 100%;
          min-height: 22px;
          display: inline-block;
        }
        .footer {
          margin-top: 32px;
          border-top: 1px solid #e5e7eb;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #9ca3af;
        }
        .print-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #111;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 999;
        }
        .print-btn:hover { background: #333; }
        @media print {
          .print-btn { display: none !important; }
          body { padding: 0; }
          .page { padding: 20px 24px; max-width: 100%; }
          .giorno { page-break-inside: avoid; }
        }
      `}</style>

      <div className="page">
        {/* Header */}
        <div className="header">
          <div>
            <h1 className="scheda-nome">{scheda.nome}</h1>
            {scheda.descrizione && (
              <p className="scheda-desc">{scheda.descrizione}</p>
            )}
          </div>
          <div className="meta">
            <strong>{profile?.full_name ?? 'Coach'}</strong>
            {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            <div className="badges">
              {scheda.richiede_rpe && <span className="badge">RPE</span>}
              {scheda.richiede_rir && <span className="badge">RIR</span>}
              <span className="badge">{(giorni?.length ?? 0)} giorni</span>
            </div>
          </div>
        </div>

        {/* Giorni */}
        {(giorni as any[])?.map((giorno: Giorno) => {
          const eserciziOrdinati = [...(giorno.scheda_esercizi ?? [])].sort((a, b) => a.ordine - b.ordine)

          const gruppoLabelMap = new Map<string, string>()
          const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
          for (const ese of eserciziOrdinati) {
            if (ese.gruppo_id && !gruppoLabelMap.has(ese.gruppo_id)) {
              gruppoLabelMap.set(ese.gruppo_id, letters[gruppoLabelMap.size % 26])
            }
          }

          return (
            <div key={giorno.id} className="giorno">
              <div className="giorno-header">
                <span className="giorno-nome">{giorno.nome}</span>
                <span className="giorno-count">{eserciziOrdinati.length} esercizi</span>
              </div>

              {/* Warmup */}
              {giorno.warmup_note && (
                <div className="warmup-box">
                  <div className="warmup-title">Warmup generale</div>
                  <div>{giorno.warmup_note}</div>
                </div>
              )}

              <table className="esercizi-table">
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>#</th>
                    <th>Esercizio</th>
                    <th style={{ width: '60px' }}>Serie</th>
                    <th style={{ width: '70px' }}>Reps</th>
                    <th style={{ width: '70px' }}>Recupero</th>
                    {(scheda.richiede_rpe || scheda.richiede_rir) && (
                      <th style={{ width: '60px' }}>{scheda.richiede_rpe ? 'RPE' : 'RIR'}</th>
                    )}
                    <th style={{ width: '120px' }}>Log allenamento</th>
                  </tr>
                </thead>
                <tbody>
                  {eserciziOrdinati.map((ese, i) => {
                    const tipoLabel = TIPO_LABELS[ese.tipo] ?? null
                    const gruppoLabel = ese.gruppo_id ? gruppoLabelMap.get(ese.gruppo_id) : null
                    const prevEse = eserciziOrdinati[i - 1]
                    const isFirstInGroup = ese.gruppo_id && (!prevEse || prevEse.gruppo_id !== ese.gruppo_id)

                    return (
                      <>
                        {isFirstInGroup && (
                          <tr key={`sep-${ese.id}`} className="group-separator">
                            <td colSpan={scheda.richiede_rpe || scheda.richiede_rir ? 7 : 6} className="group-label">
                              {gruppoLabel} — {tipoLabel}
                            </td>
                          </tr>
                        )}
                        <tr key={ese.id}>
                          <td style={{ color: '#9ca3af', fontWeight: 700 }}>{i + 1}</td>
                          <td>
                            <div className="ese-nome">
                              {gruppoLabel && <span style={{ marginRight: 6, color: '#6b7280' }}>{gruppoLabel}.</span>}
                              {ese.esercizi?.nome ?? '—'}
                            </div>
                            {ese.esercizi?.muscoli && ese.esercizi.muscoli.length > 0 && (
                              <div className="ese-muscoli">{ese.esercizi.muscoli.join(' · ')}</div>
                            )}
                            {ese.note && <div className="ese-note">&ldquo;{ese.note}&rdquo;</div>}
                            {ese.progressione_tipo && ese.progressione_tipo !== 'nessuna' && (
                              <span className="tipo-badge">{ese.progressione_tipo}</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 700, fontSize: 14 }}>{ese.serie}</td>
                          <td style={{ fontWeight: 700, fontSize: 14 }}>
                            {ese.esercizi?.tipo_input === 'timer' ? `${ese.ripetizioni}s` : ese.ripetizioni}
                          </td>
                          <td style={{ color: '#6b7280' }}>{formatRecupero(ese.recupero_secondi)}</td>
                          {(scheda.richiede_rpe || scheda.richiede_rir) && (
                            <td><span className="log-box" /></td>
                          )}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {Array.from({ length: ese.serie }).map((_, si) => (
                                <div key={si} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 10, color: '#9ca3af' }}>
                                  <span>{si + 1}.</span>
                                  <span className="log-box" style={{ flex: 1, minHeight: 18 }} />
                                  <span>kg</span>
                                  <span className="log-box" style={{ flex: 1, minHeight: 18 }} />
                                  <span>{ese.esercizi?.tipo_input === 'timer' ? 's' : 'reps'}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}

        {/* Footer */}
        <div className="footer">
          <span>Bynari — {profile?.full_name ?? ''}</span>
          <span>{scheda.nome} · {new Date().toLocaleDateString('it-IT')}</span>
        </div>
      </div>

      {/* Pulsante stampa fisso */}
      <button className="print-btn">
        Stampa / Salva PDF
      </button>

      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelector('.print-btn').addEventListener('click', () => window.print())
      `}} />
    </>
  )
}
