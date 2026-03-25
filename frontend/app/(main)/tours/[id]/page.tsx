'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiEndpoints } from '@/lib/api';
import { PageShell } from '@/components/page-shell';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Users, MapPin, AlertCircle, Plane, Pencil, Star, BedDouble, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import { useState } from 'react';
import type { Tour } from '@/lib/types';

async function fetchTour(tourId: string): Promise<Tour> {
  const res = await api.get(`/api/v1/tours/${tourId}/`);
  return res.data;
}

export default function TourDetailPage() {
  const params = useParams();
  const tourId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { isStaff } = useAuthStore();
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => fetchTour(tourId),
  });

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

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </PageShell>
    );
  }

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

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto p-6">
        {/* Cover image */}
        {tour.cover_image && (
          <div className="mb-6 rounded-lg overflow-hidden h-80 bg-muted">
            <img src={tour.cover_image} alt={tour.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{tour.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="w-4 h-4" />
              <span>{tour.location.city}, {tour.location.country}</span>
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-2">
            <p className="text-3xl font-bold text-primary">${tour.price}</p>
            <p className="text-xs text-muted-foreground">per person</p>
            <StatusBadge status={tour.status} />
            {tour.status === 'rejected' && tour.rejection_reason && (
              <p className="text-xs text-destructive max-w-[200px] text-right">
                {tour.rejection_reason}
              </p>
            )}
            <div className="flex items-center gap-2">
              {isStaff() && tour.status !== 'approved' && (
                <Button
                  size="sm"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                >
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
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-semibold text-sm">{tour.duration_days} days</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Adults</p>
                <p className="font-semibold text-sm">up to {tour.max_adults}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Children</p>
                <p className="font-semibold text-sm">up to {tour.max_children}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Dates</p>
                <p className="font-semibold text-sm">{tour.start_date} → {tour.end_date}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{tour.description}</p>
          </CardContent>
        </Card>

        {/* Hotels */}
        {tour.hotels.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Hotels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {tour.hotels.map((hotel) => (
                <div key={hotel.id} className="border-b last:border-0 pb-6 last:pb-0">
                  {/* Hotel header */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-base">{hotel.name}</h3>
                    <div className="flex items-center gap-0.5 text-yellow-500 shrink-0">
                      {Array.from({ length: hotel.stars }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{hotel.description}</p>

                  {/* Amenities */}
                  {hotel.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {hotel.amenities.map((a) => (
                        <span key={a.id} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {a.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rooms */}
                  {hotel.rooms.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Rooms</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {hotel.rooms.map((room) => (
                          <div key={room.id} className="flex items-start gap-2 border rounded-lg p-3">
                            <BedDouble className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium capitalize">{room.room_type}</p>
                                <p className="text-sm font-semibold text-primary shrink-0">${room.price_per_night}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{room.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Capacity: {room.capacity} · {room.quantity} available
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hotel images */}
                  {hotel.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {hotel.images.map((img) => (
                        <div key={img.id} className="aspect-video rounded-lg overflow-hidden bg-muted">
                          <img src={img.image} alt={hotel.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Transfers */}
        {tour.transfers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Transfers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tour.transfers.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-4 text-sm border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start gap-2">
                    <Plane className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium capitalize">{t.transfer_type}</p>
                      <p className="text-muted-foreground">{t.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {t.is_included
                      ? <span className="text-green-600 font-medium">Included</span>
                      : <span className="font-medium">${t.price}</span>
                    }
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Gallery */}
        {tour.images.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Gallery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {tour.images.map((img) => (
                  <div key={img.id} className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <img src={img.image} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
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
    </PageShell>
  );
}
