import BynariLoader from '@/components/shared/BynariLoader'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'oklch(0.13 0 0)' }}>
      <BynariLoader file="blue" size={120} />
    </div>
  )
}
