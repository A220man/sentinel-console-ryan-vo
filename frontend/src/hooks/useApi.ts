import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import type {
  Issue,
  PaginatedResponse,
  IssuesSummary,
  UsageRecord,
  UsageSummary,
  ProfileResponse,
  AccountProfile,
  AccessibilitySettings,
  HealthResponse,
} from '../types'

// Generic hook for API calls
function useApiCall<T>(apiCall: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiCall()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    execute()
  }, [execute])

  return { data, loading, error, refetch: execute }
}

// Issues hooks
export function useIssues(params?: {
  page?: number
  page_size?: number
  issue_type?: string
  priority?: string
  status?: string
  search?: string
  sort_by?: string
  sort_order?: string
}) {
  return useApiCall<PaginatedResponse<Issue>>(
    () => api.getIssues(params),
    [params?.page, params?.page_size, params?.issue_type, params?.priority, params?.status, params?.search, params?.sort_by, params?.sort_order]
  )
}

export function useIssue(id: number | null) {
  return useApiCall<Issue>(
    () => api.getIssue(id!),
    [id]
  )
}

export function useIssuesSummary() {
  return useApiCall<IssuesSummary>(() => api.getIssuesSummary(), [])
}

export function useCreateIssue() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async (data: Partial<Issue>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.createIssue(data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { create, loading, error }
}

export function useUpdateIssue() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = async (id: number, data: Partial<Issue>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.updateIssue(id, data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update issue')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { update, loading, error }
}

// Usage hooks
export function useUsage(params?: {
  page?: number
  page_size?: number
  model?: string
  user_id?: string
  session_id?: string
  start_date?: string
  end_date?: string
}) {
  return useApiCall<PaginatedResponse<UsageRecord>>(
    () => api.getUsage(params),
    [params?.page, params?.page_size, params?.model, params?.user_id, params?.session_id, params?.start_date, params?.end_date]
  )
}

export function useUsageSummary(days?: number, userId?: string) {
  return useApiCall<UsageSummary>(
    () => api.getUsageSummary(days, userId),
    [days, userId]
  )
}

export function useCreateUsageRecord() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async (data: Partial<UsageRecord>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.createUsageRecord(data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create usage record')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { create, loading, error }
}

// Profiles hooks
export function useCurrentProfile() {
  return useApiCall<ProfileResponse>(() => api.getCurrentProfile(), [])
}

export function useSwitchProfile() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const switchProfile = async (profileId: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.switchProfile(profileId)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch profile')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { switchProfile, loading, error }
}

export function useCreateProfile() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async (data: Partial<AccountProfile>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.createProfile(data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { create, loading, error }
}

export function useUpdateProfile() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = async (profileId: number, data: Partial<AccountProfile>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.updateProfile(profileId, data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { update, loading, error }
}

// Accessibility hooks
export function useAccessibility() {
  return useApiCall<AccessibilitySettings>(() => api.getAccessibility(), [])
}

export function useUpdateAccessibility() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = async (data: Partial<AccessibilitySettings>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.updateAccessibility(data)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update accessibility settings')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { update, loading, error }
}

// Health hook
export function useHealth() {
  return useApiCall<HealthResponse>(() => api.healthCheck(), [])
}