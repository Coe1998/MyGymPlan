import BynariLoader from '@/components/shared/BynariLoader'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--c-13)' }}>
      <BynariLoader file="blue" size={120} />
    </div>
  )
}
