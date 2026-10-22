import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch, BarChart3, Users, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui'
import { Badge } from '../components/ui'
import { useHealth } from '../hooks/useApi'
import { useIssuesSummary } from '../hooks/useApi'
import { useUsageSummary } from '../hooks/useApi'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean
}

function clsx(...args: (string | undefined | false)[]) {
  return args.filter(Boolean).join(' ')
}

function StatCard({ title, value, description, icon, trend, trendUp }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            {trend && (
              <p className="mt-2 flex items-center gap-1 text-sm">
                <TrendingUp className={clsx('h-4 w-4', trendUp ? 'text-green-600' : 'text-red-600')} aria-hidden="true" />
                <span className={clsx(trendUp ? 'text-green-600' : 'text-red-600')}>{trend}</span>
              </p>
            )}
          </div>
          <div className="p-3 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-xl text-sentinel-600 dark:text-sentinel-400">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const { data: health, loading: healthLoading } = useHealth()
  const { data: issuesSummary, loading: issuesLoading } = useIssuesSummary()
  const { data: usageSummary, loading: usageLoading } = useUsageSummary(30)

  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Overview of your AI/ML development observability
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {time.toLocaleTimeString()}
          </span>
          <Badge variant={health?.status === 'healthy' ? 'success' : 'danger'}>
            {healthLoading ? 'Checking...' : health?.status || 'Unknown'}
          </Badge>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Issues"
          value={issuesLoading ? '...' : issuesSummary?.total || 0}
          description="Tracked across repositories"
          icon={<GitBranch className="h-6 w-6" aria-hidden="true" />}
        />
        <StatCard
          title="Open Bugs"
          value={issuesLoading ? '...' : issuesSummary?.by_type?.bug || 0}
          description="Requiring attention"
          icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
        />
        <StatCard
          title="Total Tokens (30d)"
          value={usageLoading ? '...' : usageSummary?.total_tokens?.toLocaleString() || '0'}
          description="API usage across models"
          icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
        />
        <StatCard
          title="Active Profiles"
          value={usageLoading ? '...' : '1'}
          description="Configured accounts"
          icon={<Users className="h-6 w-6" aria-hidden="true" />}
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" aria-hidden="true" />
              Issues
            </CardTitle>
            <CardDescription>Browse, search, and manage GitHub issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link to="/issues" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <p className="font-medium text-gray-900 dark:text-gray-100">View All Issues</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Browse with filters and pagination</p>
              </Link>
              <Link to="/issues?issue_type=bug" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <p className="font-medium text-gray-900 dark:text-gray-100">Open Bugs</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Filter by type: bug</p>
              </Link>
              <Link to="/issues?status=open" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <p className="font-medium text-gray-900 dark:text-gray-100">All Open Issues</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Filter by status: open</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
              Usage Analytics
            </CardTitle>
            <CardDescription>Monitor API usage and costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link to="/usage" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <p className="font-medium text-gray-900 dark:text-gray-100">Usage Dashboard</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">View trends and model breakdown</p>
              </Link>
              <Link to="/usage?days=7" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <p className="font-medium text-gray-900 dark:text-gray-100">Last 7 Days</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recent usage snapshot</p>
              </Link>
              <Link to="/usage?days=30" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <p className="font-medium text-gray-900 dark:text-gray-100">Last 30 Days</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly overview</p>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" aria-hidden="true" />
              Profiles & Settings
            </CardTitle>
            <CardDescription>Manage accounts and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link to="/profiles" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <p className="font-medium text-gray-900 dark:text-gray-100">Manage Profiles</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Switch between accounts</p>
              </Link>
              <Link to="/settings" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <p className="font-medium text-gray-900 dark:text-gray-100">Accessibility</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Theme, motion, contrast settings</p>
              </Link>
              <Link to="/settings" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <p className="font-medium text-gray-900 dark:text-gray-100">General Settings</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">App preferences</p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest issues and usage events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No recent activity to display.</p>
            <p className="text-sm mt-1">Start tracking issues and usage to see activity here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}