'use client'

import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient, useQuery as useRQQuery } from '@tanstack/react-query'
import { Plus, Trash2, ChevronLeft, Upload, X } from 'lucide-react'
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

// ---- Types ----
type HotelImageSet = { keepIds: string[]; newFiles: File[]; newPreviews: string[] }

// ---- Schema ----
const roomSchema = z.object({
  room_type: z.enum(['standard', 'deluxe', 'suite', 'family', 'economy']),
  description: z.string().optional(),
  price_per_night: z.string().min(1, 'Required'),
  capacity: z.coerce.number().min(1),
  quantity: z.coerce.number().min(1),
})

const hotelSchema = z.object({
  _hotel_id: z.string().optional(),
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  stars: z.coerce.number().min(1).max(5),
  amenity_ids: z.array(z.string()).optional(),
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

interface TourFormProps {
  agencyId: string
  tourId?: string
  initialData?: Tour
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-4">
      {children}
    </h2>
  )
}

export function TourForm({ agencyId, tourId, initialData }: TourFormProps) {
  const router = useRouter()
  const qc = useQueryClient()

  const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.cover_image ?? null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const tourImgRef = useRef<HTMLInputElement>(null)

  const [tourImageSet, setTourImageSet] = useState<HotelImageSet>(() => ({
    keepIds: initialData?.images?.map((i) => i.id) ?? [],
    newFiles: [],
    newPreviews: [],
  }))

  const [hotelImageSets, setHotelImageSets] = useState<HotelImageSet[]>(() =>
    (initialData?.hotels ?? []).map((h) => ({
      keepIds: h.images.map((i) => i.id),
      newFiles: [],
      newPreviews: [],
    }))
  )

  const {
    register,
    handleSubmit,
    control,
    watch,
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
        _hotel_id: h.id,
        name: h.name,
        description: h.description,
        stars: h.stars,
        amenity_ids: h.amenities?.map((a) => a.id) ?? [],
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
  const watchedPrice = watch('price')
  const watchedHotels = watch('hotels')
  const durationDays = startDate && endDate ? differenceInCalendarDays(new Date(endDate), new Date(startDate)) : null

  // Warn if the cheapest room across all hotels costs more than the tour price
  // (tour price is the all-inclusive package price; room prices are reference only)
  const hotelCostWarning = (() => {
    const tourPrice = parseFloat(watchedPrice)
    if (!durationDays || durationDays <= 0 || isNaN(tourPrice) || tourPrice <= 0) return null
    if (!watchedHotels?.length) return null

    let totalMinRoomCost = 0
    for (const hotel of watchedHotels) {
      const rooms = hotel.rooms ?? []
      if (!rooms.length) continue
      const prices = rooms.map((r) => parseFloat(r.price_per_night)).filter((p) => !isNaN(p) && p > 0)
      if (!prices.length) continue
      totalMinRoomCost += Math.min(...prices) * durationDays
    }

    if (totalMinRoomCost > tourPrice) {
      return `Hotel room costs alone (cheapest rooms × ${durationDays} nights = $${totalMinRoomCost.toFixed(2)}) exceed the tour price. Make sure the tour price covers all included services.`
    }
    return null
  })()

  const { data: amenitiesData } = useRQQuery({
    queryKey: ['amenities'],
    queryFn: () => apiEndpoints.amenities.list().then((r) => r.data.results ?? r.data),
  })
  const allAmenities: { id: string; name: string }[] = amenitiesData ?? []

  const mutation = useMutation({
    mutationFn: (data: TourFormData) => {
      const fd = new FormData()
      fd.append('title', data.title)
      fd.append('description', data.description)
      fd.append('price', data.price)
      fd.append('start_date', data.start_date)
      fd.append('end_date', data.end_date)
      fd.append('max_adults', String(data.max_adults))
      fd.append('max_children', String(data.max_children))
      fd.append('location', JSON.stringify({
        country: data.country,
        city: data.city,
        latitude: data.latitude ? Number(data.latitude) : null,
        longitude: data.longitude ? Number(data.longitude) : null,
      }))
      if (coverFile) fd.append('cover_image', coverFile)

      tourImageSet.newFiles.forEach((f) => fd.append('tour_images', f))
      if (tourId) {
        fd.append('existing_tour_image_ids', JSON.stringify(tourImageSet.keepIds))
      }

      const hotelsJson = (data.hotels ?? []).map((h, idx) => ({
        ...(h._hotel_id ? { id: h._hotel_id } : {}),
        name: h.name,
        description: h.description ?? '',
        stars: h.stars,
        amenity_ids: h.amenity_ids ?? [],
        existing_image_ids: hotelImageSets[idx]?.keepIds ?? [],
        rooms: h.rooms ?? [],
      }))
      fd.append('hotels', JSON.stringify(hotelsJson))
      hotelImageSets.forEach((imgSet, idx) => {
        imgSet.newFiles.forEach((f) => fd.append(`hotel_images_${idx}`, f))
      })

      fd.append('transfers', JSON.stringify(data.transfers ?? []))

      if (tourId) return apiEndpoints.tours.update(agencyId, tourId, fd).then((r) => r.data)
      return apiEndpoints.tours.create(agencyId, fd).then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency-tours', agencyId] })
      toast.success(tourId ? 'Tour updated!' : 'Tour created!')
      router.push(`/agencies/${agencyId}`)
    },
    onError: () => {
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

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link href={`/agencies/${agencyId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to agency
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mb-8">{tourId ? 'Edit Tour' : 'Create Tour'}</h1>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-10">

          {/* ── Basic Info ── */}
          <section>
            <SectionHeading>Basic Info</SectionHeading>
            <div className="flex flex-col gap-5">
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
            </div>
          </section>

          {/* ── Images ── */}
          <section>
            <SectionHeading>Images</SectionHeading>
            <div className="flex flex-col gap-5">
              {/* Cover image */}
              <div className="flex flex-col gap-1.5">
                <Label>Cover image <span className="text-muted-foreground text-xs">(optional)</span></Label>
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

              {/* Gallery images */}
              <div className="flex flex-col gap-1.5">
                <Label>Gallery images <span className="text-muted-foreground text-xs">(optional)</span></Label>
                {(tourImageSet.keepIds.length > 0 || tourImageSet.newPreviews.length > 0) && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {(initialData?.images ?? []).filter((img) => tourImageSet.keepIds.includes(img.id)).map((img) => (
                      <div key={img.id} className="relative aspect-video rounded-md overflow-hidden bg-muted group">
                        <img src={img.image} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setTourImageSet((s) => ({ ...s, keepIds: s.keepIds.filter((k) => k !== img.id) }))}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {tourImageSet.newPreviews.map((src, i) => (
                      <div key={src} className="relative aspect-video rounded-md overflow-hidden bg-muted group">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(src)
                            setTourImageSet((s) => ({
                              ...s,
                              newFiles: s.newFiles.filter((_, j) => j !== i),
                              newPreviews: s.newPreviews.filter((_, j) => j !== i),
                            }))
                          }}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => tourImgRef.current?.click()}
                  className="flex items-center gap-2 text-sm text-muted-foreground border border-dashed border-border rounded-md px-3 py-2 hover:bg-muted transition-colors w-fit"
                >
                  <Upload className="w-4 h-4" />
                  Add photos
                </button>
                <input
                  ref={tourImgRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? [])
                    if (!files.length) return
                    const previews = files.map((f) => URL.createObjectURL(f))
                    setTourImageSet((s) => ({
                      ...s,
                      newFiles: [...s.newFiles, ...files],
                      newPreviews: [...s.newPreviews, ...previews],
                    }))
                    e.target.value = ''
                  }}
                />
                <p className="text-xs text-muted-foreground">Additional photos shown in the gallery lightbox.</p>
              </div>
            </div>
          </section>

          {/* ── Dates & Price ── */}
          <section>
            <SectionHeading>Dates & Price</SectionHeading>
            <div className="flex flex-col gap-5">
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
                <p className="text-sm text-muted-foreground">
                  Duration: <strong className="text-foreground">{durationDays} day{durationDays !== 1 ? 's' : ''}</strong>
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5 sm:col-span-1">
                  <Label htmlFor="price">Package price per person ($)</Label>
                  <Input id="price" type="number" step="0.01" placeholder="e.g. 1200.00" {...register('price')} />
                  {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
                </div>
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
              {hotelCostWarning && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-400/50 bg-yellow-50 dark:bg-yellow-950/30 px-3 py-2.5 text-sm text-yellow-800 dark:text-yellow-300">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  <span>{hotelCostWarning}</span>
                </div>
              )}
            </div>
          </section>

          {/* ── Location ── */}
          <section>
            <SectionHeading>Location</SectionHeading>
            <div className="flex flex-col gap-4">
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
                  <Label htmlFor="latitude">Latitude <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="latitude" type="number" step="any" placeholder="e.g. 37.9838" {...register('latitude')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="longitude">Longitude <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="longitude" type="number" step="any" placeholder="e.g. 23.7275" {...register('longitude')} />
                </div>
              </div>
            </div>
          </section>

          {/* ── Hotels ── */}
          <section>
            <SectionHeading>Hotels <span className="normal-case font-normal text-muted-foreground">(optional)</span></SectionHeading>
            <div className="flex flex-col gap-4">
              {hotelFields.map((field, hotelIdx) => {
                const existingImages = initialData?.hotels.find((h) => h.id === field._hotel_id)?.images ?? []
                return (
                  <HotelBlock
                    key={field.id}
                    control={control}
                    register={register}
                    index={hotelIdx}
                    onRemove={() => {
                      removeHotel(hotelIdx)
                      setHotelImageSets((prev) => prev.filter((_, i) => i !== hotelIdx))
                    }}
                    errors={errors}
                    allAmenities={allAmenities}
                    existingImages={existingImages}
                    imageSet={hotelImageSets[hotelIdx] ?? { keepIds: [], newFiles: [], newPreviews: [] }}
                    onImageSetChange={(v) =>
                      setHotelImageSets((prev) => {
                        const next = [...prev]
                        next[hotelIdx] = v
                        return next
                      })
                    }
                  />
                )
              })}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  appendHotel({ _hotel_id: undefined, name: '', description: '', stars: 3, amenity_ids: [], rooms: [] })
                  setHotelImageSets((prev) => [...prev, { keepIds: [], newFiles: [], newPreviews: [] }])
                }}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Hotel
              </Button>
            </div>
          </section>

          {/* ── Transfers ── */}
          <section>
            <SectionHeading>Transfers <span className="normal-case font-normal text-muted-foreground">(optional)</span></SectionHeading>
            <div className="flex flex-col gap-3">
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
                    <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
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
            </div>
          </section>

          {/* ── Submit ── */}
          <div className="flex justify-end pt-2 border-t border-border">
            <Button type="submit" disabled={mutation.isPending} size="lg">
              {mutation.isPending ? 'Saving…' : tourId ? 'Update Tour' : 'Create Tour'}
            </Button>
          </div>

        </form>
      </div>
    </PageShell>
  )
}

// ---- Hotel block sub-component ----
function HotelBlock({
  control, register, index, onRemove, errors, allAmenities,
  existingImages, imageSet, onImageSetChange,
}: {
  control: ReturnType<typeof useForm<TourFormData>>['control']
  register: ReturnType<typeof useForm<TourFormData>>['register']
  index: number
  onRemove: () => void
  errors: ReturnType<typeof useForm<TourFormData>>['formState']['errors']
  allAmenities: { id: string; name: string }[]
  existingImages: { id: string; image: string; order: number }[]
  imageSet: HotelImageSet
  onImageSetChange: (v: HotelImageSet) => void
}) {
  const { fields: roomFields, append: appendRoom, remove: removeRoom } = useFieldArray({ control, name: `hotels.${index}.rooms` })
  const imgInputRef = useRef<HTMLInputElement>(null)

  const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const previews = files.map((f) => URL.createObjectURL(f))
    onImageSetChange({
      ...imageSet,
      newFiles: [...imageSet.newFiles, ...files],
      newPreviews: [...imageSet.newPreviews, ...previews],
    })
    e.target.value = ''
  }

  const removeExisting = (id: string) => {
    onImageSetChange({ ...imageSet, keepIds: imageSet.keepIds.filter((k) => k !== id) })
  }

  const removeNew = (idx: number) => {
    URL.revokeObjectURL(imageSet.newPreviews[idx])
    onImageSetChange({
      ...imageSet,
      newFiles: imageSet.newFiles.filter((_, i) => i !== idx),
      newPreviews: imageSet.newPreviews.filter((_, i) => i !== idx),
    })
  }

  const keptExisting = existingImages.filter((img) => imageSet.keepIds.includes(img.id))

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
          <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Textarea rows={2} {...register(`hotels.${index}.description`)} />
        </div>

        {allAmenities.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amenities</Label>
            <Controller
              control={control}
              name={`hotels.${index}.amenity_ids`}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {allAmenities.map((amenity) => {
                    const checked = (field.value ?? []).includes(amenity.id)
                    return (
                      <label
                        key={amenity.id}
                        className={cn(
                          'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors',
                          checked
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-muted'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => {
                            const current = field.value ?? []
                            field.onChange(
                              checked
                                ? current.filter((id) => id !== amenity.id)
                                : [...current, amenity.id]
                            )
                          }}
                        />
                        {amenity.name}
                      </label>
                    )
                  })}
                </div>
              )}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Photos</Label>
          {(keptExisting.length > 0 || imageSet.newPreviews.length > 0) && (
            <div className="grid grid-cols-3 gap-2">
              {keptExisting.map((img) => (
                <div key={img.id} className="relative aspect-video rounded-md overflow-hidden bg-muted group">
                  <img src={img.image} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExisting(img.id)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {imageSet.newPreviews.map((src, i) => (
                <div key={src} className="relative aspect-video rounded-md overflow-hidden bg-muted group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNew(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => imgInputRef.current?.click()}
            className="flex items-center gap-2 text-sm text-muted-foreground border border-dashed border-border rounded-md px-3 py-2 hover:bg-muted transition-colors w-fit"
          >
            <Upload className="w-4 h-4" />
            Add photos
          </button>
          <input
            ref={imgInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handleNewImages}
          />
        </div>

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
                  <Label className="text-xs">Ref. price/night ($)</Label>
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
