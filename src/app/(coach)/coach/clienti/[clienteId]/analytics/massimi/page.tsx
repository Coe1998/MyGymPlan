import { use } from 'react'
import Link from 'next/link'
import MassimoMuscoli from '@/components/coach/analytics/MassimoMuscoli'

export default function MassimiPage({ params }: { params: Promise<{ clienteId: string }> }) {
  const { clienteId } = use(params)
  return (
    <div className="space-y-4 max-w-3xl">
      <Link href={`/coach/clienti/${clienteId}/analytics`}
        className="text-sm hover:opacity-70 transition-opacity"
        style={{ color: 'var(--c-50)' }}>
        ← Analytics cliente
      </Link>
      <MassimoMuscoli clienteId={clienteId} />
    </div>
  )
}
