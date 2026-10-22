import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_API_URL || 'http://localhost:8000/api'

class ApiClient {
  private client: AxiosInstance
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add auth token if available
        const token = localStorage.getItem('access_token')
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          // Could trigger logout flow here
        }
        return Promise.reject(error)
      }
    )
  }

  // Issues
  async getIssues(params?: {
    page?: number
    page_size?: number
    issue_type?: string
    priority?: string
    status?: string
    search?: string
    sort_by?: string
    sort_order?: string
  }) {
    const response = await this.client.get('/issues', { params })
    return response.data
  }

  async getIssue(id: number) {
    const response = await this.client.get(`/issues/${id}`)
    return response.data
  }

  async createIssue(data: Record<string, unknown>) {
    const response = await this.client.post('/issues', data)
    return response.data
  }

  async updateIssue(id: number, data: Record<string, unknown>) {
    const response = await this.client.patch(`/issues/${id}`, data)
    return response.data
  }

  async getIssuesSummary() {
    const response = await this.client.get('/issues/stats/summary')
    return response.data
  }

  // Usage
  async getUsage(params?: {
    page?: number
    page_size?: number
    model?: string
    user_id?: string
    session_id?: string
    start_date?: string
    end_date?: string
  }) {
    const response = await this.client.get('/usage', { params })
    return response.data
  }

  async createUsageRecord(data: Record<string, unknown>) {
    const response = await this.client.post('/usage', data)
    return response.data
  }

  async getUsageSummary(days?: number, userId?: string) {
    const response = await this.client.get('/usage/stats/summary', {
      params: { days, user_id: userId }
    })
    return response.data
  }

  // Profiles
  async getCurrentProfile() {
    const response = await this.client.get('/profiles/me')
    return response.data
  }

  async switchProfile(profileId: number) {
    const response = await this.client.post(`/profiles/me/switch/${profileId}`)
    return response.data
  }

  async createProfile(data: Record<string, unknown>) {
    const response = await this.client.post('/profiles', data)
    return response.data
  }

  async updateProfile(profileId: number, data: Record<string, unknown>) {
    const response = await this.client.patch(`/profiles/${profileId}`, data)
    return response.data
  }

  // Accessibility
  async getAccessibility() {
    const response = await this.client.get('/accessibility')
    return response.data
  }

  async updateAccessibility(data: Record<string, unknown>) {
    const response = await this.client.patch('/accessibility', data)
    return response.data
  }

  // Health
  async healthCheck() {
    const response = await this.client.get('/health')
    return response.data
  }
}

export const api = new ApiClient()