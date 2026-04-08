'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'

interface Props {
  size?: number
  file?: 'run' | 'blue'
}

export default function BynariLoader({ size = 120, file = 'run' }: Props) {
  const src = file === 'blue'
    ? '/lottie/Loading_animation_blue.lottie'
    : '/lottie/Sweet_run_cycle.lottie'

  return (
    <div className="flex items-center justify-center w-full py-8">
      <DotLottieReact src={src} loop autoplay style={{ width: size, height: size }} />
    </div>
  )
}
