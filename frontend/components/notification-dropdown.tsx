'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useNotificationStore } from '@/lib/store'
import { apiEndpoints } from '@/lib/api'
import type { Notification, PaginatedResponse } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

export function NotificationDropdown() {
  const { unreadCount, setUnreadCount } = useNotificationStore()
  const qc = useQueryClient()

  const { data } = useQuery<PaginatedResponse<Notification>>({
    queryKey: ['notifications', 'recent'],
    queryFn: () => apiEndpoints.notifications.list({ page_size: 5 }).then((r) => r.data),
    staleTime: 30_000,
  })

  const markAllMutation = useMutation({
    mutationFn: () => apiEndpoints.notifications.markAllRead().then((r) => r.data),
    onMutate: () => setUnreadCount(0),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = data?.results ?? []

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative w-8 h-8" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              className="text-xs text-primary flex items-center gap-1 hover:underline"
              aria-label="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'px-3 py-2.5 text-sm border-b border-border last:border-0',
                !n.is_read && 'bg-accent/10 border-l-2 border-l-accent'
              )}
            >
              <p className={cn('font-medium text-foreground leading-snug', !n.is_read && 'text-foreground')}>
                {n.title}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{n.message}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
          ))
        )}

        <DropdownMenuSeparator />
        <div className="p-1">
          <Link
            href="/notifications"
            className="block text-center text-xs text-primary py-1.5 hover:underline"
          >
            See all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
