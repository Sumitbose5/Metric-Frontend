import React from 'react'
import { useNavigate } from 'react-router-dom'

const NotFound: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-20 px-6">
      <div className="w-full max-w-3xl bg-card/60 backdrop-blur-xl border border-border p-12 rounded-2xl shadow-md text-center">
        <div className="mb-6">
          <div className="text-7xl font-extrabold">404</div>
          <h1 className="text-3xl font-bold mt-3">Page not found</h1>
          <p className="text-muted-foreground mt-2">We couldn't find the page you were looking for.</p>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl font-semibold transition-all shadow-md bg-accent text-accent-foreground hover:scale-[1.02] hover:bg-accent/90"
          >
            Go back
          </button>

          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl font-semibold transition-all shadow-md border border-border hover:bg-muted/30"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
