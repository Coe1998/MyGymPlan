'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Giorno { id: string; nome: string; ordine: number }
interface Scheda { id: string; nome: string; descrizione: string | null; scheda_giorni: Giorno[] }
interface Assegnazione {
  id: string; data_inizio: string; data_fine: string | null
  pdf_alimentare_url: string | null; schede: Scheda | null
}

export default function SchedeSelector({ assegnazioni }: { assegnazioni: Assegnazione[] }) {
  const [idx, setIdx] = useState(0)
  const schedaAttiva = assegnazioni[idx]

  if (!schedaAttiva) return (
    <div className="py-16 text-center space-y-3">
      <p className="text-5xl">📋</p>
      <p className="font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>Nessuna scheda assegnata</p>
      <p className="text-sm" style={{ color: 'oklch(0.45 0 0)' }}>Il tuo coach non ti ha ancora assegnato una scheda</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Tab selezione scheda — solo se più di una */}
      {assegnazioni.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-6 pt-4 scrollbar-none">
          {assegnazioni.map((a, i) => (
            <button key={a.id} onClick={() => setIdx(i)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
              style={{
                background: idx === i ? 'oklch(0.60 0.15 200)' : 'oklch(0.22 0 0)',
                color: idx === i ? 'oklch(0.97 0 0)' : 'oklch(0.55 0 0)',
              }}>
              {a.schede?.nome ?? `Scheda ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="px-6 pb-6 space-y-4">
        {/* Info scheda */}
        <div>
          <h3 className="text-xl font-bold" style={{ color: 'oklch(0.97 0 0)' }}>
            {schedaAttiva.schede?.nome}
          </h3>
          {schedaAttiva.schede?.descrizione && (
            <p className="text-sm mt-1" style={{ color: 'oklch(0.50 0 0)' }}>
              {schedaAttiva.schede.descrizione}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: 'oklch(0.40 0 0)' }}>
            Attiva dal {new Date(schedaAttiva.data_inizio).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            {schedaAttiva.data_fine ? ` · Scade il ${new Date(schedaAttiva.data_fine).toLocaleDateString('it-IT')}` : ''}
          </p>
        </div>

        {/* Giorni */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {schedaAttiva.schede?.scheda_giorni
            ?.sort((a, b) => a.ordine - b.ordine)
            .map((giorno) => (
              <Link key={giorno.id}
                href={`/cliente/allenamento?giorno=${giorno.id}&assegnazione=${schedaAttiva.id}`}
                className="p-4 rounded-xl transition-all hover:opacity-80 active:scale-95"
                style={{ background: 'oklch(0.22 0 0)', border: '1px solid oklch(1 0 0 / 8%)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mb-2"
                  style={{ background: 'oklch(0.60 0.15 200 / 20%)', color: 'oklch(0.60 0.15 200)' }}>
                  {giorno.ordine + 1}
                </div>
                <p className="text-sm font-semibold" style={{ color: 'oklch(0.97 0 0)' }}>{giorno.nome}</p>
                <p className="text-xs mt-1" style={{ color: 'oklch(0.60 0.15 200)' }}>Inizia →</p>
              </Link>
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
              <p className="font-semibold text-sm" style={{ color: 'oklch(0.97 0 0)' }}>Scheda alimentare</p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0 0)' }}>Apri il PDF del tuo coach →</p>
            </div>
          </a>
        )}
      </div>
    </div>
  )
}
