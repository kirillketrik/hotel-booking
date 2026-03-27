'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageShell } from '@/components/page-shell'
import { TourCard, TourCardSkeleton } from '@/components/tour-card'
import { api } from '@/lib/api'
import type { Tour, PaginatedResponse } from '@/lib/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12

interface Filters {
  search: string
  country: string
  city: string
  price_min: string
  price_max: string
  start_date_from: string
  start_date_to: string
  duration_min: string
  duration_max: string
  ordering: string
}

const defaultFilters: Filters = {
  search: '',
  country: '',
  city: '',
  price_min: '',
  price_max: '',
  start_date_from: '',
  start_date_to: '',
  duration_min: '',
  duration_max: '',
  ordering: '-created_at',
}

// Public catalog: list all approved tours across all agencies
async function fetchPublicTours(filters: Filters, page: number) {
  const params: Record<string, string | number> = {
    status: 'approved',
    page,
    page_size: PAGE_SIZE,
  }
  Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
  const res = await api.get('/api/v1/tours/', { params })
  return res.data as PaginatedResponse<Tour>
}

const QUICK_DESTINATIONS = [
  'Italy', 'Japan', 'France', 'Thailand', 'Spain', 'Greece', 'Turkey', 'Morocco',
]

// Keys that are not "active" when they equal the default
const FILTER_LABELS: Record<keyof Filters, string> = {
  search: 'Search',
  country: 'Country',
  city: 'City',
  price_min: 'Min price',
  price_max: 'Max price',
  start_date_from: 'From date',
  start_date_to: 'To date',
  duration_min: 'Min days',
  duration_max: 'Max days',
  ordering: 'Sort',
}

function getActiveFilterKeys(filters: Filters): (keyof Filters)[] {
  return (Object.keys(filters) as (keyof Filters)[]).filter(
    (k) => filters[k] !== defaultFilters[k]
  )
}

