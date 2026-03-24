'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { PageShell } from '@/components/page-shell'
import StatusBadge from '@/components/status-badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

interface ModerationItem {
  id: string
  type: 'agency' | 'tour'
  status: 'pending' | 'approved' | 'rejected'
  entityId: string
  entityName: string
  submittedBy: string
  submittedAt: string
  reason?: string
  rejectionReason?: string
  photos?: string[]
  description?: string
}

export default function ModerationQueuePage() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<ModerationItem[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/v1/staff/moderation-queue/')
      setItems(response.data.results || [])
    } catch (error) {
      console.error('Failed to fetch moderation items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (itemId: string) => {
    try {
      await api.post(`/api/v1/staff/moderation-queue/${itemId}/approve/`)
      setItems(items.map(item =>
        item.id === itemId ? { ...item, status: 'approved' } : item
      ))
    } catch (error) {
      console.error('Failed to approve item:', error)
    }
  }

  const handleReject = async (itemId: string, reason: string) => {
    try {
      await api.post(`/api/v1/staff/moderation-queue/${itemId}/reject/`, { reason })
      setItems(items.map(item =>
        item.id === itemId ? { ...item, status: 'rejected', rejectionReason: reason } : item
      ))
    } catch (error) {
      console.error('Failed to reject item:', error)
    }
  }

  const filteredItems = filter === 'all'
    ? items
    : items.filter(item => item.status === filter)

  if (!user || user.role !== 'staff') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Moderation Queue</h1>
          <p className="text-muted-foreground">Review and approve pending agencies and tours</p>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((filterOption) => (
            <Button
              key={filterOption}
              variant={filter === filterOption ? 'default' : 'outline'}
              onClick={() => setFilter(filterOption)}
              className="capitalize"
            >
              {filterOption}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="pt-8">
              <div className="text-center">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {filter === 'pending' ? 'No pending items to review' : `No ${filter} items`}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{item.entityName}</h3>
                        <StatusBadge status={item.status} />
                      </div>
                      <CardDescription>
                        <div className="space-y-1 text-sm">
                          <p>Type: {item.type === 'agency' ? 'Agency' : 'Tour'}</p>
                          <p>Submitted by: {item.submittedBy}</p>
                          <p>Submitted at: {new Date(item.submittedAt).toLocaleDateString()}</p>
                          {item.reason && <p>Reason: {item.reason}</p>}
                        </div>
                      </CardDescription>
                    </div>
                    {item.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(item.id, 'Does not meet requirements')}
                          className="text-destructive hover:text-destructive"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(item.id)}
                          className="bg-success hover:bg-success/90"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                {(item.description || item.rejectionReason) && (
                  <CardContent className="pt-0">
                    {item.description && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Description:</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    )}
                    {item.rejectionReason && (
                      <div>
                        <p className="text-sm font-medium mb-1 text-destructive">Rejection Reason:</p>
                        <p className="text-sm text-destructive/80">{item.rejectionReason}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
