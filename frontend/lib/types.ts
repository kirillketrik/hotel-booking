// API types mirroring the Django REST Framework backend

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  groups: string[]
  is_staff: boolean
}

export interface Agency {
  id: string
  name: string
  description: string
  logo: string | null
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string
  created_at: string
  updated_at: string
}

export interface AgencyEmployee {
  id: string
  user: string
  user_email: string
  user_first_name: string
  user_last_name: string
  agency: string
  role: 'owner' | 'admin' | 'operator'
  created_at: string
}

export interface Invitation {
  id: string
  agency: string
  agency_name: string
  invited_email: string | null
  invited_user: string | null
  invited_user_email: string | null
  invited_user_full_name: string | null
  role: 'admin' | 'operator'
  token: string
  status: 'pending' | 'accepted' | 'rejected'
  expires_at: string | null
  created_at: string
}

export interface Location {
  country: string
  city: string
  latitude: number | null
  longitude: number | null
}

export interface HotelRoom {
  id: string
  room_type: 'standard' | 'deluxe' | 'suite' | 'family' | 'economy'
  description: string
  price_per_night: string
  capacity: number
  quantity: number
}

export interface Hotel {
  id: string
  name: string
  description: string
  stars: number
  amenities: { id: string; name: string; icon: string }[]
  images: { id: string; image: string; order: number }[]
  rooms: HotelRoom[]
}

export interface TourTransfer {
  id: string
  transfer_type: 'airport' | 'hotel' | 'city' | 'custom'
  description: string
  price: string
  is_included: boolean
}

export interface Tour {
  id: string
  agency: string
  agency_name: string
  title: string
  description: string
  cover_image: string | null
  price: string
  start_date: string
  end_date: string
  duration_days: number
  location: Location
  max_adults: number
  max_children: number
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string
  images: { id: string; image: string; order: number }[]
  hotels: Hotel[]
  transfers: TourTransfer[]
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  title: string
  message: string
  notification_type:
    | 'agency_submitted'
    | 'agency_approved'
    | 'agency_rejected'
    | 'tour_submitted'
    | 'tour_approved'
    | 'tour_rejected'
    | 'invitation_received'
  is_read: boolean
  created_at: string
}
