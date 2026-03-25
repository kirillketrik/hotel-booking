'use client'

import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiEndpoints } from '@/lib/api'
import { PageShell } from '@/components/page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, XCircle, Building2, Clock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import type { Invitation } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  rejected: 'bg-muted text-muted-foreground',
}

export default function MyInvitationsPage() {
  const qc = useQueryClient()

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: (): Promise<Invitation[]> =>
      apiEndpoints.invitations.listMine().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : (d.results ?? [])
      }),
  })

  const acceptMutation = useMutation({
    mutationFn: (token: string) => apiEndpoints.invitations.accept(token),
    onSuccess: () => {
      toast.success('Invitation accepted!')
      qc.invalidateQueries({ queryKey: ['my-invitations'] })
    },
    onError: () => toast.error('Failed to accept invitation.'),
  })

  const rejectMutation = useMutation({
    mutationFn: (token: string) => apiEndpoints.invitations.reject(token),
    onSuccess: () => {
      toast.success('Invitation declined.')
      qc.invalidateQueries({ queryKey: ['my-invitations'] })
    },
    onError: () => toast.error('Failed to decline invitation.'),
  })

  const busy = acceptMutation.isPending || rejectMutation.isPending

  const pending = invitations?.filter((i) => i.status === 'pending') ?? []
  const past = invitations?.filter((i) => i.status !== 'pending') ?? []

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">My Invitations</h1>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-5">
                  <Skeleton className="h-5 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : invitations?.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">You have no invitations yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Pending ({pending.length})
                </h2>
                <div className="space-y-3">
                  {pending.map((inv) => (
                    <Card key={inv.id} className="border-amber-200 dark:border-amber-900">
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-muted shrink-0">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{inv.agency_name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Sent {new Date(inv.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                              </p>
                              {inv.expires_at && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Expires {new Date(inv.expires_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectMutation.mutate(inv.token)}
                              disabled={busy}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => acceptMutation.mutate(inv.token)}
                              disabled={busy}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Accept
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Past
                </h2>
                <div className="space-y-2">
                  {past.map((inv) => (
                    <Card key={inv.id} className="opacity-70">
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{inv.agency_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(inv.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[inv.status]}`}>
                          {inv.status}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageShell>
  )
}
