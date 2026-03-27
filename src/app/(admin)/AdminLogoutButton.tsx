'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminLogoutButton() {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
      style={{ background: 'oklch(0.22 0 0)', color: 'oklch(0.55 0 0)' }}>
      Esci
    </button>
  )
}
