'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { toast } from 'sonner'
import { CalendarDays, BedDouble, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { apiEndpoints } from '@/lib/api'
import type { BookingCreateResponse, RoomAvailability, Tour, TourAvailability } from '@/lib/types'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
)

const bookingSchema = z.object({
  adults_count: z.coerce.number().int().min(1, 'At least 1 adult required'),
  children_count: z.coerce.number().int().min(0).default(0),
  contact_phone: z.string().min(1, 'Phone is required').max(30),
  special_requests: z.string().max(1000).optional().default(''),
  room_id: z.string().nullable().default(null),
  room_count: z.coerce.number().int().min(1).default(1),
})

type BookingFormData = z.infer<typeof bookingSchema>

interface PaymentStepProps {
  clientSecret: string
  bookingId: string
  totalPrice: string
  onCancel: () => void
}

function PaymentStep({ clientSecret, bookingId, totalPrice, onCancel }: PaymentStepProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/bookings/${bookingId}`,
      },
    })

    if (error) {
      toast.error(error.message ?? 'Payment failed')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md bg-muted px-4 py-3 text-sm flex items-center justify-between">
        <span className="text-muted-foreground">Total to pay</span>
        <span className="font-semibold text-base">${parseFloat(totalPrice).toFixed(2)}</span>
      </div>
      <PaymentElement />
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={!stripe || loading}>
          {loading ? 'Processing…' : 'Pay Now'}
        </Button>
      </div>
    </form>
  )
}

function RoomCard({
  room,
  selected,
  onSelect,
  durationDays,
}: {
  room: RoomAvailability
  selected: boolean
  onSelect: () => void
  durationDays: number
}) {
  const roomTypeLabels: Record<string, string> = {
    standard: 'Standard',
    deluxe: 'Deluxe',
    suite: 'Suite',
    family: 'Family',
    economy: 'Economy',
  }
  const unavailable = room.available_quantity === 0

  return (
    <button
      type="button"
      onClick={unavailable ? undefined : onSelect}
      className={[
        'w-full text-left rounded-lg border p-3 transition-colors',
        unavailable
          ? 'opacity-50 cursor-not-allowed border-border'
          : selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <BedDouble className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm">{roomTypeLabels[room.room_type] ?? room.room_type}</span>
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <Users className="w-3 h-3" /> {room.capacity}
            </span>
          </div>
          {room.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{room.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            +${parseFloat(room.price_per_night).toFixed(2)}/night × {durationDays} nights
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium">
            +${(parseFloat(room.price_per_night) * durationDays).toFixed(2)}
          </p>
          {unavailable ? (
            <Badge variant="destructive" className="text-xs mt-0.5">Full</Badge>
          ) : (
            <p className="text-xs text-muted-foreground">{room.available_quantity} left</p>
          )}
        </div>
      </div>
    </button>
  )
}

export function BookingDialog({ tour, initialIsFullyBooked }: { tour: Tour; initialIsFullyBooked?: boolean }) {
  const [open, setOpen] = useState(false)
  const [bookingResponse, setBookingResponse] = useState<BookingCreateResponse | null>(null)

  const { data: availability } = useQuery<TourAvailability>({
    queryKey: ['tour-availability', tour.id],
    queryFn: () => apiEndpoints.publicTours.availability(tour.id).then((r) => r.data),
    enabled: open,
    staleTime: 30_000,
  })

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      adults_count: 1,
      children_count: 0,
      special_requests: '',
      room_id: null,
      room_count: 1,
    },
  })

  const watchedAdults = watch('adults_count') || 1
  const watchedChildren = watch('children_count') || 0
  const watchedRoomId = watch('room_id')
  const watchedRoomCount = watch('room_count') || 1

  const selectedRoom = availability?.rooms.find((r) => r.id === watchedRoomId) ?? null
  const travelers = (Number(watchedAdults) || 1) + (Number(watchedChildren) || 0)
  const basePrice = parseFloat(tour.price) * travelers
  const roomPrice = selectedRoom
    ? parseFloat(selectedRoom.price_per_night) * tour.duration_days * (Number(watchedRoomCount) || 1)
    : 0
  const totalPrice = basePrice + roomPrice

  const createMutation = useMutation({
    mutationFn: (data: BookingFormData) =>
      apiEndpoints.bookings
        .create(tour.id, {
          adults_count: data.adults_count,
          children_count: data.children_count,
          contact_phone: data.contact_phone,
          special_requests: data.special_requests,
          room_id: data.room_id ?? null,
          room_count: data.room_count,
        })
        .then((r) => r.data as BookingCreateResponse),
    onSuccess: (data) => setBookingResponse(data),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string; 0?: string } } })
          ?.response?.data?.detail ??
        (err as { response?: { data?: string[] } })?.response?.data?.[0] ??
        'Failed to create booking'
      toast.error(msg)
    },
  })

  const handleClose = () => {
    setOpen(false)
    setBookingResponse(null)
    reset()
  }

  const isFullyBooked = availability?.is_fully_booked ?? initialIsFullyBooked ?? false

  return (
    <>
      <Button
        className="w-full"
        onClick={() => setOpen(true)}
        disabled={isFullyBooked}
        variant={isFullyBooked ? 'outline' : 'default'}
      >
        {isFullyBooked ? 'Fully Booked' : 'Book Now'}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {bookingResponse ? 'Complete Payment' : 'Book Tour'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-0.5">
            <p className="font-medium text-sm">{tour.title}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {new Date(tour.start_date).toLocaleDateString()} – {new Date(tour.end_date).toLocaleDateString()}
              &nbsp;·&nbsp;{tour.duration_days} days
            </p>
          </div>

          <Separator />

          {!bookingResponse ? (
            <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              {/* Travelers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="adults_count">
                    Adults{' '}
                    <span className="text-muted-foreground text-xs">
                      ({availability ? availability.available_adults : tour.max_adults} left)
                    </span>
                  </Label>
                  <Input
                    id="adults_count"
                    type="number"
                    min={1}
                    max={availability?.available_adults ?? tour.max_adults}
                    {...register('adults_count')}
                  />
                  {errors.adults_count && (
                    <p className="text-xs text-destructive">{errors.adults_count.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="children_count">
                    Children{' '}
                    <span className="text-muted-foreground text-xs">
                      ({availability ? availability.available_children : tour.max_children} left)
                    </span>
                  </Label>
                  <Input
                    id="children_count"
                    type="number"
                    min={0}
                    max={availability?.available_children ?? tour.max_children}
                    {...register('children_count')}
                  />
                </div>
              </div>

              {/* Room selection */}
              {availability && availability.rooms.length > 0 && (
                <div className="space-y-2">
                  <Label>Room <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <div className="space-y-2">
                    <Controller
                      name="room_id"
                      control={control}
                      render={({ field }) => (
                        <>
                          <button
                            type="button"
                            onClick={() => field.onChange(null)}
                            className={[
                              'w-full text-left rounded-lg border p-3 text-sm transition-colors',
                              field.value === null
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50',
                            ].join(' ')}
                          >
                            <span className="font-medium">No room</span>
                            <span className="text-muted-foreground text-xs ml-2">Tour price only</span>
                          </button>
                          {availability.rooms.map((room) => (
                            <RoomCard
                              key={room.id}
                              room={room}
                              selected={field.value === room.id}
                              onSelect={() => field.onChange(room.id)}
                              durationDays={tour.duration_days}
                            />
                          ))}
                        </>
                      )}
                    />
                  </div>

                  {watchedRoomId && (
                    <div className="space-y-1">
                      <Label htmlFor="room_count">Number of rooms</Label>
                      <Input
                        id="room_count"
                        type="number"
                        min={1}
                        max={selectedRoom?.available_quantity ?? 1}
                        {...register('room_count')}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Contact */}
              <div className="space-y-1">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  {...register('contact_phone')}
                />
                {errors.contact_phone && (
                  <p className="text-xs text-destructive">{errors.contact_phone.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="special_requests">
                  Special Requests{' '}
                  <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Textarea
                  id="special_requests"
                  placeholder="Dietary needs, accessibility requirements…"
                  rows={2}
                  {...register('special_requests')}
                />
              </div>

              {/* Price breakdown */}
              <div className="rounded-md bg-muted px-4 py-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>${parseFloat(tour.price).toFixed(2)} × {travelers} traveler{travelers > 1 ? 's' : ''}</span>
                  <span>${basePrice.toFixed(2)}</span>
                </div>
                {selectedRoom && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      Room ({watchedRoomCount}× {tour.duration_days} nights)
                    </span>
                    <span>+${roomPrice.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Please wait…' : 'Continue to Payment'}
              </Button>
            </form>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: bookingResponse.stripe_client_secret }}
            >
              <PaymentStep
                clientSecret={bookingResponse.stripe_client_secret}
                bookingId={bookingResponse.id}
                totalPrice={bookingResponse.total_price}
                onCancel={() => setBookingResponse(null)}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
