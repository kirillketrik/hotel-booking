'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageShell } from '@/components/page-shell'
import { TourCard, TourCardSkeleton } from '@/components/tour-card'
import { api } from '@/lib/api'
import type { Tour, PaginatedResponse } from '@/lib/types'

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

  return (
    <PageShell>
      {/* Hero */}
      <section className="bg-primary py-14 px-4">
        <div className="max-w-3xl mx-auto text-center flex flex-col gap-5">
          <h1 className="text-3xl sm:text-4xl font-semibold text-primary-foreground text-balance">
            Discover Unforgettable Tours
          </h1>
          <p className="text-primary-foreground/80 text-base leading-relaxed">
            Browse curated tours from verified travel agencies around the world.
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); applyFilters() }}
            className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto w-full"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tours, destinations..."
                value={pendingFilters.search}
                onChange={(e) => setPendingFilters((f) => ({ ...f, search: e.target.value }))}
                className="pl-9 bg-card border-border h-10"
              />
            </div>
            <Button type="submit" variant="secondary" className="h-10 shrink-0">
              Search
            </Button>
          </form>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside
            className={`${sidebarOpen ? 'fixed inset-0 z-40 bg-background overflow-y-auto' : 'hidden'} lg:flex lg:static lg:z-auto lg:bg-transparent lg:overflow-visible flex-col w-full lg:w-64 shrink-0`}
          >
            <div className="p-4 lg:p-0">
              {/* Mobile header */}
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <span className="font-semibold">Filters</span>
                <button onClick={() => setSidebarOpen(false)} aria-label="Close filters">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Filters</span>
                  <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground">
                    Reset
                  </button>
                </div>

                <FilterField label="Country">
                  <Input
                    placeholder="e.g. France"
                    value={pendingFilters.country}
                    onChange={(e) => setPendingFilters((f) => ({ ...f, country: e.target.value }))}
                  />
                </FilterField>

                <FilterField label="City">
                  <Input
                    placeholder="e.g. Paris"
                    value={pendingFilters.city}
                    onChange={(e) => setPendingFilters((f) => ({ ...f, city: e.target.value }))}
                  />
                </FilterField>

                <FilterField label="Price range ($)">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={pendingFilters.price_min}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, price_min: e.target.value }))}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={pendingFilters.price_max}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, price_max: e.target.value }))}
                    />
                  </div>
                </FilterField>

                <FilterField label="Start date">
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={pendingFilters.start_date_from}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, start_date_from: e.target.value }))}
                    />
                    <Input
                      type="date"
                      value={pendingFilters.start_date_to}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, start_date_to: e.target.value }))}
                    />
                  </div>
                </FilterField>

                <FilterField label="Duration (days)">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={pendingFilters.duration_min}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, duration_min: e.target.value }))}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={pendingFilters.duration_max}
                      onChange={(e) => setPendingFilters((f) => ({ ...f, duration_max: e.target.value }))}
                    />
                  </div>
                </FilterField>

                <Button onClick={applyFilters} className="w-full">Apply Filters</Button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden flex items-center gap-1.5"
                  onClick={() => setSidebarOpen(true)}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                </Button>
                {data && (
                  <span className="text-sm text-muted-foreground">
                    {data.count} tour{data.count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <Select
                value={pendingFilters.ordering}
                onValueChange={(v) => {
                  setPendingFilters((f) => ({ ...f, ordering: v }))
                  setFilters((f) => ({ ...f, ordering: v }))
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-44 h-8 text-sm">
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

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <TourCardSkeleton key={i} />)}
              </div>
            ) : tours.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Search className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-lg font-medium text-foreground">No tours found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or search query.</p>
                <Button variant="outline" onClick={resetFilters}>Clear filters</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {tours.map((tour) => <TourCard key={tour.id} tour={tour} />)}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  )
}
