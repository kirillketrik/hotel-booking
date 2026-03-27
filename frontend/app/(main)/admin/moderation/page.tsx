'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  ExternalLink,
  Search,
} from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { useAuthStore } from '@/lib/store'
import { apiEndpoints } from '@/lib/api'
import type { Agency, Tour, PaginatedResponse } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

const STATUS_FILTERS: StatusFilter[] = ['all', 'pending', 'approved', 'rejected']

function statusBadgeVariant(status: string) {
  if (status === 'approved') return 'default'
  if (status === 'rejected') return 'destructive'
  return 'secondary'
}

function StatusFilter({
  value,
  onChange,
}: {
  value: StatusFilter
  onChange: (v: StatusFilter) => void
}) {
  return (
    <div className="flex gap-2">
      {STATUS_FILTERS.map((f) => (
        <Button
          key={f}
          variant={value === f ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(f)}
          className="capitalize"
        >
          {f}
        </Button>
      ))}
    </div>
  )
}

function useDebounce(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function SearchOrdering({
  search,
  onSearch,
  ordering,
  onOrdering,
  orderingOptions,
}: {
  search: string
  onSearch: (v: string) => void
  ordering: string
  onOrdering: (v: string) => void
  orderingOptions: { value: string; label: string }[]
}) {
  return (
    <div className="flex gap-2 flex-1">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <Select value={ordering} onValueChange={onOrdering}>
        <SelectTrigger className="h-8 w-44 text-sm">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {orderingOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (reason: string) => void
  isPending: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject</DialogTitle>
          <DialogDescription>
            Provide an optional reason that will be visible to the agency.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Reason for rejection (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              onConfirm(reason)
              setReason('')
            }}
          >
            Confirm Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const AGENCY_ORDERING_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: '-name', label: 'Name Z–A' },
  { value: 'status', label: 'Status' },
]

function AgenciesTab() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [ordering, setOrdering] = useState('-created_at')
  const search = useDebounce(searchInput)

  const params: Record<string, unknown> = { ordering }
  if (statusFilter !== 'all') params.status = statusFilter
  if (search) params.search = search

  const { data, isLoading } = useQuery({
    queryKey: ['admin-agencies', statusFilter, search, ordering],
    queryFn: (): Promise<Agency[]> =>
      apiEndpoints.admin.agencies.list(params).then((r) => {
        const d = r.data as Agency[] | PaginatedResponse<Agency>
        return Array.isArray(d) ? d : (d.results ?? [])
      }),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiEndpoints.agencies.approve(id),
    onSuccess: () => {
      toast.success('Agency approved')
      qc.invalidateQueries({ queryKey: ['admin-agencies'] })
    },
    onError: () => toast.error('Failed to approve agency'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiEndpoints.agencies.reject(id, reason),
    onSuccess: () => {
      toast.success('Agency rejected')
      setRejectTarget(null)
      qc.invalidateQueries({ queryKey: ['admin-agencies'] })
    },
    onError: () => toast.error('Failed to reject agency'),
  })

  const agencies = data ?? []

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        <SearchOrdering
          search={searchInput}
          onSearch={setSearchInput}
          ordering={ordering}
          onOrdering={setOrdering}
          orderingOptions={AGENCY_ORDERING_OPTIONS}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64 mt-1" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : agencies.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No {statusFilter === 'all' ? '' : statusFilter} agencies
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {agencies.map((agency) => (
            <Card key={agency.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <Link
                        href={`/agencies/${agency.id}`}
                        className="font-semibold text-base hover:underline flex items-center gap-1"
                      >
                        {agency.name}
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </Link>
                      <Badge variant={statusBadgeVariant(agency.status)} className="capitalize">
                        {agency.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {agency.description}
                    </CardDescription>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted {new Date(agency.created_at).toLocaleDateString()}
                    </p>
                    {agency.rejection_reason && (
                      <p className="text-xs text-destructive mt-1">
                        Reason: {agency.rejection_reason}
                      </p>
                    )}
                  </div>
                  {agency.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRejectTarget(agency.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(agency.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(v) => !v && setRejectTarget(null)}
        onConfirm={(reason) =>
          rejectTarget && rejectMutation.mutate({ id: rejectTarget, reason })
        }
        isPending={rejectMutation.isPending}
      />
    </div>
  )
}

const TOUR_ORDERING_OPTIONS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: 'price', label: 'Price low–high' },
  { value: '-price', label: 'Price high–low' },
  { value: 'start_date', label: 'Start date asc' },
  { value: '-start_date', label: 'Start date desc' },
  { value: 'duration_days', label: 'Duration short–long' },
  { value: '-duration_days', label: 'Duration long–short' },
]

function ToursTab() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [rejectTarget, setRejectTarget] = useState<Tour | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [ordering, setOrdering] = useState('-created_at')
  const search = useDebounce(searchInput)

  const params: Record<string, unknown> = { ordering }
  if (statusFilter !== 'all') params.status = statusFilter
  if (search) params.search = search

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tours', statusFilter, search, ordering],
    queryFn: (): Promise<Tour[]> =>
      apiEndpoints.admin.tours.list(params).then((r) => {
        const d = r.data as Tour[] | PaginatedResponse<Tour>
        return Array.isArray(d) ? d : (d.results ?? [])
      }),
  })

  const approveMutation = useMutation({
    mutationFn: (tour: Tour) =>
      apiEndpoints.tours.approve(tour.agency, tour.id),
    onSuccess: () => {
      toast.success('Tour approved')
      qc.invalidateQueries({ queryKey: ['admin-tours'] })
    },
    onError: () => toast.error('Failed to approve tour'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ tour, reason }: { tour: Tour; reason: string }) =>
      apiEndpoints.tours.reject(tour.agency, tour.id, reason),
    onSuccess: () => {
      toast.success('Tour rejected')
      setRejectTarget(null)
      qc.invalidateQueries({ queryKey: ['admin-tours'] })
    },
    onError: () => toast.error('Failed to reject tour'),
  })

  const tours = data ?? []

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        <SearchOrdering
          search={searchInput}
          onSearch={setSearchInput}
          ordering={ordering}
          onOrdering={setOrdering}
          orderingOptions={TOUR_ORDERING_OPTIONS}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32 mt-1" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : tours.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No {statusFilter === 'all' ? '' : statusFilter} tours
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tours.map((tour) => (
            <Card key={tour.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/tours/${tour.id}`}
                        className="font-semibold text-base hover:underline flex items-center gap-1"
                      >
                        {tour.title}
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </Link>
                      <Badge variant={statusBadgeVariant(tour.status)} className="capitalize">
                        {tour.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                      <Link
                        href={`/agencies/${tour.agency}`}
                        className="flex items-center gap-1 hover:underline"
                      >
                        <Building2 className="w-3 h-3" />
                        {tour.agency_name}
                      </Link>
                      {tour.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {tour.location.city}, {tour.location.country}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {tour.price}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(tour.start_date).toLocaleDateString()} –{' '}
                        {new Date(tour.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    {tour.rejection_reason && (
                      <p className="text-xs text-destructive mt-1">
                        Reason: {tour.rejection_reason}
                      </p>
                    )}
                  </div>
                  {tour.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRejectTarget(tour)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(tour)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(v) => !v && setRejectTarget(null)}
        onConfirm={(reason) =>
          rejectTarget && rejectMutation.mutate({ tour: rejectTarget, reason })
        }
        isPending={rejectMutation.isPending}
      />
    </div>
  )
}

export default function AdminModerationPage() {
  const { user, isStaff } = useAuthStore()

  if (!user || !isStaff()) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to access this page.
          </p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Moderation</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and approve pending agencies and tours
          </p>
        </div>

        <Tabs defaultValue="agencies">
          <TabsList className="mb-6">
            <TabsTrigger value="agencies">Agencies</TabsTrigger>
            <TabsTrigger value="tours">Tours</TabsTrigger>
          </TabsList>
          <TabsContent value="agencies">
            <AgenciesTab />
          </TabsContent>
          <TabsContent value="tours">
            <ToursTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}
