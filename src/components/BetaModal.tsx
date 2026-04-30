import { useEffect, useState } from 'react'

export default function BetaModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-beta-modal', handler)
    return () => window.removeEventListener('open-beta-modal', handler)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative bg-card rounded-xl p-6 w-full max-w-md border border-border shadow-lg">
        <h3 className="text-lg font-bold mb-2">Metric Beta</h3>
        <p className="text-muted-foreground mb-4">We're currently in testing, so you can explore the product with limited access at no cost. Your feedback plays a key role in helping us improve.</p>
        <div className="flex justify-end">
          <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-md bg-accent text-accent-foreground font-bold cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  )
}
