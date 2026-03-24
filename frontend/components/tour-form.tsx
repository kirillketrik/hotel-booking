'use client'

import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Plus, Trash2, ChevronLeft, ChevronRight, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageShell } from '@/components/page-shell'
import { apiEndpoints } from '@/lib/api'
import type { Tour } from '@/lib/types'
import { differenceInCalendarDays } from 'date-fns'
import { cn } from '@/lib/utils'

// ---- Schema ----
const roomSchema = z.object({
  room_type: z.enum(['standard', 'deluxe', 'suite', 'family', 'economy']),
  description: z.string().optional(),
  price_per_night: z.string().min(1, 'Required'),
  capacity: z.coerce.number().min(1),
  quantity: z.coerce.number().min(1),
})

const hotelSchema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  stars: z.coerce.number().min(1).max(5),
  rooms: z.array(roomSchema).optional(),
})

const transferSchema = z.object({
  transfer_type: z.enum(['airport', 'hotel', 'city', 'custom']),
  description: z.string().optional(),
  price: z.string().min(1, 'Required'),
  is_included: z.boolean(),
})

const tourSchema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().min(10, 'Description required'),
  price: z.string().min(1, 'Price required'),
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().min(1, 'End date required'),
  max_adults: z.coerce.number().min(1),
  max_children: z.coerce.number().min(0),
  country: z.string().min(1, 'Country required'),
  city: z.string().min(1, 'City required'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  hotels: z.array(hotelSchema).optional(),
  transfers: z.array(transferSchema).optional(),
})

type TourFormData = z.infer<typeof tourSchema>

const STEPS = ['Basic Info', 'Dates & Price', 'Location', 'Hotels', 'Transfers']

interface TourFormProps {
  agencyId: string
  tourId?: string
  initialData?: Tour
}

