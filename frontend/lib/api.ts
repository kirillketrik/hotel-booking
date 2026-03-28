import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

// Attach CSRF header on mutating requests
api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase() ?? ''
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    config.headers['X-CSRFToken'] = getCsrfToken()
  }
  return config
})

// 401 → attempt token refresh → retry original request once
let isRefreshing = false
type FailedQueueItem = { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
let failedQueue: FailedQueueItem[] = []

function processQueue(error: unknown) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(null)))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await api.post('/api/v1/users/refresh/')
        processQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        // Redirect to login — we broadcast an event so the app can react
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth:logout'))
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export const apiEndpoints = {
  csrf: () => api.get('/api/v1/users/csrf/'),
  login: (data: { email: string; password: string }) => api.post('/api/v1/users/login/', data),
  register: (data: unknown) => api.post('/api/v1/users/register/', data),
  logout: () => api.post('/api/v1/users/logout/'),
  refresh: () => api.post('/api/v1/users/refresh/'),
  me: () => api.get('/api/v1/users/me/'),

  agencies: {
    list: (params?: Record<string, unknown>) => api.get('/api/v1/agencies/', { params }),
    create: (data: FormData) => api.post('/api/v1/agencies/', data),
    get: (id: string) => api.get(`/api/v1/agencies/${id}/`),
    update: (id: string, data: FormData) => api.patch(`/api/v1/agencies/${id}/update/`, data),
    approve: (id: string) => api.post(`/api/v1/agencies/${id}/approve/`),
    reject: (id: string, reason?: string) => api.post(`/api/v1/agencies/${id}/reject/`, { reason }),
  },

  employees: {
    list: (agencyId: string) => api.get(`/api/v1/agencies/${agencyId}/employees/`),
    remove: (agencyId: string, employeeId: string) =>
      api.delete(`/api/v1/agencies/${agencyId}/employees/${employeeId}/`),
    updateRole: (agencyId: string, employeeId: string, role: string) =>
      api.patch(`/api/v1/agencies/${agencyId}/employees/${employeeId}/role/`, { role }),
  },

  invitations: {
    list: (agencyId: string) => api.get(`/api/v1/agencies/${agencyId}/invitations/`),
    create: (agencyId: string, data: unknown) =>
      api.post(`/api/v1/agencies/${agencyId}/invitations/`, data),
    delete: (agencyId: string, invitationId: string) =>
      api.delete(`/api/v1/agencies/${agencyId}/invitations/${invitationId}/`),
    listMine: () => api.get('/api/v1/invitations/'),
    get: (token: string) => api.get(`/api/v1/invitations/${token}/`),
    accept: (token: string) => api.post(`/api/v1/invitations/${token}/accept/`),
    reject: (token: string) => api.post(`/api/v1/invitations/${token}/reject/`),
  },

  tours: {
    list: (agencyId: string, params?: Record<string, unknown>) =>
      api.get(`/api/v1/agencies/${agencyId}/tours/`, { params }),
    get: (agencyId: string, tourId: string) =>
      api.get(`/api/v1/agencies/${agencyId}/tours/${tourId}/`),
    create: (agencyId: string, data: FormData) =>
      api.post(`/api/v1/agencies/${agencyId}/tours/`, data),
    update: (agencyId: string, tourId: string, data: FormData) =>
      api.patch(`/api/v1/agencies/${agencyId}/tours/${tourId}/update/`, data),
    approve: (agencyId: string, tourId: string) =>
      api.post(`/api/v1/agencies/${agencyId}/tours/${tourId}/approve/`),
    reject: (agencyId: string, tourId: string, reason?: string) =>
      api.post(`/api/v1/agencies/${agencyId}/tours/${tourId}/reject/`, { reason }),
    delete: (agencyId: string, tourId: string) =>
      api.delete(`/api/v1/agencies/${agencyId}/tours/${tourId}/`),
  },

  amenities: {
    list: () => api.get('/api/v1/amenities/'),
  },

  admin: {
    agencies: {
      list: (params?: Record<string, unknown>) =>
        api.get('/api/v1/agencies/', { params }),
    },
    tours: {
      list: (params?: Record<string, unknown>) =>
        api.get('/api/v1/tours/', { params }),
    },
  },

  notifications: {
    list: (params?: Record<string, unknown>) =>
      api.get('/api/v1/notifications/', { params }),
    markRead: (id: string) => api.post(`/api/v1/notifications/${id}/read/`),
    markAllRead: () => api.post('/api/v1/notifications/read-all/'),
  },

  staff: {
    users: {
      list: (params?: Record<string, unknown>) =>
        api.get('/api/v1/staff/users/', { params }),
      update: (id: string, data: { is_staff?: boolean; is_active?: boolean }) =>
        api.patch(`/api/v1/staff/users/${id}/`, data),
    },
  },
}
