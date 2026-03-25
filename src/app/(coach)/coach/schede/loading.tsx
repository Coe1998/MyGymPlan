export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: 'oklch(0.70 0.19 46 / 15%)' }} />
        <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: 'oklch(0.70 0.19 46)' }} />
      </div>
      <p className="text-sm font-medium animate-pulse" style={{ color: 'oklch(0.45 0 0)' }}>
        Caricamento...
      </p>
    </div>
  )
}
