'use client'

import { Heart } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiEndpoints } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface WishlistButtonProps {
  tourId: string
  isWishlisted: boolean
  /** Which query keys to invalidate on toggle. Defaults to ['tour', tourId] */
  invalidateKeys?: unknown[][]
  className?: string
  size?: 'sm' | 'md'
}

export function WishlistButton({
  tourId,
  isWishlisted,
  invalidateKeys,
  className,
  size = 'md',
}: WishlistButtonProps) {
  const { user } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => apiEndpoints.wishlist.toggle(tourId),
    onMutate: async () => {
      // Optimistic update for all relevant queries
      const keys = invalidateKeys ?? [['tour', tourId]]
      for (const key of keys) {
        await qc.cancelQueries({ queryKey: key })
      }
    },
    onSuccess: ({ data }: { data: { wishlisted: boolean } }) => {
      const keys = invalidateKeys ?? [['tour', tourId]]
      for (const key of keys) {
        qc.invalidateQueries({ queryKey: key })
      }
      qc.invalidateQueries({ queryKey: ['wishlist'] })
      if (data.wishlisted) {
        toast.success('Added to wishlist')
      } else {
        toast('Removed from wishlist')
      }
    },
    onError: () => toast.error('Failed to update wishlist'),
  })

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      router.push('/login')
      return
    }
    mutation.mutate()
  }

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const btnSize = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'

  return (
    <button
      onClick={handleClick}
      disabled={mutation.isPending}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
      className={cn(
        'rounded-full flex items-center justify-center transition-all',
        'bg-white/90 hover:bg-white shadow-sm border border-white/20',
        'disabled:opacity-50',
        btnSize,
        className,
      )}
    >
      <Heart
        className={cn(
          iconSize,
          'transition-colors',
          isWishlisted
            ? 'fill-red-500 text-red-500'
            : 'text-gray-500 hover:text-red-400',
        )}
      />
    </button>
  )
}
