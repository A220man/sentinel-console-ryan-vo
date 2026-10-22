export type IssueType = 'bug' | 'feature' | 'enhancement' | 'question'
export type IssuePriority = 'low' | 'medium' | 'high' | 'critical'
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Issue {
  id: number
  external_id: string
  number: number
  title: string
  body: string | null
  html_url: string | null
  issue_type: IssueType
  priority: IssuePriority
  status: IssueStatus
  comments_count: number
  labels: string
  assignees: string
  author: string | null
  created_at: string | null
  updated_at: string | null
  closed_at: string | null
  classification_confidence: number
  classified_at: string | null
  similarity_hash: string | null
  priority_score: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface IssuesSummary {
  total: number
  by_type: Record<string, number>
  by_priority: Record<string, number>
  by_status: Record<string, number>
}

export interface UsageRecord {
  id: number
  timestamp: string | null
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  session_id: string | null
  user_id: string | null
}

export interface UsageSummary {
  period_days: number
  total_records: number
  total_tokens: number
  total_cost_usd: number
  by_model: Array<{
    model: string
    requests: number
    tokens: number
    cost_usd: number
  }>
  daily: Array<{
    date: string
    tokens: number
    cost_usd: number
  }>
}

export interface AccountProfile {
  id: number
  user_id: number
  name: string
  account_type: string
  account_id: string
  display_name: string | null
  mcp_config: string | null
  is_active: boolean
  is_default: boolean
  created_at: string | null
  updated_at: string | null
}

export interface UserProfile {
  id: number
  email: string
  name: string | null
  avatar_url: string | null
  active_profile_id: number
  oidc_sub: string | null
  created_at: string | null
  updated_at: string | null
  last_login: string | null
}

export interface ProfileResponse {
  user: UserProfile
  profiles: AccountProfile[]
  active_profile: AccountProfile | null
  accessibility: AccessibilitySettings
}

export interface AccessibilitySettings {
  id: number
  user_id: number
  reduced_motion: boolean
  high_contrast: boolean
  screen_reader_announcements: boolean
  status_update_interval_ms: number
  theme: 'light' | 'dark' | 'system'
  font_size: number
  created_at: string | null
  updated_at: string | null
}

export interface HealthResponse {
  status: string
  service: string
  version: string
  timestamp: string
}