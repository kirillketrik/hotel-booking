'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, apiEndpoints } from '@/lib/api';
import { PageShell } from '@/components/page-shell';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  ArrowLeft,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  MapPin,
  Pencil,
  Plane,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  XCircle,
  Images,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import type { Tour, Hotel, TourTransfer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

async function fetchTour(tourId: string): Promise<Tour> {
  const res = await api.get(`/api/v1/tours/${tourId}/`);
  return res.data;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'w-3.5 h-3.5',
            i < stars ? 'fill-yellow-400 text-yellow-400' : 'fill-muted text-muted'
          )}
        />
      ))}
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card">
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className="font-semibold text-sm">{value}</p>
      </div>
    </div>
  );
}

function HotelCard({ hotel }: { hotel: Hotel }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {hotel.images.length > 0 && (
        <div className="grid grid-cols-3 gap-0.5 h-36">
          <div className="col-span-2 overflow-hidden">
            <img
              src={hotel.images[0].image}
              alt={hotel.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            {hotel.images.slice(1, 3).map((img, i) => (
              <div key={img.id} className="flex-1 overflow-hidden relative">
                <img
                  src={img.image}
                  alt={hotel.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
                {i === 1 && hotel.images.length > 3 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      +{hotel.images.length - 3}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-base">{hotel.name}</h3>
          <StarRating stars={hotel.stars} />
        </div>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{hotel.description}</p>

        {hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {hotel.amenities.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full"
              >
                {a.name}
              </span>
            ))}
          </div>
        )}

        {hotel.rooms.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Room options
            </p>
            <div className="space-y-2">
              {hotel.rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BedDouble className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize">{room.room_type}</p>
                      <p className="text-xs text-muted-foreground truncate">{room.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {room.capacity} guests · {room.quantity} available
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-sm text-primary">${room.price_per_night}</p>
                    <p className="text-xs text-muted-foreground">/ night</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TransferItem({ transfer }: { transfer: TourTransfer }) {
  const TRANSFER_LABELS: Record<string, string> = {
    airport: 'Airport Transfer',
    hotel: 'Hotel Transfer',
    city: 'City Transfer',
    custom: 'Custom Transfer',
  };

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 p-1.5 rounded-lg shrink-0',
            transfer.is_included
              ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Plane className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="font-medium text-sm">
            {TRANSFER_LABELS[transfer.transfer_type] ?? transfer.transfer_type}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{transfer.description}</p>
        </div>
      </div>
      {transfer.is_included ? (
        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
          <Check className="w-3.5 h-3.5" />
          Included
        </span>
      ) : (
        <span className="shrink-0 text-sm font-semibold">+${transfer.price}</span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TourDetailPage() {
  const params = useParams();
  const tourId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, isStaff } = useAuthStore();
  const qc = useQueryClient();
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => fetchTour(tourId),
  });

  const { data: employees } = useQuery({
    queryKey: ['agency-employees', tour?.agency],
    queryFn: () =>
      apiEndpoints.employees.list(tour!.agency).then((r) => r.data.results ?? r.data),
    enabled: !!tour?.agency && !!user,
  });

  const myRole =
    employees?.find((e: { user: string; role: string }) => e.user === user?.id)?.role ?? null;
  const isMember = myRole !== null;
  const canManageTour = isStaff() || isMember;
  const canDeleteTour = isStaff() || myRole === 'owner' || myRole === 'admin';

  const approveMutation = useMutation({
    mutationFn: () => apiEndpoints.tours.approve(tour!.agency, tourId),
    onSuccess: () => {
      toast.success('Tour approved');
      qc.invalidateQueries({ queryKey: ['tour', tourId] });
    },
    onError: () => toast.error('Failed to approve tour'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => apiEndpoints.tours.reject(tour!.agency, tourId, reason),
    onSuccess: () => {
      toast.success('Tour rejected');
      setRejectOpen(false);
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['tour', tourId] });
    },
    onError: () => toast.error('Failed to reject tour'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiEndpoints.tours.delete(tour!.agency, tourId),
    onSuccess: () => {
      toast.success('Tour deleted');
      qc.invalidateQueries({ queryKey: ['agency-tours', tour!.agency] });
      router.push(`/agencies/${tour!.agency}`);
    },
    onError: () => toast.error('Failed to delete tour'),
  });

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-[420px] w-full rounded-2xl" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-5 w-1/3" />
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-40 rounded-xl" />
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────────────
  if (!tour) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto p-6 text-center py-20">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Tour Not Found</h1>
          <p className="text-muted-foreground">This tour is no longer available.</p>
        </div>
      </PageShell>
    );
  }

  const allImages = [
    ...(tour.cover_image ? [{ id: 'cover', image: tour.cover_image, order: -1 }] : []),
    ...tour.images,
  ];

  const startDate = new Date(tour.start_date);
  const endDate = new Date(tour.end_date);
  const includedTransfers = tour.transfers.filter((t) => t.is_included);
  const extraTransfers = tour.transfers.filter((t) => !t.is_included);

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
          <Link href="/agencies" className="hover:text-foreground transition-colors">
            Agencies
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            href={`/agencies/${tour.agency}`}
            className="hover:text-foreground transition-colors"
          >
            {tour.agency_name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{tour.title}</span>
        </div>

        {/* Staff / member action bar */}
        {canManageTour && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 rounded-xl border bg-muted/40">
            <div className="flex items-center gap-2">
              <StatusBadge status={tour.status} />
              {tour.status === 'rejected' && tour.rejection_reason && (
                <p className="text-xs text-destructive">Reason: {tour.rejection_reason}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isStaff() && tour.status !== 'approved' && (
                <Button size="sm" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Approve
                </Button>
              )}
              {isStaff() && tour.status !== 'rejected' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Reject
                </Button>
              )}
              <Link href={`/agencies/${tour.agency}/tours/${tourId}/edit`}>
                <Button size="sm" variant="outline">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              </Link>
              {canDeleteTour && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Photo hero */}
        {allImages.length > 0 && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            {allImages.length === 1 ? (
              <div className="h-[420px]">
                <img
                  src={allImages[0].image}
                  alt={tour.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="grid grid-cols-4 grid-rows-2 gap-1.5 h-[420px]">
                {/* Main large image */}
                <div
                  className="col-span-2 row-span-2 overflow-hidden cursor-pointer"
                  onClick={() => { setGalleryIndex(0); setGalleryOpen(true); }}
                >
                  <img
                    src={allImages[0].image}
                    alt={tour.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                {/* Side thumbnails */}
                {allImages.slice(1, 5).map((img, i) => (
                  <div
                    key={img.id}
                    className="overflow-hidden relative cursor-pointer"
                    onClick={() => { setGalleryIndex(i + 1); setGalleryOpen(true); }}
                  >
                    <img
                      src={img.image}
                      alt={tour.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    {i === 3 && allImages.length > 5 && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                        <Images className="w-5 h-5 text-white" />
                        <span className="text-white text-sm font-semibold">
                          +{allImages.length - 5} more
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main layout: content + sidebar */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">

          {/* ── Left content column ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Title + agency */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">{tour.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {tour.location.city}, {tour.location.country}
                </span>
                <Link
                  href={`/agencies/${tour.agency}`}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  {tour.agency_name}
                </Link>
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatPill
                icon={<Clock className="w-4 h-4" />}
                label="Duration"
                value={`${tour.duration_days} day${tour.duration_days !== 1 ? 's' : ''}`}
              />
              <StatPill
                icon={<CalendarDays className="w-4 h-4" />}
                label="Dates"
                value={`${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')}`}
              />
              <StatPill
                icon={<Users className="w-4 h-4" />}
                label="Adults"
                value={`Up to ${tour.max_adults}`}
              />
              <StatPill
                icon={<Users className="w-4 h-4" />}
                label="Children"
                value={`Up to ${tour.max_children}`}
              />
            </div>

            <Separator />

            {/* Overview */}
            <section>
              <h2 className="text-xl font-semibold mb-3">Overview</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {tour.description}
              </p>
            </section>

            {/* What's included / extra */}
            {tour.transfers.length > 0 && (
              <>
                <Separator />
                <section>
                  <h2 className="text-xl font-semibold mb-4">Transfers</h2>
                  {includedTransfers.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Included
                      </p>
                      <div className="rounded-xl border bg-card px-4">
                        {includedTransfers.map((t) => (
                          <TransferItem key={t.id} transfer={t} />
                        ))}
                      </div>
                    </div>
                  )}
                  {extraTransfers.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Available extras
                      </p>
                      <div className="rounded-xl border bg-card px-4">
                        {extraTransfers.map((t) => (
                          <TransferItem key={t.id} transfer={t} />
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* Hotels */}
            {tour.hotels.length > 0 && (
              <>
                <Separator />
                <section>
                  <h2 className="text-xl font-semibold mb-4">
                    Accommodation
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {tour.hotels.length} hotel{tour.hotels.length !== 1 ? 's' : ''}
                    </span>
                  </h2>
                  <div className="space-y-4">
                    {tour.hotels.map((hotel) => (
                      <HotelCard key={hotel.id} hotel={hotel} />
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Gallery (tour images, not hotel images) */}
            {tour.images.length > 0 && (
              <>
                <Separator />
                <section>
                  <h2 className="text-xl font-semibold mb-4">Gallery</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {tour.images.map((img, i) => (
                      <div
                        key={img.id}
                        className="aspect-video rounded-xl overflow-hidden cursor-pointer"
                        onClick={() => {
                          setGalleryIndex(
                            tour.cover_image ? i + 1 : i
                          );
                          setGalleryOpen(true);
                        }}
                      >
                        <img
                          src={img.image}
                          alt=""
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* ── Right sticky booking card ── */}
          <div className="lg:sticky lg:top-6">
            <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-5">
              {/* Price */}
              <div>
                <p className="text-3xl font-bold text-primary">
                  ${tour.price}
                  <span className="text-base font-normal text-muted-foreground ml-1">/ person</span>
                </p>
              </div>

              <Separator />

              {/* Trip details */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    Start date
                  </span>
                  <span className="font-medium">{format(startDate, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    End date
                  </span>
                  <span className="font-medium">{format(endDate, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Duration
                  </span>
                  <span className="font-medium">{tour.duration_days} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Group size
                  </span>
                  <span className="font-medium">
                    {tour.max_adults} adults, {tour.max_children} children
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Destination
                  </span>
                  <span className="font-medium">{tour.location.city}, {tour.location.country}</span>
                </div>
              </div>

              <Separator />

              {/* Included transfers summary */}
              {includedTransfers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Included transfers
                  </p>
                  <ul className="space-y-1">
                    {includedTransfers.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span>
                          {t.transfer_type.charAt(0).toUpperCase() + t.transfer_type.slice(1)} transfer
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Separator className="mt-4" />
                </div>
              )}

              {/* Agency link */}
              <Link
                href={`/agencies/${tour.agency}`}
                className="flex items-center justify-between text-sm group"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  Offered by <span className="font-medium text-foreground ml-1">{tour.agency_name}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox gallery ── */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-4xl p-2 bg-black border-black">
          <div className="relative">
            <img
              src={allImages[galleryIndex]?.image}
              alt=""
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
            {allImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all',
                      i === galleryIndex ? 'bg-white w-4' : 'bg-white/50'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto p-1">
              {allImages.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setGalleryIndex(i)}
                  className={cn(
                    'shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all',
                    i === galleryIndex ? 'border-white' : 'border-transparent opacity-60'
                  )}
                >
                  <img src={img.image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Tour</DialogTitle>
            <DialogDescription>
              Provide an optional reason that will be visible to the agency.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate(rejectReason)}
            >
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tour</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{tour.title}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
