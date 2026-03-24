'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

async function validateInvitation(token: string) {
  try {
    const res = await api.get(`/api/v1/invitations/${token}/`)
    return res.data
  } catch {
    return null
  }
}

export default function InvitationPage() {
  const params = useParams()
  const router = useRouter()
  const token = Array.isArray(params.token) ? params.token[0] : params.token

  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useState(() => {
    const fetchInvitation = async () => {
      try {
        const data = await validateInvitation(token)
        if (data) {
          setInvitation(data)
        } else {
          setError('Invalid or expired invitation')
        }
      } catch (err) {
        setError('Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }
    fetchInvitation()
  })

  const handleAccept = async () => {
    try {
      setAccepting(true)
      await api.post(`/api/v1/invitations/${token}/accept/`)
      router.push('/agencies')
    } catch (err) {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const handleReject = async () => {
    try {
      setAccepting(true)
      await api.post(`/api/v1/invitations/${token}/reject/`)
      router.push('/')
    } catch (err) {
      setError('Failed to reject invitation')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <Card>
            <CardContent className="pt-8">
              <Skeleton className="h-8 w-1/2 mb-4" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="pt-8">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                <p className="text-lg font-semibold text-destructive">{error}</p>
                <Button onClick={() => router.push('/')} className="mt-4">
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
              <CardTitle className="text-2xl">You've been invited!</CardTitle>
              <CardDescription>
                {invitation?.agency_name} has invited you to join their team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Agency</p>
                  <p className="font-semibold">{invitation?.agency_name}</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Role</p>
                  <p className="font-semibold capitalize">{invitation?.role}</p>
                </div>
                {invitation?.message && (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Message</p>
                    <p>{invitation.message}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={accepting}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                  <Button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="flex-1"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accept
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  )
}
