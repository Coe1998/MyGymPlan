import BynariLoader from '@/components/shared/BynariLoader'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <BynariLoader file="blue" />
    </div>
  )
}
