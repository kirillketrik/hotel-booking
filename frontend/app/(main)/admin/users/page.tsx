'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiEndpoints } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { ManagedUser, PaginatedResponse } from '@/lib/types'

const PAGE_SIZE = 20

export default function UsersPage() {
  const { isStaff } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [ordering, setOrdering] = useState('-date_joined')
  const [page, setPage] = useState(1)

  if (!isStaff()) {
    router.replace('/')
    return null
  }

  const { data, isLoading } = useQuery({
    queryKey: ['staff-users', appliedSearch, ordering, page],
    queryFn: () =>
      apiEndpoints.staff.users
        .list({ search: appliedSearch || undefined, ordering, page, page_size: PAGE_SIZE })
        .then((r) => r.data as PaginatedResponse<ManagedUser>),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { is_staff?: boolean; is_active?: boolean } }) =>
      apiEndpoints.staff.users.update(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-users'] })
      toast.success('User updated')
    },
    onError: () => toast.error('Failed to update user'),
  })

  const users = data?.results ?? []
  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {data ? `${data.count} users total` : 'Manage user accounts and permissions'}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <form
            className="flex gap-2 flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              setAppliedSearch(search)
              setPage(1)
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          <Select value={ordering} onValueChange={(v) => { setOrdering(v); setPage(1) }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-date_joined">Newest first</SelectItem>
              <SelectItem value="date_joined">Oldest first</SelectItem>
              <SelectItem value="email">Email A–Z</SelectItem>
              <SelectItem value="-email">Email Z–A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-center">Staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-9 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-9 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                          {u.first_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">
                          {u.first_name} {u.last_name}
                        </span>
                        {u.is_staff && (
                          <Badge variant="secondary" className="text-xs">staff</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.date_joined).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={u.is_active}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({ id: u.id, patch: { is_active: checked } })
                        }
                        disabled={updateMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={u.is_staff}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({ id: u.id, patch: { is_staff: checked } })
                        }
                        disabled={updateMutation.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {data?.count} users
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="w-8 p-0"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-8 p-0"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
