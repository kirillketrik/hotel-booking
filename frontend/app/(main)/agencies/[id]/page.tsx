'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { apiEndpoints } from '@/lib/api'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/status-badge'
import { Plus, Users, BarChart3, CheckCircle2, Clock, XCircle, Trash2, Mail, UserPlus, Link2, Copy, ShieldCheck, Building2, MapPin, CalendarDays, Upload, Download, FileText, AlertCircle, Star } from 'lucide-react'
import { TourCard, TourCardSkeleton } from '@/components/tour-card'
import { AgencyReviewSection } from '@/components/agency-review-section'
import Image from 'next/image'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/store'
import type { Agency, AgencyEmployee, Booking, Invitation, PaginatedResponse, Tour } from '@/lib/types'
import React, { useState, useMemo } from "react";
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

const STATUS_BANNER: Record<string, { icon: React.ReactNode; text: string; className: string }> = {
  pending: {
    icon: <Clock className="w-4 h-4" />,
    text: 'Your agency is pending review. Tours, staff, and invitations will be available once approved.',
    className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  },
  rejected: {
    icon: <XCircle className="w-4 h-4" />,
    text: 'Your agency was rejected. Please update your agency details and resubmit.',
    className: 'bg-red-50 border-red-200 text-red-800',
  },
}

async function fetchAgency(id: string) {
  const res = await apiEndpoints.agencies.get(id)
  return res.data
}

async function fetchAgencyTours(id: string) {
  const res = await apiEndpoints.tours.list(id)
  return res.data.results || []
}

const BOOKING_STATUS_LABELS: Record<Booking['status'], string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

