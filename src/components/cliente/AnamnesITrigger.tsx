'use client'

import { useState } from 'react'
import AnamnesIModal from './AnamnesIModal'

export default function AnamnesITrigger({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show)
  if (!visible) return null
  return <AnamnesIModal onComplete={() => setVisible(false)} />
}
