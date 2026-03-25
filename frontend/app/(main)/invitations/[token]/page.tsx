'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiEndpoints } from '@/lib/api'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function InvitationPage() {
  const params = useParams()
  const router = useRouter()
  const token = Array.isArray(params.token) ? params.token[0] : params.token

  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => apiEndpoints.invitations.get(token).then((r) => r.data),
    retry: false,
  })

  const acceptMutation = useMutation({
    mutationFn: () => apiEndpoints.invitations.accept(token),
    onSuccess: () => {
      toast.success('Invitation accepted! Welcome to the team.')
      router.push('/agencies')
    },
    onError: () => toast.error('Failed to accept invitation.'),
  })

  const rejectMutation = useMutation({
    mutationFn: () => apiEndpoints.invitations.reject(token),
    onSuccess: () => {
      toast.success('Invitation declined.')
      router.push('/')
    },
    onError: () => toast.error('Failed to decline invitation.'),
  })

  const busy = acceptMutation.isPending || rejectMutation.isPending

  return (
    <PageShell>
      <div className="max-w-lg mx-auto">
        {isLoading ? (
          <Card>
            <CardContent className="pt-8 space-y-3">
              <Skeleton className="h-8 w-1/2 mx-auto" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-10 w-full mt-4" />
            </CardContent>
          </Card>
        ) : error || !invitation ? (
          <Card className="border-destructive">
            <CardContent className="pt-8 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
              <p className="text-lg font-semibold">Invalid or expired invitation</p>
              <p className="text-sm text-muted-foreground mt-1">
                This invitation link is no longer valid.
              </p>
              <Button onClick={() => router.push('/')} className="mt-4">
                Go Home
              </Button>
            </CardContent>
          </Card>
        ) : invitation.status !== 'pending' ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-lg font-semibold capitalize">
                Invitation already {invitation.status}
              </p>
              <Button onClick={() => router.push('/agencies')} className="mt-4">
                My Agencies
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center pb-2">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <CardTitle className="text-2xl">You've been invited!</CardTitle>
              <CardDescription>
                <span className="font-medium text-foreground">{invitation.agency_name}</span> has
                invited you to join their team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {invitation.expires_at && (
                <div className="bg-muted rounded-lg px-4 py-3">
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="text-sm font-medium">
                    {new Date(invitation.expires_at).toLocaleDateString(undefined, {
                      dateStyle: 'long',
                    })}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => rejectMutation.mutate()}
                  disabled={busy}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
                <Button
                  onClick={() => acceptMutation.mutate()}
                  disabled={busy}
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {acceptMutation.isPending ? 'Joining…' : 'Accept & Join'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  )
}
