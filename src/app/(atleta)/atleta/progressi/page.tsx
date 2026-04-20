'use client'

import { useEffect, useState, useMemo } from 'react'
import BynariLoader from '@/components/shared/BynariLoader'
import { createClient } from '@/lib/supabase/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLock, faChartLine, faWeightScale, faCamera,
  faRocket, faCircleCheck, faDumbbell, faHeartPulse, faListCheck,
} from '@fortawesome/free-solid-svg-icons'
import ProgressioneEsercizi from '@/components/coach/analytics/ProgressioneEsercizi'
import MassimoMuscoli from '@/components/coach/analytics/MassimoMuscoli'
import AndamentoPeso from '@/components/coach/analytics/AndamentoPeso'
import PatternBenessere from '@/components/coach/analytics/PatternBenessere'
import StoricoSessioni from '@/components/coach/analytics/StoricoSessioni'

type Tab = 'allenamento' | 'corpo' | 'benessere' | 'storico'

const TABS: { key: Tab; label: string; icon: typeof faDumbbell }[] = [
  { key: 'allenamento', label: 'Esercizi', icon: faDumbbell },
  { key: 'corpo', label: 'Corpo', icon: faWeightScale },
  { key: 'benessere', label: 'Benessere', icon: faHeartPulse },
  { key: 'storico', label: 'Storico', icon: faListCheck },
]

const FEATURES_PRO = [
  { icon: faChartLine, label: 'Grafici progressione pesi', desc: 'Vedi il tuo 1RM stimato crescere nel tempo' },
  { icon: faWeightScale, label: 'Misurazioni corporee', desc: 'Traccia peso, BF% e circonferenze' },
  { icon: faCamera, label: 'Foto progressi', desc: 'Confronta la tua forma nel tempo' },
]

export default function AtletaProgressiPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [assegnazioni, setAssegnazioni] = useState<{ id: string; schede: { id: string; nome: string } | null }[]>([])
  const [tab, setTab] = useState<Tab>('allenamento')

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles').select('piano').eq('id', user.id).maybeSingle()
      const pro = profile?.piano === 'pro'
      setIsPro(pro)

      if (pro) {
        const { data: ass } = await supabase
          .from('assegnazioni')
          .select('id, schede ( id, nome )')
          .eq('cliente_id', user.id)
          .eq('coach_id', user.id)
        setAssegnazioni((ass as any) ?? [])
      }

      setLoading(false)
    }
    fetch()
  }, [supabase])

  if (loading) return <BynariLoader file="blue" size={80} />

  if (!isPro) {
    return (
      <div className="space-y-8 max-w-lg mx-auto pt-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl mx-auto"
            style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
            <FontAwesomeIcon icon={faLock} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'oklch(0.70 0.19 46)' }}>
              Funzionalità Pro
            </p>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--c-97)' }}>
              Traccia i tuoi progressi
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--c-55)' }}>
              I progressi avanzati sono disponibili con il piano Pro.
              Sblocca grafici, misurazioni e foto per vedere davvero quanto sei migliorato.
            </p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--c-18)', border: '1px solid var(--c-w6)' }}>
          {FEATURES_PRO.map((f, i) => (
            <div key={f.label} className="flex items-center gap-4 px-5 py-4"
              style={{ borderBottom: i < FEATURES_PRO.length - 1 ? '1px solid var(--c-w4)' : 'none' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'oklch(0.70 0.19 46 / 15%)', color: 'oklch(0.70 0.19 46)' }}>
                <FontAwesomeIcon icon={f.icon} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--c-97)' }}>{f.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--c-50)' }}>{f.desc}</p>
              </div>
              <FontAwesomeIcon icon={faCircleCheck} className="ml-auto flex-shrink-0"
                style={{ color: 'oklch(0.70 0.19 46)' }} />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => alert('Stripe in arrivo — stay tuned!')}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: 'oklch(0.70 0.19 46)', color: 'var(--c-13)' }}>
            <FontAwesomeIcon icon={faRocket} />
            Passa a Pro
          </button>
          <p className="text-center text-xs" style={{ color: 'var(--c-40)' }}>
            Disponibile a breve · Nessun addebito ora
          </p>
        </div>
      </div>
    )
  }

  if (!userId) return null

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--c-97)' }}>Progressi</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--c-50)' }}>Analisi dei tuoi allenamenti</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all"
            style={{
              background: tab === t.key ? 'oklch(0.70 0.19 46)' : 'var(--c-18)',
              color: tab === t.key ? 'var(--c-13)' : 'var(--c-55)',
              border: tab === t.key ? 'none' : '1px solid var(--c-w6)',
            }}>
            <FontAwesomeIcon icon={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'allenamento' && (
        <div className="space-y-6">
          <ProgressioneEsercizi clienteId={userId} assegnazioni={assegnazioni} />
          <MassimoMuscoli clienteId={userId} />
        </div>
      )}

      {tab === 'corpo' && (
        <AndamentoPeso clienteId={userId} />
      )}

      {tab === 'benessere' && (
        <PatternBenessere clienteId={userId} />
      )}

      {tab === 'storico' && (
        <StoricoSessioni clienteId={userId} />
      )}
    </div>
  )
}
