'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { apiEndpoints } from '@/lib/api'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Users } from 'lucide-react'
import type { Agency } from '@/lib/types'

const STATUS_STYLES: Record<Agency['status'], { label: string; className: string }> = {
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  pending:  { label: 'Pending',  className: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
}

export default function AgenciesPage() {
  const { data: agencies, isLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => apiEndpoints.agencies.list().then((res) => res.data.results ?? []),
  })

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Agencies</h1>
            <p className="text-muted-foreground mt-1">Manage your tour agencies</p>
          </div>
          <Link href="/agencies/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Agency
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : !agencies || agencies.length === 0 ? (
          <Card>
            <CardContent className="pt-8">
              <div className="text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground mb-4">No agencies yet. Create your first one!</p>
                <Link href="/agencies/new">
                  <Button variant="outline">Create Agency</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {agencies.map((agency: Agency) => (
              <Link key={agency.id} href={`/agencies/${agency.id}`} className="group">
                <Card className="cursor-pointer transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {agency.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {agency.description}
                        </CardDescription>
                      </div>
                      <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[agency.status].className}`}>
                        {STATUS_STYLES[agency.status].label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{agency.staff_count || 0} staff</span>
                    </div>
                    <div className="pt-2">
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <span>View Agency</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
