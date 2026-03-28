'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiEndpoints } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { PageShell } from '@/components/page-shell'
import { TourCard, TourCardSkeleton } from '@/components/tour-card'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Tour, PaginatedResponse } from '@/lib/types'

export default function WishlistPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  if (!user) {
    router.replace('/login')
    return null
  }

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () =>
      apiEndpoints.wishlist.list().then((r) => {
        const d = r.data
        return (Array.isArray(d) ? d : (d as PaginatedResponse<Tour>).results ?? []) as Tour[]
      }),
  })

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            <h1 className="text-2xl font-bold tracking-tight">Saved Tours</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {data ? `${data.length} saved tour${data.length !== 1 ? 's' : ''}` : 'Tours you\'ve hearted for later'}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <TourCardSkeleton key={i} />)}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <Heart className="w-8 h-8 text-red-300" />
            </div>
            <h3 className="text-lg font-semibold">No saved tours yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Tap the heart on any tour to save it here for later.
            </p>
            <Button asChild variant="outline">
              <Link href="/">Browse Tours</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {data.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
