'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Building2, CalendarDays, Users } from 'lucide-react'
import { format } from 'date-fns'
import type { Tour } from '@/lib/types'
import { StatusBadge } from './status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
        'group flex flex-col rounded-xl overflow-hidden border bg-card shadow-sm',
        'hover:shadow-md transition-shadow duration-200',
        className
      )}
    >
      {/* Image area — 4:3 */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted">
        {tour.cover_image ? (
          <Image
            src={tour.cover_image}
            alt={tour.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
            <MapPin className="w-10 h-10 text-muted-foreground/40" />
          </div>
        )}

        {/* Status badge — top-left */}
        {showStatus && (
          <div className="absolute top-2 left-2">
            <StatusBadge status={tour.status} />
          </div>
        )}

        {/* Duration badge — top-right */}
        <div className="absolute top-2 right-2">
          <span className="text-xs font-semibold text-primary-foreground bg-primary/80 backdrop-blur-sm px-2 py-1 rounded-lg">
            {tour.duration_days} {tour.duration_days === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* Price badge — bottom-left */}
        <div className="absolute bottom-2 left-2">
          <span className="text-sm font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg">
            ${Number(tour.price).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Title */}
        <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {tour.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            {tour.location.city}, {tour.location.country}
          </span>
        </div>

        {/* Agency */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{tour.agency_name}</span>
        </div>

        {/* Bottom row */}
        <div className="mt-auto pt-2 border-t flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
            {format(new Date(tour.start_date), 'MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            {tour.max_adults} adults
          </span>
        </div>
      </div>
    </Link>
  )
}

export function TourCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden border bg-card shadow-sm animate-pulse">
      <Skeleton className="w-full aspect-[4/3] rounded-none" />
      <div className="p-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full mt-1" />
      </div>
    </div>
  )
}
