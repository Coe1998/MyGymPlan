'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye } from '@fortawesome/free-solid-svg-icons'

interface Giorno { id: string; nome: string; ordine: number }
interface Scheda { id: string; nome: string; descrizione: string | null; scheda_giorni: Giorno[] }
interface Assegnazione {
  id: string; data_inizio: string; data_fine: string | null; attiva: boolean
  pdf_alimentare_url: string | null; schede: Scheda | null
}

export default function SchedeSelector({ assegnazioni }: { assegnazioni: Assegnazione[] }) {
  // Ordina: attive prima, poi future, poi inattive/scadute
  const assegnazioniOrdinate = [...assegnazioni]
  .filter(a => {
    const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
    const dataInizio = new Date(a.data_inizio); dataInizio.setHours(0, 0, 0, 0)
    return dataInizio <= oggi   // 👈 escludi schede future (confronto locale, no timezone drift)
  })
  .sort((a, b) => {
    const oggi = new Date(); oggi.setHours(0,0,0,0)
    const aFutura = new Date(a.data_inizio) > oggi
    const bFutura = new Date(b.data_inizio) > oggi
    if (a.attiva && !aFutura && (!b.attiva || bFutura)) return -1
    if (b.attiva && !bFutura && (!a.attiva || aFutura)) return 1
    return 0
  })
  const [idx, setIdx] = useState(0)
  const schedaAttiva = assegnazioniOrdinate[idx]

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)

  const getStatoScheda = (a: Assegnazione) => {
    const dataInizio = new Date(a.data_inizio)
    dataInizio.setHours(0, 0, 0, 0)
    const dataFine = a.data_fine ? new Date(a.data_fine) : null
    if (dataFine) dataFine.setHours(23, 59, 59, 999)

    if (!a.attiva) return { tipo: 'inattiva', label: 'Scheda non più attiva', color: 'oklch(0.65 0.22 27)', bg: 'oklch(0.65 0.22 27 / 12%)', border: 'oklch(0.65 0.22 27 / 25%)', accessibile: false }
    if (dataInizio > oggi) return { tipo: 'futura', label: `Attiva dal ${dataInizio.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`, color: 'oklch(0.75 0.18 80)', bg: 'oklch(0.75 0.18 80 / 12%)', border: 'oklch(0.75 0.18 80 / 25%)', accessibile: false }
    if (dataFine && dataFine < oggi) return { tipo: 'scaduta', label: `Scaduta il ${dataFine.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`, color: 'oklch(0.65 0.22 27)', bg: 'oklch(0.65 0.22 27 / 12%)', border: 'oklch(0.65 0.22 27 / 25%)', accessibile: false }
    return { tipo: 'attiva', label: null, color: 'oklch(0.65 0.18 150)', bg: null, border: null, accessibile: true }
  }

  if (!schedaAttiva) return (
    <div className="py-16 text-center space-y-3">
      <p className="text-5xl">📋</p>
      <p className="font-semibold" style={{ color: 'var(--c-97)' }}>Nessuna scheda assegnata</p>
      <p className="text-sm" style={{ color: 'var(--c-45)' }}>Il tuo coach non ti ha ancora assegnato una scheda</p>
    </div>
  )

  const stato = getStatoScheda(schedaAttiva)

  return (
    <div className="space-y-4">
      {/* Tab selezione scheda — solo se più di una */}
      {assegnazioni.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-6 pt-4 scrollbar-none">
          {assegnazioniOrdinate.map((a, i) => (
            <button key={a.id} onClick={() => setIdx(i)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
              style={{
                background: idx === i ? 'oklch(0.60 0.15 200)' : 'var(--c-22)',
                color: idx === i ? 'var(--c-97)' : 'var(--c-55)',
              }}>
              {a.schede?.nome ?? `Scheda ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="px-6 pb-6 space-y-4">
        {/* Hint stato scheda */}
        {stato.label && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: stato.bg!, border: `1px solid ${stato.border!}`, color: stato.color }}>
            <span>{stato.tipo === 'futura' ? '🕐' : '⚠️'}</span>
            {stato.label}
          </div>
        )}

        {/* Info scheda */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold" style={{ color: 'var(--c-97)' }}>
              {schedaAttiva.schede?.nome}
            </h3>
            {schedaAttiva.schede?.id && (
              <Link href={`/cliente/schede/${schedaAttiva.schede.id}`}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:opacity-70"
                style={{ background: 'oklch(0.60 0.15 200 / 15%)', color: 'oklch(0.60 0.15 200)' }}
                title="Visualizza scheda">
                <FontAwesomeIcon icon={faEye} style={{ fontSize: 12 }} />
              </Link>
            )}
          </div>
          {schedaAttiva.schede?.descrizione && (
            <p className="text-sm mt-1" style={{ color: 'var(--c-50)' }}>
              {schedaAttiva.schede.descrizione}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--c-40)' }}>
            Attiva dal {new Date(schedaAttiva.data_inizio).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            {schedaAttiva.data_fine ? ` · Scade il ${new Date(schedaAttiva.data_fine).toLocaleDateString('it-IT')}` : ''}
          </p>
        </div>

        {/* Giorni */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {schedaAttiva.schede?.scheda_giorni
            ?.sort((a, b) => a.ordine - b.ordine)
            .map((giorno) => stato.accessibile ? (
              <Link key={giorno.id}
                href={`/cliente/allenamento?giorno=${giorno.id}&assegnazione=${schedaAttiva.id}`}
                className="p-4 rounded-xl transition-all hover:opacity-80 active:scale-95"
                style={{ background: 'var(--c-22)', border: '1px solid var(--c-w8)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mb-2"
                  style={{ background: 'oklch(0.60 0.15 200 / 20%)', color: 'oklch(0.60 0.15 200)' }}>
                  {giorno.ordine + 1}
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--c-97)' }}>{giorno.nome}</p>
                <p className="text-xs mt-1" style={{ color: 'oklch(0.60 0.15 200)' }}>Inizia →</p>
              </Link>
            ) : (
              <div key={giorno.id}
                className="p-4 rounded-xl"
                style={{ background: 'var(--c-18)', border: '1px solid var(--c-w5)', opacity: 0.5, cursor: 'not-allowed' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mb-2"
                  style={{ background: 'var(--c-25)', color: 'var(--c-45)' }}>
                  {giorno.ordine + 1}
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--c-60)' }}>{giorno.nome}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--c-40)' }}>🔒 Non disponibile</p>
              </div>
            ))}
        </div>

        {/* PDF */}
        {schedaAttiva.pdf_alimentare_url && (
          <a href={schedaAttiva.pdf_alimentare_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl transition-all hover:opacity-80 active:scale-95"
            style={{ background: 'oklch(0.65 0.18 150 / 8%)', border: '1px solid oklch(0.65 0.18 150 / 25%)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'oklch(0.65 0.18 150 / 20%)', color: 'oklch(0.65 0.18 150)' }}>
              📄
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--c-97)' }}>Scheda alimentare</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--c-50)' }}>Apri il PDF del tuo coach →</p>
            </div>
          </a>
        )}
      </div>
    </div>
  )
}
