'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageShell } from '@/components/page-shell'
import { TourForm } from '@/components/tour-form'
import { Skeleton } from '@/components/ui/skeleton'
import type { Tour } from '@/lib/types'

async function fetchTour(agencyId: string, tourId: string) {
  const res = await api.get(`/api/v1/agencies/${agencyId}/tours/${tourId}/`)
  return res.data
}

export default function EditTourPage() {
  const params = useParams()
  const agencyId = Array.isArray(params.id) ? params.id[0] : params.id
  const tourId = Array.isArray(params.tourId) ? params.tourId[0] : params.tourId

  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', agencyId, tourId],
    queryFn: () => fetchTour(agencyId, tourId),
  })

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageShell>
    )
  }

  if (!tour) {
    return (
      <PageShell>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Tour not found</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Edit Tour</h1>
          <p className="text-muted-foreground mt-1">Update tour details and pricing</p>
        </div>
        <TourForm agencyId={agencyId} initialTour={tour} />
      </div>
    </PageShell>
  )
}
