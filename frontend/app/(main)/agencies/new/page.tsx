'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiEndpoints } from '@/lib/api'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'

export default function CreateAgencyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!logo) { setLogoPreview(null); return }
    const url = URL.createObjectURL(logo)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const data = new FormData()
      data.append('name', formData.name)
      data.append('description', formData.description)
      if (logo) data.append('logo', logo)
      const response = await apiEndpoints.agencies.create(data)
      router.push(`/agencies/${response.data.id}`)
    } catch (error) {
      console.error('Failed to create agency:', error)
      alert('Failed to create agency')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Create New Agency</h1>
          <p className="text-muted-foreground">Set up your tour agency and start publishing tours</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Agency Details</CardTitle>
            <CardDescription>Provide information about your travel agency</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <FieldGroup>
                <FieldLabel>Agency Name</FieldLabel>
                <Input
                  placeholder="e.g. World Travel Adventures"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  placeholder="Tell us about your agency..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Logo</FieldLabel>
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-24 h-24 rounded-lg object-cover mb-2 border"
                  />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                />
              </FieldGroup>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Spinner className="mr-2" />}
                  {loading ? 'Creating...' : 'Create Agency'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
