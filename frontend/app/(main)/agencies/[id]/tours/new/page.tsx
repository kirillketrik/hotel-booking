'use client'

import { useParams } from 'next/navigation'
import { PageShell } from '@/components/page-shell'
import { TourForm } from '@/components/tour-form'

export default function CreateTourPage() {
  const params = useParams()
  const agencyId = Array.isArray(params.id) ? params.id[0] : params.id

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <TourForm agencyId={agencyId} />
      </div>
    </PageShell>
  )
}
