'use client'

import { create } from 'zustand'
import type { User } from './types'

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  isAgencyAdmin: () => boolean
  isAgencyOperator: () => boolean
  isStaff: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  isAgencyAdmin: () => get().user?.groups.includes('agency_admin') ?? false,
  isAgencyOperator: () => get().user?.groups.includes('agency_operator') ?? false,
  isStaff: () => {
    const user = get().user
    if (!user) return false
    return (
      user.is_staff ||
      user.groups.includes('staff') ||
      user.groups.includes('platform_staff')
    )
  },
}))

interface NotificationState {
  unreadCount: number
  setUnreadCount: (count: number) => void
  increment: () => void
  decrement: (by?: number) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  increment: () => set({ unreadCount: get().unreadCount + 1 }),
  decrement: (by = 1) => set({ unreadCount: Math.max(0, get().unreadCount - by) }),
}))
