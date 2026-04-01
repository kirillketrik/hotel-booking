'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  CalendarDays,
  CheckCircle2,
  MapPin,
  Phone,
  Users,
  XCircle,
} from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { apiEndpoints } from '@/lib/api'
import type { Booking } from '@/lib/types'

const STATUS_LABELS: Record<Booking['status'], string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

function BookingDetail() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const redirectStatus = searchParams.get('redirect_status')

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () =>
      apiEndpoints.bookings.get(id).then((r) => r.data as Booking),
    refetchInterval: (query) => {
      // Keep polling until Stripe webhook has updated the status
      const data = query.state.data
      if (data?.status === 'pending_payment') return 2000
      return false
    },
  })

  return (
    <PageShell>
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        {/* Stripe redirect banner */}
        {redirectStatus === 'succeeded' && (
          <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-50 dark:bg-green-950/20 p-4 text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Payment successful!</p>
              <p className="text-sm">
                Your booking is being confirmed — this page updates automatically.
              </p>
            </div>
          </div>
        )}

        {redirectStatus === 'failed' && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            <XCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium">Payment failed</p>
              <p className="text-sm">Please try booking again.</p>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold">Booking Details</h1>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {booking && (
          <div className="rounded-xl border bg-card p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/tours/${booking.tour.id}`}
                className="font-semibold text-lg hover:underline"
              >
                {booking.tour.title}
              </Link>
              <Badge>{STATUS_LABELS[booking.status]}</Badge>
            </div>

            <Separator />

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {booking.tour.location.city}, {booking.tour.location.country}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                {format(new Date(booking.tour.start_date), 'MMM d, yyyy')} –{' '}
                {format(new Date(booking.tour.end_date), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                {booking.adults_count} adult{booking.adults_count !== 1 ? 's' : ''}
                {booking.children_count > 0 &&
                  `, ${booking.children_count} child${booking.children_count !== 1 ? 'ren' : ''}`}
              </div>
              {booking.contact_phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {booking.contact_phone}
                </div>
              )}
              {booking.special_requests && (
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">Special requests: </span>
                  {booking.special_requests}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Total paid</span>
              <span className="font-semibold text-lg">
                ${parseFloat(booking.total_price).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" asChild className="flex-1">
            <Link href="/bookings">All Bookings</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/">Explore More</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  )
}

export default function BookingDetailPage() {
  return (
    <Suspense>
      <BookingDetail />
    </Suspense>
  )
}
