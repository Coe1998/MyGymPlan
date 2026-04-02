'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SchedaEditorModal from '@/components/coach/SchedaEditorModal'

export default function AtletaSchedaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const schedaId = params.id as string
  const supabase = useMemo(() => createClient(), [])
  const [schedaNome, setSchedaNome] = useState<string | null>(null)

  useEffect(() => {
    const fetchNome = async () => {
      const { data } = await supabase
        .from('schede')
        .select('nome')
        .eq('id', schedaId)
        .maybeSingle()
      setSchedaNome(data?.nome ?? 'Scheda')
    }
    fetchNome()
  }, [schedaId, supabase])

  if (schedaNome === null) return null

  return (
    <SchedaEditorModal
      schedaId={schedaId}
      schedaNome={schedaNome}
      onClose={() => router.push('/atleta/schede')}
    />
  )
}
