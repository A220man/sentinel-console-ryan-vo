import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../App'

// Mock API calls
vi.mock('../hooks/useApi', async () => {
  const actual = await vi.importActual('../hooks/useApi')
  return {
    ...actual,
    useHealth: () => ({
      data: { status: 'healthy', service: 'sentinel-console', version: '1.0.0', timestamp: new Date().toISOString() },
      loading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useIssuesSummary: () => ({
      data: { total: 5, by_type: { bug: 2, feature: 3 }, by_priority: { high: 1, medium: 4 }, by_status: { open: 3, closed: 2 } },
      loading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useUsageSummary: () => ({
      data: { period_days: 30, total_records: 10, total_tokens: 15000, total_cost_usd: 0.15, by_model: [], daily: [] },
      loading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useCurrentProfile: () => ({
      data: {
        user: { id: 1, email: 'demo@sentinel.local', name: 'Demo User', active_profile_id: 1 },
        profiles: [{ id: 1, name: 'default', account_type: 'anthropic', account_id: 'demo', display_name: 'Demo Account', is_active: true, is_default: true }],
        active_profile: { id: 1, name: 'default', account_type: 'anthropic', account_id: 'demo', display_name: 'Demo Account', is_active: true, is_default: true },
        accessibility: { reduced_motion: false, high_contrast: false, screen_reader_announcements: true, status_update_interval_ms: 500, theme: 'system', font_size: 14 },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useAccessibility: () => ({
      data: { reduced_motion: false, high_contrast: false, screen_reader_announcements: true, status_update_interval_ms: 500, theme: 'system', font_size: 14 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useUpdateAccessibility: () => ({ update: vi.fn(), loading: false, error: null }),
    useIssues: () => ({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    }),
  }
})

describe('App', () => {
  it('renders dashboard by default', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Overview of your AI/ML development observability')).toBeInTheDocument()
  })

  it('navigates to issues page', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    // Click Issues link in sidebar (the NavLink)
    const issuesLink = screen.getByRole('link', { name: 'Issues' })
    fireEvent.click(issuesLink)

    expect(screen.getByRole('heading', { name: 'Issues' })).toBeInTheDocument()
    expect(screen.getByText('Browse and manage GitHub issues with AI-powered classification')).toBeInTheDocument()
  })

  it('navigates to usage page', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    const usageLink = screen.getByRole('link', { name: 'Usage' })
    fireEvent.click(usageLink)

    expect(screen.getByRole('heading', { name: 'Usage Analytics' })).toBeInTheDocument()
    expect(screen.getByText('Monitor API usage, tokens, and costs across models')).toBeInTheDocument()
  })

  it('navigates to profiles page', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    const profilesLink = screen.getByRole('link', { name: 'Profiles' })
    fireEvent.click(profilesLink)

    expect(screen.getByRole('heading', { name: 'Profiles' })).toBeInTheDocument()
    expect(screen.getByText('Manage multiple AI provider accounts and configurations')).toBeInTheDocument()
  })

  it('navigates to settings page', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )

    const settingsLink = screen.getByRole('link', { name: 'Settings' })
    fireEvent.click(settingsLink)

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Customize your Sentinel Console experience')).toBeInTheDocument()
  })
})