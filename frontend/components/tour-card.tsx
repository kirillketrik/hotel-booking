import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Calendar, Clock, Users } from 'lucide-react'
import type { Tour } from '@/lib/types'
import { StatusBadge } from './status-badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface TourCardProps {
  tour: Tour
  showStatus?: boolean
  className?: string
}

export function TourCard({ tour, showStatus = false, className }: TourCardProps) {
  return (
    <Link
      href={`/tours/${tour.id}`}
      className={cn(
        'group flex flex-col bg-card border border-border rounded-lg overflow-hidden',
        'hover:shadow-sm transition-shadow duration-200',
        className
      )}
    >
      {/* Cover image — 16:9 */}
      <div className="relative w-full aspect-video overflow-hidden bg-muted">
        {tour.cover_image ? (
          <Image
            src={tour.cover_image}
            alt={tour.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
        {showStatus && (
          <div className="absolute top-2 right-2">
            <StatusBadge status={tour.status} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4 flex-1">
        <h3 className="font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {tour.title}
        </h3>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            {tour.location.city}, {tour.location.country}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(tour.start_date), 'MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {tour.duration_days}d
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {tour.max_adults} adults
          </span>
          <span className="ml-auto font-semibold text-primary text-sm">
            ${Number(tour.price).toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  )
}

export function TourCardSkeleton() {
  return (
    <div className="flex flex-col bg-card border border-border rounded-lg overflow-hidden animate-pulse">
      <div className="w-full aspect-video bg-muted" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-full mt-2" />
      </div>
    </div>
  )
}
