'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiEndpoints } from '@/lib/api'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Users, BarChart3, Clock, XCircle } from 'lucide-react'
import type { Agency, Tour } from '@/lib/types'
import React from "react";

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

export default function AgencyDashboardPage() {
  const params = useParams()
  const agencyId = Array.isArray(params.id) ? params.id[0] : params.id

  const { data: agency, isLoading: agencyLoading } = useQuery({
    queryKey: ['agency', agencyId],
    queryFn: () => fetchAgency(agencyId),
  })

  const { data: tours, isLoading: toursLoading } = useQuery({
    queryKey: ['agency-tours', agencyId],
    queryFn: () => fetchAgencyTours(agencyId),
  })

  if (agencyLoading) {
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

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        {banner && (
          <div className={`flex items-center gap-2 border rounded-lg px-4 py-3 mb-6 text-sm ${banner.className}`}>
            {banner.icon}
            <span>{banner.text}</span>
            {agency.rejection_reason && (
              <span className="font-medium ml-1">Reason: {agency.rejection_reason}</span>
            )}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{agency.name}</h1>
              <div className="flex items-center gap-4 text-muted-foreground mt-2">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {agency.staff_count || 0} staff
                </div>
              </div>
            </div>
            {isApproved && (
              <Link href={`/agencies/${agencyId}/tours/new`}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tour
                </Button>
              </Link>
            )}
          </div>
          {agency.description && (
            <p className="text-muted-foreground">{agency.description}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <BarChart3 className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Tours</p>
                  <p className="text-2xl font-bold">{tours?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <BarChart3 className="w-8 h-8 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">
                    {tours?.filter((t: Tour) => t.status === 'approved').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <BarChart3 className="w-8 h-8 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">
                    {tours?.filter((t: Tour) => t.status === 'pending').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tours" className="w-full">
          <TabsList>
            <TabsTrigger value="tours">Tours</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="tours" className="space-y-4">
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
            ) : tours && tours.length > 0 ? (
              <div className="space-y-4">
                {tours.map((tour: Tour) => (
                  <Link key={tour.id} href={`/tours/${tour.id}`} className="group block">
                    <Card className="cursor-pointer transition-all hover:shadow-md">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold group-hover:text-primary transition-colors">{tour.title}</h3>
                            <p className="text-sm text-muted-foreground">${tour.price} per person</p>
                          </div>
                          <div className="text-right">
                            <div className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {tour.status}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
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
            )}
          </TabsContent>

          <TabsContent value="staff">
            <Card>
              <CardContent className="pt-6">
                {isApproved
                  ? <p className="text-muted-foreground">Staff management coming soon</p>
                  : <p className="text-muted-foreground">Staff management is available once the agency is approved.</p>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">Agency settings coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}