export function TourForm({ agencyId, tourId, initialData }: TourFormProps) {
  const router = useRouter()
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.cover_image ?? null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<TourFormData>({
    resolver: zodResolver(tourSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      price: initialData?.price ?? '',
      start_date: initialData?.start_date ?? '',
      end_date: initialData?.end_date ?? '',
      max_adults: initialData?.max_adults ?? 2,
      max_children: initialData?.max_children ?? 0,
      country: initialData?.location?.country ?? '',
      city: initialData?.location?.city ?? '',
      latitude: initialData?.location?.latitude?.toString() ?? '',
      longitude: initialData?.location?.longitude?.toString() ?? '',
      hotels: initialData?.hotels?.map((h) => ({
        name: h.name,
        description: h.description,
        stars: h.stars,
        rooms: h.rooms.map((r) => ({
          room_type: r.room_type,
          description: r.description,
          price_per_night: r.price_per_night,
          capacity: r.capacity,
          quantity: r.quantity,
        })),
      })) ?? [],
      transfers: initialData?.transfers?.map((t) => ({
        transfer_type: t.transfer_type,
        description: t.description,
        price: t.price,
        is_included: t.is_included,
      })) ?? [],
    },
  })

  const { fields: hotelFields, append: appendHotel, remove: removeHotel } = useFieldArray({ control, name: 'hotels' })
  const { fields: transferFields, append: appendTransfer, remove: removeTransfer } = useFieldArray({ control, name: 'transfers' })

  const startDate = watch('start_date')
  const endDate = watch('end_date')
  const durationDays = startDate && endDate ? differenceInCalendarDays(new Date(endDate), new Date(startDate)) : null

  const mutation = useMutation({
    mutationFn: (data: TourFormData) => {
      const payload = {
        title: data.title,
        description: data.description,
        price: data.price,
        start_date: data.start_date,
        end_date: data.end_date,
        max_adults: data.max_adults,
        max_children: data.max_children,
        location: {
          country: data.country,
          city: data.city,
          latitude: data.latitude ? Number(data.latitude) : null,
          longitude: data.longitude ? Number(data.longitude) : null,
        },
        hotels: data.hotels ?? [],
        transfers: data.transfers ?? [],
      }
      if (tourId) return apiEndpoints.tours.update(agencyId, tourId, payload).then((r) => r.data)
      return apiEndpoints.tours.create(agencyId, payload).then((r) => r.data)
    },
    onSuccess: (tour) => {
      qc.invalidateQueries({ queryKey: ['agency-tours', agencyId] })
      toast.success(tourId ? 'Tour updated!' : 'Tour created!')
      router.push(`/agencies/${agencyId}`)
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data ?? {}
      toast.error('Failed to save tour. Please check the form.')
    },
  })

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const stepContent = [
    // Step 0: Basic Info
    <div key="basic" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Tour title</Label>
        <Input id="title" placeholder="e.g. 7-Day Greek Island Hopping" {...register('title')} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="Describe the tour experience..." rows={5} {...register('description')} />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Cover image <span className="text-muted-foreground">(optional)</span></Label>
        <div
          className="relative w-full aspect-video max-w-sm rounded-lg border border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 overflow-hidden"
          onClick={() => coverRef.current?.click()}
          role="button"
          aria-label="Upload cover image"
        >
          {coverPreview ? (
            <>
              <Image src={coverPreview} alt="Cover preview" fill className="object-cover" />
              <button
                type="button"
                className="absolute top-2 right-2 bg-foreground/70 text-background rounded-full p-1 z-10"
                onClick={(e) => { e.stopPropagation(); setCoverPreview(null); setCoverFile(null) }}
                aria-label="Remove cover"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="w-8 h-8" />
              <span className="text-sm">Click to upload cover image</span>
            </div>
          )}
        </div>
        <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleCoverChange} />
        <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP. Max 5 MB. 16:9 ratio recommended.</p>
      </div>
    </div>,

    // Step 1: Dates & Price
    <div key="dates" className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="start_date">Start date</Label>
          <Input id="start_date" type="date" {...register('start_date')} />
          {errors.start_date && <p className="text-xs text-destructive">{errors.start_date.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="end_date">End date</Label>
          <Input id="end_date" type="date" {...register('end_date')} />
          {errors.end_date && <p className="text-xs text-destructive">{errors.end_date.message}</p>}
        </div>
      </div>
      {durationDays !== null && (
        <p className="text-sm text-muted-foreground">Duration: <strong className="text-foreground">{durationDays} day{durationDays !== 1 ? 's' : ''}</strong></p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="price">Price per person ($)</Label>
        <Input id="price" type="number" step="0.01" placeholder="e.g. 1200.00" {...register('price')} />
        {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max_adults">Max adults</Label>
          <Input id="max_adults" type="number" min={1} {...register('max_adults')} />
          {errors.max_adults && <p className="text-xs text-destructive">{errors.max_adults.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max_children">Max children</Label>
          <Input id="max_children" type="number" min={0} {...register('max_children')} />
        </div>
      </div>
    </div>,

    // Step 2: Location
    <div key="location" className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" placeholder="e.g. Greece" {...register('country')} />
          {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" placeholder="e.g. Athens" {...register('city')} />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="latitude">Latitude <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="latitude" type="number" step="any" placeholder="e.g. 37.9838" {...register('latitude')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="longitude">Longitude <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="longitude" type="number" step="any" placeholder="e.g. 23.7275" {...register('longitude')} />
        </div>
      </div>
    </div>,

    // Step 3: Hotels
    <div key="hotels" className="flex flex-col gap-4">
      {hotelFields.map((field, hotelIdx) => (
        <HotelBlock
          key={field.id}
          control={control}
          register={register}
          index={hotelIdx}
          onRemove={() => removeHotel(hotelIdx)}
          errors={errors}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => appendHotel({ name: '', description: '', stars: 3, rooms: [] })}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-1" /> Add Hotel
      </Button>
    </div>,

    // Step 4: Transfers
    <div key="transfers" className="flex flex-col gap-3">
      {transferFields.map((field, idx) => (
        <div key={field.id} className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Transfer #{idx + 1}</span>
            <button type="button" onClick={() => removeTransfer(idx)} className="text-destructive" aria-label="Remove transfer">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Controller control={control} name={`transfers.${idx}.transfer_type`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="airport">Airport</SelectItem>
                      <SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Price ($)</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...register(`transfers.${idx}.price`)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input placeholder="e.g. Airport to hotel shuttle" {...register(`transfers.${idx}.description`)} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register(`transfers.${idx}.is_included`)} className="rounded" />
            Included in tour price
          </label>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => appendTransfer({ transfer_type: 'airport', description: '', price: '0', is_included: false })}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-1" /> Add Transfer
      </Button>
    </div>,
  ]

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link href={`/agencies/${agencyId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to agency
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mb-6">{tourId ? 'Edit Tour' : 'Create Tour'}</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                  i < step ? 'bg-primary text-primary-foreground' :
                  i === step ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
                  'bg-muted text-muted-foreground'
                )}
              >
                {i + 1}
              </div>
              <span className={cn('text-xs whitespace-nowrap', i === step ? 'text-foreground font-medium' : 'text-muted-foreground hidden sm:block')}>
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <form id="tour-form" onSubmit={handleSubmit((d) => mutation.mutate(d))}>
            {stepContent[step]}
          </form>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" form="tour-form" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : tourId ? 'Update Tour' : 'Create Tour'}
            </Button>
          )}
        </div>
      </div>
    </PageShell>
  )
}

// --- Hotel block sub-component ---
function HotelBlock({ control, register, index, onRemove, errors }: {
  control: ReturnType<typeof useForm<TourFormData>>['control']
  register: ReturnType<typeof useForm<TourFormData>>['register']
  index: number
  onRemove: () => void
  errors: ReturnType<typeof useForm<TourFormData>>['formState']['errors']
}) {
  const { fields: roomFields, append: appendRoom, remove: removeRoom } = useFieldArray({ control, name: `hotels.${index}.rooms` })

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium">Hotel #{index + 1}</span>
        <button type="button" onClick={onRemove} className="text-destructive" aria-label="Remove hotel">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Hotel name</Label>
            <Input placeholder="Grand Palace Hotel" {...register(`hotels.${index}.name`)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Stars (1–5)</Label>
            <Input type="number" min={1} max={5} {...register(`hotels.${index}.stars`)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea rows={2} {...register(`hotels.${index}.description`)} />
        </div>

        {/* Rooms */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rooms</span>
          {roomFields.map((room, roomIdx) => (
            <div key={room.id} className="border border-border rounded-md p-3 flex flex-col gap-2 bg-background">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Room #{roomIdx + 1}</span>
                <button type="button" onClick={() => removeRoom(roomIdx)} aria-label="Remove room" className="text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Type</Label>
                  <Controller control={control} name={`hotels.${index}.rooms.${roomIdx}.room_type`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="deluxe">Deluxe</SelectItem>
                          <SelectItem value="suite">Suite</SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                          <SelectItem value="economy">Economy</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Per night ($)</Label>
                  <Input className="h-8 text-sm" type="number" step="0.01" {...register(`hotels.${index}.rooms.${roomIdx}.price_per_night`)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Capacity</Label>
                  <Input className="h-8 text-sm" type="number" min={1} {...register(`hotels.${index}.rooms.${roomIdx}.capacity`)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Quantity</Label>
                  <Input className="h-8 text-sm" type="number" min={1} {...register(`hotels.${index}.rooms.${roomIdx}.quantity`)} />
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => appendRoom({ room_type: 'standard', description: '', price_per_night: '', capacity: 2, quantity: 1 })}
          >
            <Plus className="w-3 h-3 mr-1" /> Add Room
          </Button>
        </div>
      </div>
    </div>
  )
}
