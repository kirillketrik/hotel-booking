'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Bell,
  ChevronDown,
  LogOut,
  Building2,
  ShieldCheck,
  Menu,
  X,
  MapPin,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore, useNotificationStore } from '@/lib/store'
import { apiEndpoints } from '@/lib/api'
import { NotificationDropdown } from './notification-dropdown'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Invitation } from '@/lib/types'

export function Navbar() {
  const { user, setUser, isStaff } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const router = useRouter()
  const qc = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const { data: invitations } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: (): Promise<Invitation[]> =>
      apiEndpoints.invitations.listMine().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : (d.results ?? [])
      }),
    enabled: !!user,
  })
  const pendingInvitations = Array.isArray(invitations)
    ? invitations.filter((i) => i.status === 'pending').length
    : 0

  const logoutMutation = useMutation({
    mutationFn: () => apiEndpoints.logout().then((r) => r.data),
    onSuccess: () => {
      setUser(null)
      qc.clear()
      router.push('/')
    },
  })

  return (
    <header className="sticky top-0 z-50 w-full bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground text-lg">Tourly</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors">
              Browse Tours
            </Link>
            {user && (
              <>
                <Link href="/agencies" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors">
                  My Agencies
                </Link>
                <Link href="/invitations" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors flex items-center gap-1">
                  Invitations
                  {pendingInvitations > 0 && (
                    <span className="bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 leading-none">
                      {pendingInvitations}
                    </span>
                  )}
                </Link>
              </>
            )}
            {isStaff() && (
              <Link href="/admin/moderation" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Moderation
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Notification Bell */}
                <NotificationDropdown />

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-sm h-8">
                      <span className="hidden sm:block max-w-[120px] truncate">
                        {user.first_name} {user.last_name}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      {user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/agencies" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        My Agencies
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/invitations" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Invitations
                        {pendingInvitations > 0 && (
                          <span className="ml-auto bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5">
                            {pendingInvitations}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/notifications" className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Notifications
                        {unreadCount > 0 && (
                          <span className="ml-auto bg-destructive text-destructive-foreground rounded-full text-xs px-1.5 py-0.5">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    {isStaff() && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin/moderation" className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            Moderation
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive gap-2"
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Sign up</Link>
                </Button>
              </div>
            )}

            {/* Mobile toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden w-8 h-8"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 flex flex-col gap-1">
          <Link href="/" className="py-2 text-sm text-foreground" onClick={() => setMobileOpen(false)}>
            Browse Tours
          </Link>
          {user ? (
            <>
              <Link href="/agencies" className="py-2 text-sm text-foreground" onClick={() => setMobileOpen(false)}>
                My Agencies
              </Link>
              <Link href="/invitations" className="py-2 text-sm text-foreground flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                Invitations
                {pendingInvitations > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 leading-none">
                    {pendingInvitations}
                  </span>
                )}
              </Link>
              <Link href="/notifications" className="py-2 text-sm text-foreground" onClick={() => setMobileOpen(false)}>
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </Link>
              {isStaff() && (
                <Link href="/admin/moderation" className="py-2 text-sm text-foreground" onClick={() => setMobileOpen(false)}>
                  Moderation
                </Link>
              )}
              <button
                className="py-2 text-sm text-destructive text-left"
                onClick={() => { setMobileOpen(false); logoutMutation.mutate() }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="py-2 text-sm text-foreground" onClick={() => setMobileOpen(false)}>
                Sign in
              </Link>
              <Link href="/register" className="py-2 text-sm text-foreground" onClick={() => setMobileOpen(false)}>
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
