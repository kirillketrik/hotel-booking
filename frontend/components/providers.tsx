'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { apiEndpoints } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useNotificationSocket } from '@/hooks/use-notification-socket'

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
    // Fetch CSRF cookie on app load
    apiEndpoints.csrf().catch(() => {})

    // Fetch current user
    apiEndpoints
      .me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))

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
      <AuthBootstrap>{children}</AuthBootstrap>
    </QueryClientProvider>
  )
}
