'use client'

import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuthStore, useNotificationStore } from '@/lib/store'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000'
const MAX_BACKOFF = 30_000

export function useNotificationSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)
  const { user } = useAuthStore()
  const { setUnreadCount, increment } = useNotificationStore()

  const connect = useCallback(() => {
    if (!user) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_URL}/ws/notifications/`)
    wsRef.current = ws

    ws.onopen = () => {
      attemptsRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'unread_count') {
          setUnreadCount(data.count)
        } else if (data.type === 'notification') {
          increment()
          toast(data.title, { description: data.message })
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      if (!user) return
      const delay = Math.min(1000 * 2 ** attemptsRef.current, MAX_BACKOFF)
      attemptsRef.current += 1
      reconnectTimeoutRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [user, setUnreadCount, increment])

  const sendMessage = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const markRead = useCallback((id: string) => sendMessage({ action: 'mark_read', id }), [sendMessage])
  const markAllRead = useCallback(() => sendMessage({ action: 'mark_all_read' }), [sendMessage])

  useEffect(() => {
    if (user) {
      connect()
    } else {
      wsRef.current?.close()
      wsRef.current = null
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    }
    return () => {
      wsRef.current?.close()
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
    }
  }, [user, connect])

  return { markRead, markAllRead }
}
