'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { apiEndpoints } from '@/lib/api'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Building2 } from 'lucide-react'
import type { Agency } from '@/lib/types'

function AgencyAvatar({ agency }: { agency: Agency }) {
  if (agency.logo) {
    return (
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border">
        <Image
          src={agency.logo}
          alt={agency.name}
          width={48}
          height={48}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }
  return (
    <div className="w-12 h-12 rounded-lg shrink-0 bg-primary/10 flex items-center justify-center border border-border">
      <span className="text-lg font-bold text-primary uppercase">
        {agency.name.charAt(0)}
      </span>
    </div>
  )
}

const STATUS_STYLES: Record<Agency['status'], { label: string; className: string }> = {
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  pending:  { label: 'Pending',  className: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
}

const ROLE_STYLES: Record<NonNullable<Agency['my_role']>, { label: string; className: string }> = {
  owner:    { label: 'Owner',    className: 'bg-purple-100 text-purple-700' },
  admin:    { label: 'Admin',    className: 'bg-blue-100 text-blue-700' },
  operator: { label: 'Operator', className: 'bg-gray-100 text-gray-700' },
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
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : !agencies || agencies.length === 0 ? (
          <Card>
            <CardContent className="pt-8">
              <div className="text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
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
                    <div className="flex items-start gap-4">
                      <AgencyAvatar agency={agency} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="group-hover:text-primary transition-colors">
                            {agency.name}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {agency.my_role && (
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_STYLES[agency.my_role].className}`}>
                                {ROLE_STYLES[agency.my_role].label}
                              </span>
                            )}
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[agency.status].className}`}>
                              {STATUS_STYLES[agency.status].label}
                            </span>
                          </div>
                        </div>
                        <CardDescription className="mt-1 line-clamp-2">
                          {agency.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
