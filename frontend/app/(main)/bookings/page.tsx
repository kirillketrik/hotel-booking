'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { apiEndpoints } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import type { Booking, PaginatedResponse } from '@/lib/types'

const STATUS_LABELS: Record<Booking['status'], string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const STATUS_VARIANT: Record<
  Booking['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending_payment: 'outline',
  paid: 'default',
  confirmed: 'default',
  cancelled: 'secondary',
  refunded: 'secondary',
}

function BookingCard({
  booking,
  onCancel,
  cancelling,
}: {
  booking: Booking
  onCancel: (id: string) => void
  cancelling: boolean
}) {
  const canCancel =
    booking.status === 'paid' || booking.status === 'confirmed'

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/tours/${booking.tour.id}`}
          className="font-semibold text-base hover:underline line-clamp-1"
        >
          {booking.tour.title}
        </Link>
        <Badge variant={STATUS_VARIANT[booking.status]}>
          {STATUS_LABELS[booking.status]}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          {booking.tour.location.city}, {booking.tour.location.country}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" />
          {format(new Date(booking.tour.start_date), 'MMM d, yyyy')}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          {booking.adults_count} adult{booking.adults_count !== 1 ? 's' : ''}
          {booking.children_count > 0 &&
            `, ${booking.children_count} child${booking.children_count !== 1 ? 'ren' : ''}`}
        </span>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="font-medium">
          ${parseFloat(booking.total_price).toFixed(2)}
        </span>
        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onCancel(booking.id)}
            disabled={cancelling}
          >
            Cancel & Refund
          </Button>
        )}
      </div>
    </div>
  )
}

export default function BookingsPage() {
  const { user, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()
  const [cancelId, setCancelId] = useState<string | null>(null)

  if (authLoading) return null
  if (!user) {
    router.replace('/login')
    return null
  }

  const { data, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () =>
      apiEndpoints.bookings
        .list()
        .then((r) => {
          const d = r.data
          return (
            Array.isArray(d)
              ? d
              : (d as PaginatedResponse<Booking>).results ?? []
          ) as Booking[]
        }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiEndpoints.bookings.cancel(id),
    onSuccess: () => {
      toast.success('Booking cancelled and refund issued.')
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
    onError: () => toast.error('Failed to cancel booking.'),
    onSettled: () => setCancelId(null),
  })

  const bookings = data ?? []

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold">My Bookings</h1>

        {isLoading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && bookings.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No bookings yet</p>
            <p className="text-sm mt-1">
              Browse tours and book your next adventure.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/">Explore Tours</Link>
            </Button>
          </div>
        )}

        {!isLoading && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={(id) => setCancelId(id)}
                cancelling={cancelMutation.isPending && cancelId === booking.id}
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!cancelId}
        onOpenChange={(v) => { if (!v) setCancelId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
            <AlertDialogDescription>
              A full refund will be issued to your original payment method.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelId && cancelMutation.mutate(cancelId)}
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
