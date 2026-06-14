import type { PropsWithChildren } from 'react'
import { createContext, useContext } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiRequest } from '../../shared/api/client'

export type Seller = {
  id: number
  username: string
  display_name: string
  email: string | null
  is_active: boolean
}

type LoginPayload = {
  username: string
  password: string
}

type AuthResponse = {
  message: string
  seller: Seller
}

type AuthContextValue = {
  seller: Seller | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<Seller>
  logout: () => Promise<void>
  refreshSession: () => Promise<Seller | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchCurrentSeller({ signal }: { signal?: AbortSignal } = {}) {
  try {
    const response = await apiRequest<AuthResponse>('/auth/me', { signal })
    return response.seller
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      try {
        const refreshed = await apiRequest<AuthResponse>('/auth/refresh', {
          method: 'POST',
          signal,
        })

        return refreshed.seller
      } catch (refreshError) {
        if (refreshError instanceof ApiError && refreshError.status === 401) {
          return null
        }

        throw refreshError
      }
    }

    throw error
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentSeller,
  })

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      await queryClient.cancelQueries({ queryKey: ['auth', 'me'] })

      await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: payload,
      })

      const confirmedSeller = await fetchCurrentSeller()
      if (!confirmedSeller) {
        throw new Error(
          'Backend accepted login, but browser did not keep the seller session cookies.',
        )
      }

      return confirmedSeller
    },
    onSuccess: async (seller) => {
      await queryClient.cancelQueries({ queryKey: ['auth', 'me'] })
      queryClient.removeQueries({ queryKey: ['seller-product-preview'] })
      queryClient.setQueryData(['auth', 'me'], seller)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/auth/logout', {
        method: 'POST',
        parseAs: 'void',
      })
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['seller-product-preview'] })
      queryClient.setQueryData(['auth', 'me'], null)
    },
  })

  const value: AuthContextValue = {
    seller: sessionQuery.data ?? null,
    isLoading: sessionQuery.isLoading,
    login: async (payload) => loginMutation.mutateAsync(payload),
    logout: async () => {
      await logoutMutation.mutateAsync()
    },
    refreshSession: async () => {
      const seller = await queryClient.fetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: fetchCurrentSeller,
      })

      queryClient.setQueryData(['auth', 'me'], seller)
      return seller
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
