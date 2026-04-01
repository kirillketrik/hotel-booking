'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useEffect, useState } from 'react'
import { apiEndpoints } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useNotificationSocket } from '@/hooks/use-notification-socket'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const init = async () => {
      // CSRF must be set before any POST (including the refresh call the
      // interceptor may make when /me returns 401).
      try { await apiEndpoints.csrf() } catch {}

      // The response interceptor in api.ts handles 401 → POST /refresh → retry.
      try {
        const res = await apiEndpoints.me()
        setUser(res.data)
      } catch {
        setUser(null)
      }
    }

    init()

    // Listen for auth:logout event (triggered by 401 refresh failure)
    const handleLogout = () => setUser(null)
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [setUser, setLoading])

  // Connect WebSocket for notifications
  useNotificationSocket()

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => queryClient)

  return (
    <QueryClientProvider client={client}>
      <Elements stripe={stripePromise}>
        <AuthBootstrap>{children}</AuthBootstrap>
      </Elements>
    </QueryClientProvider>
  )
}
