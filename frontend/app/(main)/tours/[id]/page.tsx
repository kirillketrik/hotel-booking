'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageShell } from '@/components/page-shell';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Users, MapPin, AlertCircle, Plane } from 'lucide-react';
import type { Tour } from '@/lib/types';

async function fetchTour(tourId: string): Promise<Tour> {
  const res = await api.get(`/api/v1/tours/${tourId}/`);
  return res.data;
}

export default function TourDetailPage() {
  const params = useParams();
  const tourId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: () => fetchTour(tourId),
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
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold text-primary">${tour.price}</p>
            <p className="text-xs text-muted-foreground">per person</p>
            <div className="mt-2">
              <StatusBadge status={tour.status} />
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

        {/* Hotels */}
        {tour.hotels.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Hotels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tour.hotels.map((hotel) => (
                <div key={hotel.id} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold">{hotel.name}</p>
                    <p className="text-sm text-muted-foreground">{'★'.repeat(hotel.stars)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{hotel.description}</p>
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
    </PageShell>
  );
}