export default function HomePage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [pendingFilters, setPendingFilters] = useState<Filters>(defaultFilters)
  const [page, setPage] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['tours', 'public', filters, page],
    queryFn: () => fetchPublicTours(filters, page),
    placeholderData: (prev) => prev,
  })

  const applyFilters = useCallback(() => {
    setFilters(pendingFilters)
    setPage(1)
    setSidebarOpen(false)
  }, [pendingFilters])

  const resetFilters = () => {
    setPendingFilters(defaultFilters)
    setFilters(defaultFilters)
    setPage(1)
  }

  const tours = data?.results ?? []
  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0
  const activeKeys = getActiveFilterKeys(filters)
  const activeFilterCount = activeKeys.filter((k) => k !== 'ordering').length

  // Pagination page numbers with ellipsis
  function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: (number | 'ellipsis')[] = []
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, 'ellipsis', total)
    } else if (current >= total - 3) {
      pages.push(1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total)
    } else {
      pages.push(1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total)
    }
    return pages
  }

  return (
    <PageShell>
      {/* ── Hero ── */}
      <section className="relative min-h-[480px] overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white opacity-10 pointer-events-none" />
        <div className="absolute top-8 right-16 w-64 h-64 rounded-full bg-white opacity-10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-48 rounded-full bg-white opacity-10 pointer-events-none" />
        <div className="absolute -bottom-8 right-8 w-40 h-40 rounded-full bg-white opacity-10 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto flex flex-col items-center gap-6 py-20 px-4 w-full">
          {/* Eyebrow */}
          <p className="text-primary-foreground/60 text-xs tracking-widest uppercase font-medium">
            Explore the World
          </p>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-bold text-primary-foreground text-center text-balance leading-tight">
            Discover Your Next Adventure
          </h1>

          {/* Sub-text */}
          <p className="text-primary-foreground/70 text-lg text-center max-w-xl leading-relaxed">
            Browse curated tours from verified travel agencies around the world and book your dream trip today.
          </p>

          {/* Search bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); applyFilters() }}
            className="bg-white rounded-2xl shadow-xl p-2 flex gap-2 max-w-2xl w-full"
          >
            <div className="flex-1 flex items-center gap-2 px-3">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Destinations, tours..."
                value={pendingFilters.search}
                onChange={(e) => setPendingFilters((f) => ({ ...f, search: e.target.value }))}
                className="border-0 ring-0 focus-visible:ring-0 bg-transparent shadow-none p-0 h-9 text-sm placeholder:text-muted-foreground"
              />
            </div>
            <Button type="submit" variant="default" className="rounded-xl px-6 shrink-0">
              Search
            </Button>
          </form>

          {/* Quick destination chips */}
          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_DESTINATIONS.map((dest) => {
              const isActive = filters.country === dest
              return (
                <button
                  key={dest}
                  type="button"
                  onClick={() => {
                    const next = isActive ? '' : dest
                    setPendingFilters((f) => ({ ...f, country: next }))
                    setFilters((f) => ({ ...f, country: next }))
                    setPage(1)
                  }}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border transition',
                    isActive
                      ? 'bg-white text-primary font-medium border-white'
                      : 'bg-white/10 hover:bg-white/20 text-primary-foreground border-white/20'
                  )}
                >
                  {dest}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Below hero ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Mobile backdrop ── */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* ── Filter sidebar ── */}
          <aside
            className={cn(
              'lg:block lg:static lg:z-auto w-72 shrink-0',
              sidebarOpen
                ? 'fixed inset-0 z-50 bg-background overflow-y-auto'
                : 'hidden'
            )}
          >
            <div className="p-4 lg:p-0 lg:sticky lg:top-6">
              <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-foreground" />
                    <span className="font-semibold text-sm">Filters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeFilterCount > 0 && (
                      <button
                        onClick={resetFilters}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="lg:hidden p-0.5 rounded hover:bg-muted transition-colors"
                      aria-label="Close filters"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Country */}
                <div className="px-4 py-3 border-b flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Country</p>
                  <Input
                    placeholder="e.g. France"
                    value={pendingFilters.country}
                    onChange={(e) => setPendingFilters((f) => ({ ...f, country: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>

                {/* City */}
                <div className="px-4 py-3 border-b flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">City</p>
                  <Input
                    placeholder="e.g. Paris"
                    value={pendingFilters.city}
                    onChange={(e) => setPendingFilters((f) => ({ ...f, city: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Price range */}
                <div className="px-4 py-3 border-b flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Price Range</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min $"
                      value={pendingFilters.price_min}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, price_min: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Max $"
                      value={pendingFilters.price_max}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, price_max: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Start date */}
                <div className="px-4 py-3 border-b flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Start Date</p>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={pendingFilters.start_date_from}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, start_date_from: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="date"
                      value={pendingFilters.start_date_to}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, start_date_to: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="px-4 py-3 border-b flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Duration (days)</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={pendingFilters.duration_min}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, duration_min: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={pendingFilters.duration_max}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, duration_max: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Apply button */}
                <div className="px-4 py-3">
                  <Button onClick={applyFilters} className="w-full">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                {/* Mobile filters button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden flex items-center gap-1.5"
                  onClick={() => setSidebarOpen(true)}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>

                {/* Count */}
                {isLoading ? (
                  <Skeleton className="h-4 w-28" />
                ) : data ? (
                  <span className="text-sm text-muted-foreground">
                    {data.count} {data.count === 1 ? 'tour' : 'tours'} found
                  </span>
                ) : null}
              </div>

              {/* Sort */}
              <Select
                value={pendingFilters.ordering}
                onValueChange={(v) => {
                  setPendingFilters((f) => ({ ...f, ordering: v }))
                  setFilters((f) => ({ ...f, ordering: v }))
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-48 h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_at">Newest first</SelectItem>
                  <SelectItem value="created_at">Oldest first</SelectItem>
                  <SelectItem value="price">Price: low to high</SelectItem>
                  <SelectItem value="-price">Price: high to low</SelectItem>
                  <SelectItem value="start_date">Departure: soonest</SelectItem>
                  <SelectItem value="-start_date">Departure: latest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active filter chips */}
            {activeKeys.filter((k) => k !== 'ordering').length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1">
                {activeKeys
                  .filter((k) => k !== 'ordering')
                  .map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20"
                    >
                      {FILTER_LABELS[k]}: {filters[k]}
                      <button
                        onClick={() => {
                          const next = { ...filters, [k]: defaultFilters[k] }
                          setFilters(next)
                          setPendingFilters(next)
                          setPage(1)
                        }}
                        aria-label={`Remove ${FILTER_LABELS[k]} filter`}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}

            {/* Tour grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <TourCardSkeleton key={i} />
                ))}
              </div>
            ) : tours.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <Globe className="w-12 h-12 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold text-foreground">No tours found</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Try adjusting your filters or searching for a different destination.
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {tours.map((tour) => (
                  <TourCard key={tour.id} tour={tour} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-3 mt-4">
                <div className="flex items-center gap-1">
                  {/* Previous */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-9 p-0"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {/* Page numbers */}
                  {getPageNumbers(page, totalPages).map((p, idx) =>
                    p === 'ellipsis' ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="w-9 flex items-center justify-center text-sm text-muted-foreground select-none"
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="sm"
                        className="w-9 p-0"
                        onClick={() => setPage(p)}
                        aria-label={`Page ${p}`}
                        aria-current={p === page ? 'page' : undefined}
                      >
                        {p}
                      </Button>
                    )
                  )}

                  {/* Next */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-9 p-0"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
