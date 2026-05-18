'use client'

import { useParams } from 'next/navigation'
import { TourDetailPage } from '@/components/tour-detail-page'

export default function AgencyTourDetailPage() {
  const params = useParams()
  const agencyId = (Array.isArray(params.id) ? params.id[0] : params.id) ?? ''

  return <TourDetailPage mode="manage" agencyId={agencyId} />
}