function AgencyBookingsTab({ agencyId, enabled }: { agencyId: string; enabled: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['agency-bookings', agencyId],
    queryFn: () =>
      apiEndpoints.agencyBookings
        .list(agencyId)
        .then((r) => {
          const d = r.data
          return (Array.isArray(d) ? d : (d as PaginatedResponse<Booking>).results ?? []) as Booking[]
        }),
    enabled,
  })

  const bookings = data ?? []

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground py-12">
          No bookings yet for this agency&apos;s tours.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <div key={booking.id} className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/tours/${booking.tour.id}`}
                className="font-medium hover:underline truncate"
              >
                {booking.tour.title}
              </Link>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                booking.status === 'paid' || booking.status === 'confirmed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : booking.status === 'pending_payment'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {BOOKING_STATUS_LABELS[booking.status]}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
              <span>{booking.user_full_name || booking.user_email}</span>
              <span>·</span>
              <span>{booking.adults_count} adult{booking.adults_count !== 1 ? 's' : ''}{booking.children_count > 0 ? `, ${booking.children_count} child${booking.children_count !== 1 ? 'ren' : ''}` : ''}</span>
              <span>·</span>
              <span>{format(new Date(booking.tour.start_date), 'MMM d, yyyy')}</span>
              {booking.contact_phone && <><span>·</span><span>{booking.contact_phone}</span></>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold">${parseFloat(booking.total_price).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(booking.created_at), 'MMM d, yyyy')}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AgencyDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const agencyId = Array.isArray(params.id) ? params.id[0] : params.id

  const { data: agency, isLoading: agencyLoading } = useQuery({
    queryKey: ['agency', agencyId],
    queryFn: () => fetchAgency(agencyId),
  })

  const { data: tours, isLoading: toursLoading } = useQuery({
    queryKey: ['agency-tours', agencyId],
    queryFn: () => fetchAgencyTours(agencyId),
  })

  const { user, isStaff } = useAuthStore()

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['agency-employees', agencyId],
    queryFn: () => apiEndpoints.employees.list(agencyId).then((r) => r.data.results ?? r.data) as Promise<AgencyEmployee[]>,
    enabled: !!user,
    retry: false,
  })

  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ['agency-invitations', agencyId],
    queryFn: () => apiEndpoints.invitations.list(agencyId).then((r) => r.data.results ?? r.data) as Promise<Invitation[]>,
    enabled: !!user,
  })
  const qc = useQueryClient()
  const [adminRejectOpen, setAdminRejectOpen] = useState(false)
  const [adminRejectReason, setAdminRejectReason] = useState('')
  const [activeTab, setActiveTab] = useState('tours')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteMode, setInviteMode] = useState<'email' | 'user_id' | 'link'>('email')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'operator'>('operator')
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importTaskId, setImportTaskId] = useState<string | null>(null)
  const [importState, setImportState] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'failed'>('idle')
  const [importResult, setImportResult] = useState<{ created: number; errors: { row: number; title: string; errors: string[] }[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const myRole = useMemo(
    () => employees?.find((e) => e.user === user?.id)?.role ?? null,
    [employees, user?.id]
  )
  const canManageStaff = myRole === 'owner' || myRole === 'admin'

  const pollImportStatus = React.useCallback(async (taskId: string) => {
    const poll = async () => {
      try {
        const res = await apiEndpoints.tours.importStatus(agencyId, taskId)
        const { state, result } = res.data
        if (state === 'success') {
          setImportState('done')
          setImportResult(result)
          setImportTaskId(null)
          qc.invalidateQueries({ queryKey: ['agency-tours', agencyId] })
          if (result.errors.length === 0) {
            toast.success(`${result.created} tour${result.created !== 1 ? 's' : ''} imported`)
          } else {
            toast.warning(`${result.created} imported, ${result.errors.length} failed`)
          }
        } else if (state === 'failure') {
          setImportState('failed')
          setImportTaskId(null)
          toast.error(res.data.error ?? 'Import failed')
        } else {
          setTimeout(poll, 2000)
        }
      } catch {
        setImportState('failed')
        setImportTaskId(null)
        toast.error('Failed to check import status')
      }
    }
    await poll()
  }, [agencyId, qc])

  const importMutation = useMutation({
    mutationFn: (file: File) => apiEndpoints.tours.importCsv(agencyId, file).then((r) => r.data),
    onMutate: () => {
      setImportState('uploading')
      setImportResult(null)
    },
    onSuccess: ({ task_id }: { task_id: string }) => {
      setImportTaskId(task_id)
      setImportState('processing')
      setImportFile(null)
      pollImportStatus(task_id)
    },
    onError: (err: unknown) => {
      setImportState('failed')
      const msg = (err as { response?: { data?: { detail?: string; file?: string[] } } })?.response?.data
      toast.error(msg?.detail ?? msg?.file?.[0] ?? 'Upload failed')
    },
  })

  const inviteMutation = useMutation({
    mutationFn: (data: { invited_email?: string; invited_user?: string; role: string }) =>
      apiEndpoints.invitations.create(agencyId, data).then((r) => r.data),
    onSuccess: (invitation) => {
      qc.invalidateQueries({ queryKey: ['agency-invitations', agencyId] })
      if (inviteMode === 'link') {
        setGeneratedLink(`${window.location.origin}/invitations/${invitation.token}`)
        toast.success('Link generated!')
      } else {
        toast.success('Invitation sent!')
        setInviteEmail('')
        setInviteUserId('')
        setShowInviteForm(false)
      }
    },
    onError: () => toast.error('Failed to send invitation.'),
  })

  const deleteInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => apiEndpoints.invitations.delete(agencyId, invitationId),
    onSuccess: () => {
      toast.success('Invitation deleted.')
      qc.invalidateQueries({ queryKey: ['agency-invitations', agencyId] })
    },
    onError: () => toast.error('Failed to delete invitation.'),
  })

  const removeMutation = useMutation({
    mutationFn: (employeeId: string) => apiEndpoints.employees.remove(agencyId, employeeId),
    onSuccess: () => {
      toast.success('Member removed.')
      qc.invalidateQueries({ queryKey: ['agency-employees', agencyId] })
    },
    onError: () => toast.error('Failed to remove member.'),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ employeeId, role }: { employeeId: string; role: string }) =>
      apiEndpoints.employees.updateRole(agencyId, employeeId, role),
    onSuccess: () => {
      toast.success('Role updated.')
      qc.invalidateQueries({ queryKey: ['agency-employees', agencyId] })
    },
    onError: () => toast.error('Failed to update role.'),
  })

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const deleteAgencyMutation = useMutation({
    mutationFn: () => apiEndpoints.agencies.delete(agencyId),
    onSuccess: () => {
      toast.success('Agency deleted.')
      qc.invalidateQueries({ queryKey: ['my-agencies'] })
      router.push('/agencies')
    },
    onError: () => toast.error('Failed to delete agency.'),
  })

  const [settingsName, setSettingsName] = useState('')
  const [settingsDescription, setSettingsDescription] = useState('')
  const [settingsLogoFile, setSettingsLogoFile] = useState<File | null>(null)
  const [settingsLogoPreview, setSettingsLogoPreview] = useState<string | null>(null)

  // Sync form when agency loads
  React.useEffect(() => {
    if (agency) {
      setSettingsName(agency.name)
      setSettingsDescription(agency.description)
    }
  }, [agency?.id])

  const updateAgencyMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      if (settingsName !== agency?.name) fd.append('name', settingsName)
      if (settingsDescription !== agency?.description) fd.append('description', settingsDescription)
      if (settingsLogoFile) fd.append('logo', settingsLogoFile)
      return apiEndpoints.agencies.update(agencyId, fd)
    },
    onSuccess: () => {
      toast.success('Agency updated. It will be reviewed again before going live.')
      setSettingsLogoFile(null)
      setSettingsLogoPreview(null)
      qc.invalidateQueries({ queryKey: ['agency', agencyId] })
    },
    onError: () => toast.error('Failed to update agency.'),
  })

  const adminApproveMutation = useMutation({
    mutationFn: () => apiEndpoints.agencies.approve(agencyId),
    onSuccess: () => {
      toast.success('Agency approved')
      qc.invalidateQueries({ queryKey: ['agency', agencyId] })
    },
    onError: () => toast.error('Failed to approve agency'),
  })

  const adminRejectMutation = useMutation({
    mutationFn: (reason: string) => apiEndpoints.agencies.reject(agencyId, reason),
    onSuccess: () => {
      toast.success('Agency rejected')
      setAdminRejectOpen(false)
      setAdminRejectReason('')
      qc.invalidateQueries({ queryKey: ['agency', agencyId] })
    },
    onError: () => toast.error('Failed to reject agency'),
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc'>('newest')

  const [staffSearch, setStaffSearch] = useState('')
  const [staffRoleFilter, setStaffRoleFilter] = useState<'all' | 'owner' | 'admin' | 'operator'>('all')

  const filteredTours = useMemo(() => {
    let list: Tour[] = tours ?? []
    if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.location?.city?.toLowerCase().includes(q) ||
        t.location?.country?.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'price_asc') return Number(a.price) - Number(b.price)
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
      return 0
    })
  }, [tours, search, statusFilter, sortBy])

  const filteredEmployees = useMemo(() => {
    let list: AgencyEmployee[] = employees ?? []
    if (staffRoleFilter !== 'all') list = list.filter((e) => e.role === staffRoleFilter)
    if (staffSearch.trim()) {
      const q = staffSearch.toLowerCase()
      list = list.filter((e) =>
        e.user_email.toLowerCase().includes(q) ||
        `${e.user_first_name} ${e.user_last_name}`.toLowerCase().includes(q)
      )
    }
    return list
  }, [employees, staffSearch, staffRoleFilter])

  if (agencyLoading || (!!user && employeesLoading)) {
    return (
      <PageShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageShell>
    )
  }

  if (!agency) {
    return (
      <PageShell>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Agency not found</p>
        </div>
      </PageShell>
    )
  }

  const isApproved = agency.status === 'approved'
  const banner = STATUS_BANNER[agency.status]
  const isMember = myRole !== null
  const canAccess = isMember || isStaff()

  // ── Public profile for non-members ─────────────────────────────────────────
  if (!canAccess) {
    const publicTours = (tours ?? []).filter((t: Tour) => t.status === 'approved')
    return (
      <PageShell>
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Agency header */}
          <div className="flex items-start gap-5 mb-8">
            {agency.logo ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden border shrink-0">
                <Image src={agency.logo} alt={agency.name} width={80} height={80} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl border bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-3xl font-bold text-primary uppercase">{agency.name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-3xl font-bold tracking-tight">{agency.name}</h1>
                {agency.rating && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10">
                    <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                    <span className="text-sm font-semibold text-primary">{agency.rating}</span>
                    <span className="text-xs text-muted-foreground">/ 10</span>
                  </div>
                )}
              </div>
              {agency.description && (
                <p className="text-muted-foreground leading-relaxed">{agency.description}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                <CalendarDays className="w-3.5 h-3.5" />
                Member since {new Date(agency.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Tours */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Tours
              {publicTours.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">{publicTours.length} available</span>
              )}
            </h2>
            {toursLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => <TourCardSkeleton key={i} />)}
              </div>
            ) : publicTours.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No tours available from this agency yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {publicTours.map((tour: Tour) => <TourCard key={tour.id} tour={tour} />)}
              </div>
            )}
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        {banner && (
          <div className={`flex items-center gap-2 border rounded-lg px-4 py-3 mb-6 text-sm ${banner.className}`}>
            {banner.icon}
            <span>{banner.text}</span>
            {agency.status === 'rejected' && agency.rejection_reason && (
              <span className="font-medium ml-1">Reason: {agency.rejection_reason}</span>
            )}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{agency.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              {isStaff() && agency.status !== 'approved' && (
                <Button
                  size="sm"
                  disabled={adminApproveMutation.isPending}
                  onClick={() => adminApproveMutation.mutate()}
                >
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  Approve
                </Button>
              )}
              {isStaff() && agency.status !== 'rejected' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setAdminRejectOpen(true)}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Reject
                </Button>
              )}
              {isApproved && isMember && (
                <Button size="sm" variant="outline" onClick={() => { setImportOpen(true); setImportState('idle'); setImportResult(null); setImportFile(null) }}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              )}
              {isApproved && (
                <Link href={`/agencies/${agencyId}/tours/new`}>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tour
                  </Button>
                </Link>
              )}
            </div>
          </div>
          {agency.description && (
            <p className="text-muted-foreground">{agency.description}</p>
          )}
        </div>

        <Dialog open={adminRejectOpen} onOpenChange={setAdminRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Agency</DialogTitle>
              <DialogDescription>
                Provide an optional reason that will be visible to the agency owner.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={adminRejectReason}
              onChange={(e) => setAdminRejectReason(e.target.value)}
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdminRejectOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={adminRejectMutation.isPending}
                onClick={() => adminRejectMutation.mutate(adminRejectReason)}
              >
                Confirm Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV Import Dialog */}
        <Dialog open={importOpen} onOpenChange={(open) => { if (!importMutation.isPending && importState !== 'processing') setImportOpen(open) }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Tours from CSV
              </DialogTitle>
              <DialogDescription>
                Upload a CSV file to create multiple tours at once. Each row becomes one tour (status: pending review).
              </DialogDescription>
            </DialogHeader>

            {/* Template download */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4 shrink-0" />
                <span>Need the template? Download the sample CSV.</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const headers = 'title,description,price,start_date,end_date,country,city,latitude,longitude,max_adults,max_children'
                  const example = '"Paris Highlights","A 5-day tour of Paris.",980,2026-05-15,2026-05-19,France,Paris,48.8566,2.3522,10,3'
                  const blob = new Blob([headers + '\n' + example], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = 'tours_template.csv'; a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Template
              </Button>
            </div>

            {/* Drop zone — only when idle */}
            {(importState === 'idle' || importState === 'failed') && (
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const f = e.dataTransfer.files[0]
                  if (f?.name.endsWith('.csv')) setImportFile(f)
                  else toast.error('Please drop a .csv file')
                }}
                onClick={() => document.getElementById('csv-input')?.click()}
              >
                <input
                  id="csv-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setImportFile(f) }}
                />
                <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                {importFile ? (
                  <p className="text-sm font-medium">{importFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Drop CSV here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">Only .csv files accepted</p>
                  </>
                )}
              </div>
            )}

            {/* Processing state */}
            {importState === 'processing' && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm font-medium">Processing import…</p>
                <p className="text-xs text-muted-foreground">You'll get a notification when it's done</p>
              </div>
            )}

            {/* Results */}
            {importState === 'done' && importResult && (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${importResult.errors.length === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {importResult.created} tour{importResult.created !== 1 ? 's' : ''} created
                  {importResult.errors.length > 0 && ` · ${importResult.errors.length} row${importResult.errors.length !== 1 ? 's' : ''} failed`}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border p-3">
                    {importResult.errors.map((e) => (
                      <div key={e.row} className="text-xs">
                        <span className="font-medium text-destructive">Row {e.row}{e.title ? ` — ${e.title}` : ''}:</span>
                        <ul className="mt-0.5 pl-3 text-muted-foreground list-disc">
                          {e.errors.map((msg, i) => <li key={i}>{msg}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {importState === 'failed' && !importResult && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Upload failed. Please check the file and try again.
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importState === 'processing'}>
                {importState === 'done' || importState === 'failed' ? 'Close' : 'Cancel'}
              </Button>
              {(importState === 'idle' || importState === 'failed') && (
                <Button
                  disabled={!importFile || importMutation.isPending}
                  onClick={() => importFile && importMutation.mutate(importFile)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {importMutation.isPending ? 'Uploading…' : 'Import'}
                </Button>
              )}
              {importState === 'done' && (
                <Button onClick={() => { setImportState('idle'); setImportResult(null); setImportFile(null) }}>
                  Import Another
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats — context-sensitive */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {activeTab === 'staff' ? (
            <>
              {[
                { label: 'Total Members', value: employees?.length ?? 0, icon: <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />, bg: 'bg-blue-100 dark:bg-blue-950' },
                { label: 'Admins', value: employees?.filter((e) => e.role === 'admin').length ?? 0, icon: <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />, bg: 'bg-purple-100 dark:bg-purple-950' },
                { label: 'Operators', value: employees?.filter((e) => e.role === 'operator').length ?? 0, icon: <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />, bg: 'bg-green-100 dark:bg-green-950' },
                { label: 'Pending Invites', value: invitations?.filter((i) => i.status === 'pending').length ?? 0, icon: <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />, bg: 'bg-amber-100 dark:bg-amber-950' },
              ].map(({ label, value, icon, bg }) => (
                <Card key={label}>
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${bg} shrink-0`}>{icon}</div>
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold">{value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              {[
                { label: 'Total Tours', value: tours?.length ?? 0, icon: <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />, bg: 'bg-blue-100 dark:bg-blue-950' },
                { label: 'Approved', value: tours?.filter((t: Tour) => t.status === 'approved').length ?? 0, icon: <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />, bg: 'bg-green-100 dark:bg-green-950' },
                { label: 'Pending', value: tours?.filter((t: Tour) => t.status === 'pending').length ?? 0, icon: <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />, bg: 'bg-amber-100 dark:bg-amber-950' },
                { label: 'Rejected', value: tours?.filter((t: Tour) => t.status === 'rejected').length ?? 0, icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />, bg: 'bg-red-100 dark:bg-red-950' },
              ].map(({ label, value, icon, bg }) => (
                <Card key={label}>
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${bg} shrink-0`}>{icon}</div>
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold">{value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-2">
            <TabsList>
              <TabsTrigger value="tours">Tours</TabsTrigger>
              {myRole && <TabsTrigger value="bookings">Bookings</TabsTrigger>}
              {canManageStaff && <TabsTrigger value="staff">Staff</TabsTrigger>}
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tours" className="space-y-4">
            {/* Search / filter / sort bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Search by title, city or country…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sm:max-w-xs"
              />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="price_asc">Price: low → high</SelectItem>
                  <SelectItem value="price_desc">Price: high → low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {toursLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-6 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTours.length > 0 ? (
              <div className="space-y-3">
                {filteredTours.map((tour: Tour) => (
                  <Link key={tour.id} href={`/tours/${tour.id}`} className="group block">
                    <Card className="cursor-pointer transition-all hover:shadow-md">
                      <CardContent className="pt-5 pb-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold group-hover:text-primary transition-colors truncate">{tour.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {tour.location?.city}, {tour.location?.country} · ${tour.price}/person
                            </p>
                            {tour.status === 'rejected' && tour.rejection_reason && (
                              <p className="text-xs text-destructive mt-1">{tour.rejection_reason}</p>
                            )}
                          </div>
                          <StatusBadge status={tour.status} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : tours?.length === 0 ? (
              <Card>
                <CardContent className="pt-8 text-center">
                  <p className="text-muted-foreground mb-4">No tours yet</p>
                  {isApproved && (
                    <Link href={`/agencies/${agencyId}/tours/new`}>
                      <Button>Create First Tour</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-8 text-center">
                  <p className="text-muted-foreground">No tours match your filters</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            {!isApproved ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">Staff management is available once the agency is approved.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Members */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Members</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowInviteForm((v) => !v)
                        setGeneratedLink(null)
                      }}
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                      Invite
                    </Button>
                  </div>

                  {/* Search / filter bar */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <Input
                      placeholder="Search by name or email…"
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="sm:max-w-xs"
                    />
                    <Select value={staffRoleFilter} onValueChange={(v) => setStaffRoleFilter(v as typeof staffRoleFilter)}>
                      <SelectTrigger className="sm:w-36">
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="operator">Operator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Inline invite form */}
                  {showInviteForm && (
                    <Card className="mb-4">
                      <CardContent className="pt-4 pb-4 space-y-3">
                        {/* Mode tabs */}
                        <div className="flex gap-1 bg-muted p-1 rounded-md w-fit">
                          {(['email', 'user_id', 'link'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => { setInviteMode(mode); setGeneratedLink(null) }}
                              className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                                inviteMode === mode
                                  ? 'bg-background shadow-sm text-foreground'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {mode === 'email' ? 'By Email' : mode === 'user_id' ? 'By User ID' : 'Anonymous Link'}
                            </button>
                          ))}
                        </div>

                        {/* Role selector — shared across all modes */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Assign role:</span>
                          <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'operator')}>
                            <SelectTrigger className="h-7 text-xs w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="operator">Operator</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {inviteMode === 'email' && (
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="colleague@example.com"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && inviteEmail.trim())
                                  inviteMutation.mutate({ invited_email: inviteEmail, role: inviteRole })
                              }}
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              onClick={() => inviteMutation.mutate({ invited_email: inviteEmail, role: inviteRole })}
                              disabled={!inviteEmail.trim() || inviteMutation.isPending}
                            >
                              <Mail className="w-3.5 h-3.5 mr-1.5" />
                              Send
                            </Button>
                          </div>
                        )}

                        {inviteMode === 'user_id' && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="User UUID"
                              value={inviteUserId}
                              onChange={(e) => setInviteUserId(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && inviteUserId.trim())
                                  inviteMutation.mutate({ invited_user: inviteUserId, role: inviteRole })
                              }}
                              className="flex-1 font-mono text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => inviteMutation.mutate({ invited_user: inviteUserId, role: inviteRole })}
                              disabled={!inviteUserId.trim() || inviteMutation.isPending}
                            >
                              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                              Send
                            </Button>
                          </div>
                        )}

                        {inviteMode === 'link' && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Generates a link that assigns the selected role on join.
                            </p>
                            <Button
                              size="sm"
                              onClick={() => inviteMutation.mutate({ role: inviteRole })}
                              disabled={inviteMutation.isPending}
                            >
                              <Link2 className="w-3.5 h-3.5 mr-1.5" />
                              Generate Link
                            </Button>
                            {generatedLink && (
                              <div className="flex gap-2 mt-2">
                                <Input
                                  value={generatedLink}
                                  readOnly
                                  className="flex-1 font-mono text-xs"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(generatedLink)
                                    toast.success('Copied!')
                                  }}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {employeesLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => <Card key={i}><CardContent className="pt-4"><Skeleton className="h-5 w-1/2" /></CardContent></Card>)}
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      {employees?.length === 0 ? 'No members yet.' : 'No members match your filters.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredEmployees.map((emp) => (
                        <Card key={emp.id}>
                          <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                                {emp.user_first_name?.[0] ?? emp.user_email[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium leading-none truncate">
                                  {emp.user_first_name} {emp.user_last_name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{emp.user_email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {emp.role === 'owner' ? (
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                                  owner
                                </span>
                              ) : (
                                <Select
                                  value={emp.role}
                                  onValueChange={(role) =>
                                    updateRoleMutation.mutate({ employeeId: emp.id, role })
                                  }
                                  disabled={updateRoleMutation.isPending}
                                >
                                  <SelectTrigger className="h-7 text-xs w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="operator">Operator</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              {emp.role !== 'owner' && (
                                <button
                                  onClick={() => removeMutation.mutate(emp.id)}
                                  disabled={removeMutation.isPending}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  aria-label="Remove member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending invitations */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Pending Invitations</h3>
                  {invitationsLoading ? (
                    <Card><CardContent className="pt-4"><Skeleton className="h-5 w-1/3" /></CardContent></Card>
                  ) : (invitations ?? []).filter((i) => i.status === 'pending').length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending invitations.</p>
                  ) : (
                    <div className="space-y-2">
                      {(invitations ?? []).filter((i) => i.status === 'pending').map((inv) => {
                        const invLink = `${window.location.origin}/invitations/${inv.token}`
                        const isAnon = !inv.invited_email && !inv.invited_user
                        const isPersonal = !!inv.invited_user
                        return (
                          <Card key={inv.id}>
                            <CardContent className="py-3 px-4">
                              <div className="flex items-start justify-between gap-3">
                                {/* Left: target info */}
                                <div className="flex items-start gap-2 min-w-0">
                                  {isAnon
                                    ? <Link2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                    : <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                  }
                                  <div className="min-w-0">
                                    {isPersonal ? (
                                      <>
                                        <p className="text-sm font-medium truncate">
                                          {inv.invited_user_full_name ?? inv.invited_user_email ?? `User …${inv.invited_user?.slice(-8)}`}
                                        </p>
                                        {inv.invited_user_email && (
                                          <p className="text-xs text-muted-foreground truncate">{inv.invited_user_email}</p>
                                        )}
                                      </>
                                    ) : isAnon ? (
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-xs text-muted-foreground font-mono truncate">{invLink}</span>
                                        <button
                                          onClick={() => { navigator.clipboard.writeText(invLink); toast.success('Copied!') }}
                                          className="text-muted-foreground hover:text-foreground shrink-0"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <p className="text-sm truncate">{inv.invited_email}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                        isPersonal ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                                        isAnon ? 'bg-muted text-muted-foreground' :
                                        'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                                      }`}>
                                        {isPersonal ? 'Personal' : isAnon ? 'Anonymous link' : 'Email'}
                                      </span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                        inv.role === 'admin'
                                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                          : 'bg-muted text-muted-foreground'
                                      }`}>
                                        {inv.role}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Sent {new Date(inv.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                      </span>
                                      {inv.expires_at && (
                                        <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          Expires {new Date(inv.expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {/* Right: delete */}
                                <button
                                  onClick={() => deleteInvitationMutation.mutate(inv.id)}
                                  disabled={deleteInvitationMutation.isPending}
                                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
                                  aria-label="Delete invitation"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="bookings">
            <AgencyBookingsTab agencyId={agencyId} enabled={activeTab === 'bookings' && !!myRole} />
          </TabsContent>

          <TabsContent value="settings">
            {myRole !== 'owner' ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">Only the agency owner can edit settings.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 max-w-xl mx-auto">
              <Card>
                <CardContent className="pt-6 space-y-5">
                  {/* Logo */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logo</label>
                    <div className="flex items-center gap-4">
                      {(settingsLogoPreview || agency.logo) && (
                        <img
                          src={settingsLogoPreview ?? agency.logo!}
                          alt="logo"
                          className="w-16 h-16 rounded-lg object-cover border"
                        />
                      )}
                      <div>
                        <input
                          id="logo-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            setSettingsLogoFile(file)
                            setSettingsLogoPreview(file ? URL.createObjectURL(file) : null)
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById('logo-input')?.click()}
                        >
                          {agency.logo ? 'Change Logo' : 'Upload Logo'}
                        </Button>
                        {settingsLogoFile && (
                          <p className="text-xs text-muted-foreground mt-1">{settingsLogoFile.name}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Agency Name</label>
                    <Input
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      placeholder="Agency name"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      value={settingsDescription}
                      onChange={(e) => setSettingsDescription(e.target.value)}
                      placeholder="Describe your agency…"
                      rows={4}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      onClick={() => updateAgencyMutation.mutate()}
                      disabled={updateAgencyMutation.isPending || (!settingsName.trim())}
                    >
                      {updateAgencyMutation.isPending ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSettingsName(agency.name)
                        setSettingsDescription(agency.description)
                        setSettingsLogoFile(null)
                        setSettingsLogoPreview(null)
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger zone */}
              <Card className="border-destructive/40">
                <CardContent className="pt-6 flex flex-col gap-3">
                  <div>
                    <h3 className="font-semibold text-destructive text-sm">Danger Zone</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permanently delete this agency and all its tours, staff, and data.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-fit"
                    onClick={() => { setDeleteConfirm(''); setDeleteOpen(true) }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete Agency
                  </Button>
                </CardContent>
              </Card>
              </div>
            )}
          </TabsContent>

          {/* Delete agency dialog */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Agency</DialogTitle>
                <DialogDescription>
                  This will permanently delete <strong>{agency.name}</strong> and all its tours, members, and data. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <label className="text-sm font-medium">
                  Type <span className="font-mono font-bold">agree</span> to confirm
                </label>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="agree"
                  autoComplete="off"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteConfirm !== 'agree' || deleteAgencyMutation.isPending}
                  onClick={() => deleteAgencyMutation.mutate()}
                >
                  {deleteAgencyMutation.isPending ? 'Deleting…' : 'Delete Agency'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Tabs>
      </div>
    </PageShell>
  )
}
