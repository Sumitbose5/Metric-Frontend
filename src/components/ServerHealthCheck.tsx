import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'

interface HealthCheckState {
  isHealthy: boolean
  isLoading: boolean
}

const MAX_RETRIES = 30

export function ServerHealthCheck({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<HealthCheckState>({
    isHealthy: false,
    isLoading: true,
  })
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const checkHealth = async (attempt: number) => {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
      const agentBaseUrl = import.meta.env.VITE_AGENT_BASE_URL

      if (!apiBaseUrl || !agentBaseUrl) {
        console.error('Missing VITE_API_BASE_URL or VITE_AGENT_BASE_URL')
        console.error('VITE_API_BASE_URL:', apiBaseUrl)
        console.error('VITE_AGENT_BASE_URL:', agentBaseUrl)
        setHealth({ isHealthy: false, isLoading: false })
        return
      }

      try {
        console.log(`[Health Check #${attempt}] Checking servers...`)

        // Extract base URL without /api suffix for API server
        const apiBaseUrlClean = apiBaseUrl.replace('/api', '')
        const apiHealthUrl = `${apiBaseUrlClean}/health`
        const agentHealthUrl = `${agentBaseUrl}/health`

        console.log(`API Health URL: ${apiHealthUrl}`)
        console.log(`Agent Health URL: ${agentHealthUrl}`)

        const timeout = 8000 // 8 second timeout per request
        const controller = new AbortController()
        const fetchTimeoutId = setTimeout(() => controller.abort(), timeout)

        const [apiResponse, agentResponse] = await Promise.all([
          fetch(apiHealthUrl, { 
            method: 'GET',
            signal: controller.signal,
          }).catch((error) => {
            console.error('API health check failed:', error.message)
            return { ok: false, status: 0 }
          }),
          fetch(agentHealthUrl, { 
            method: 'GET',
            signal: controller.signal,
          }).catch((error) => {
            console.error('Agent health check failed:', error.message)
            return { ok: false, status: 0 }
          }),
        ])

        clearTimeout(fetchTimeoutId)

        const apiHealthy = apiResponse?.ok || apiResponse?.status === 200
        const agentHealthy = agentResponse?.ok || agentResponse?.status === 200

        console.log(`API Health: ${apiHealthy ? '✅' : '❌'} (${apiResponse?.status})`)
        console.log(`Agent Health: ${agentHealthy ? '✅' : '❌'} (${agentResponse?.status})`)

        if (apiHealthy && agentHealthy) {
          console.log('✅ Both servers are healthy!')
          setHealth({ isHealthy: true, isLoading: false })
        } else {
          // Retry if not healthy and haven't exceeded max retries
          if (attempt < MAX_RETRIES) {
            console.log(`⏳ Retrying in 2 seconds... (${attempt}/${MAX_RETRIES})`)
            setRetryCount(attempt)
            timeoutId = setTimeout(() => checkHealth(attempt + 1), 2000)
          } else {
            console.error('❌ Max retries exceeded, showing error state')
            setHealth({ isHealthy: false, isLoading: false })
          }
        }
      } catch (error) {
        console.error('Health check error:', error)
        // Retry on error
        if (attempt < MAX_RETRIES) {
          console.log(`⏳ Retrying in 2 seconds... (${attempt}/${MAX_RETRIES})`)
          setRetryCount(attempt)
          timeoutId = setTimeout(() => checkHealth(attempt + 1), 2000)
        } else {
          console.error('❌ Max retries exceeded, showing error state')
          setHealth({ isHealthy: false, isLoading: false })
        }
      }
    }

    checkHealth(1)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  if (health.isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-xl border border-border bg-card p-8 shadow-lg max-w-md">
            <div className="flex flex-col items-center gap-4">
              <Spinner className="size-8" />
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold">Waking the Server</h2>
                <p className="text-sm text-muted-foreground">
                  This app is running on a free server, therefore it's taking time to start up.
                </p>
                <p className="text-xs text-muted-foreground">
                  Please wait while we initialize...
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Attempt: {retryCount + 1}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!health.isHealthy) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-xl border border-destructive bg-card p-8 shadow-lg max-w-md">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold text-destructive">Server Error</h2>
                <p className="text-sm text-muted-foreground">
                  Unable to connect to the servers. Please check your internet connection and try again.
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-md bg-accent text-accent-foreground font-medium cursor-pointer hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return children
}
