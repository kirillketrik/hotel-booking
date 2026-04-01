'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Pencil, Star, Trash2 } from 'lucide-react'
import { apiEndpoints } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import type { AgencyReview } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const active = hovered ?? value
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            'w-7 h-7 rounded-full text-xs font-semibold border transition-all',
            n <= active
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-muted-foreground/30 hover:border-primary/60'
          )}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function ReviewForm({
  agencyId,
  reviewId,
  initial,
  onCancel,
  onSuccess,
}: {
  agencyId: string
  reviewId?: string
  initial?: { rating: number; comment: string }
  onCancel: () => void
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(initial?.rating ?? 8)
  const [comment, setComment] = useState(initial?.comment ?? '')
  const isEdit = !!reviewId

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? apiEndpoints.agencyReviews.update(agencyId, reviewId!, { rating, comment })
        : apiEndpoints.agencyReviews.create(agencyId, { rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-reviews', agencyId] })
      queryClient.invalidateQueries({ queryKey: ['agency', agencyId] })
      toast.success(isEdit ? 'Review updated' : 'Review submitted!')
      onSuccess()
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: unknown } })?.response?.data
      const text =
        typeof data === 'string'
          ? data
          : Array.isArray(data)
          ? (data as string[])[0]
          : typeof data === 'object' && data !== null
          ? (Object.values(data as Record<string, string[]>)[0]?.[0] ?? 'Something went wrong')
          : 'Something went wrong'
      toast.error(String(text))
    },
  })

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <p className="text-sm font-semibold">{isEdit ? 'Edit your review' : 'Write a review'}</p>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Rating (1–10)</p>
        <RatingInput value={rating} onChange={setRating} />
      </div>
      <Textarea
        placeholder="Share your experience with this agency (optional)"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Submit'}
        </Button>
      </div>
    </div>
  )
}

function ReviewCard({
  review,
  isMine,
  onEdit,
  onDelete,
}: {
  review: AgencyReview
  isMine: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const ratingColor =
    review.rating >= 8 ? 'text-green-600' : review.rating >= 5 ? 'text-yellow-600' : 'text-red-500'

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {review.user_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium leading-none">{review.user_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(review.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('text-lg font-bold tabular-nums', ratingColor)}>
            {review.rating}
            <span className="text-xs font-normal text-muted-foreground">/10</span>
          </span>
          {isMine && (
            <div className="flex gap-0.5">
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={onEdit}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                title="Delete"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {review.comment && (
        <p className="text-sm text-muted-foreground leading-relaxed pl-10">{review.comment}</p>
      )}
    </div>
  )
}

export function AgencyReviewSection({ agencyId }: { agencyId: string }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['agency-reviews', agencyId],
    queryFn: async () => {
      const res = await apiEndpoints.agencyReviews.list(agencyId)
      return res.data.results as AgencyReview[]
    },
  })

  const reviews = data ?? []
  const myReview = user ? reviews.find((r) => r.user_id === user.id) : undefined

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => apiEndpoints.agencyReviews.delete(agencyId, reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-reviews', agencyId] })
      queryClient.invalidateQueries({ queryKey: ['agency', agencyId] })
      setDeletingId(null)
      toast.success('Review deleted')
    },
    onError: () => toast.error('Failed to delete review'),
  })

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Reviews</h2>
          {avgRating && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10">
              <Star className="w-3.5 h-3.5 fill-primary text-primary" />
              <span className="text-sm font-semibold text-primary">{avgRating}</span>
              <span className="text-xs text-muted-foreground">/ 10</span>
            </div>
          )}
          {reviews.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {user && !myReview && !showNewForm && (
          <Button size="sm" variant="outline" onClick={() => setShowNewForm(true)}>
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Write a review
          </Button>
        )}
      </div>

      {showNewForm && !myReview && (
        <ReviewForm
          agencyId={agencyId}
          onCancel={() => setShowNewForm(false)}
          onSuccess={() => setShowNewForm(false)}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No reviews yet for this agency.
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) =>
            editingId === review.id ? (
              <ReviewForm
                key={review.id}
                agencyId={agencyId}
                reviewId={review.id}
                initial={{ rating: review.rating, comment: review.comment }}
                onCancel={() => setEditingId(null)}
                onSuccess={() => setEditingId(null)}
              />
            ) : (
              <ReviewCard
                key={review.id}
                review={review}
                isMine={user?.id === review.user_id}
                onEdit={() => setEditingId(review.id)}
                onDelete={() => setDeletingId(review.id)}
              />
            )
          )}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete review?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
