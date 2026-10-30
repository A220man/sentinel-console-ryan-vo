import { useState, useMemo } from 'react'
import { Search, Filter, ChevronDown, ChevronUp, Plus, Download, AlertCircle, Eye } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui'
import { Button } from '../components/ui'
import { Input } from '../components/ui'
import { Select, Option } from '../components/ui'
import { Badge } from '../components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui'
import { Modal } from '../components/ui'
import { useIssues, useIssuesSummary, useCreateIssue, useUpdateIssue, useSimilarIssues } from '../hooks/useApi'
import type { Issue, IssueType, IssuePriority, IssueStatus } from '../types'
import { format } from 'date-fns'

const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'question', label: 'Question' },
]

const PRIORITIES: { value: IssuePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const STATUSES: { value: IssueStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_COLORS: Record<IssuePriority, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
}

const STATUS_COLORS: Record<IssueStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
}

const TYPE_COLORS: Record<IssueType, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  bug: 'danger',
  feature: 'success',
  enhancement: 'info',
  question: 'default',
}

export function Issues() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [issueTypeFilter, setIssueTypeFilter] = useState<IssueType | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | ''>('')
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('')
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'priority' | 'number'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null)
  const [similarModalOpen, setSimilarModalOpen] = useState(false)
  const [similarIssue, setSimilarIssue] = useState<Issue | null>(null)
  const [formData, setFormData] = useState({
    external_id: '',
    number: '',
    title: '',
    body: '',
    issue_type: 'question' as IssueType,
    priority: 'medium' as IssuePriority,
    status: 'open' as IssueStatus,
  })

  const { data, loading, error, refetch } = useIssues({
    page,
    page_size: pageSize,
    issue_type: issueTypeFilter || undefined,
    priority: priorityFilter || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
  })

  const { data: summary } = useIssuesSummary()
  const { create, loading: createLoading } = useCreateIssue()
  const { update, loading: updateLoading } = useUpdateIssue()
  const { data: similarData, loading: similarLoading, error: similarError, refetch: refetchSimilar } = useSimilarIssues(similarIssue?.id || null)

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await create({
        external_id: formData.external_id,
        number: parseInt(formData.number, 10),
        title: formData.title,
        body: formData.body || undefined,
        issue_type: formData.issue_type,
        priority: formData.priority,
        status: formData.status,
      })
      setCreateModalOpen(false)
      setFormData({
        external_id: '',
        number: '',
        title: '',
        body: '',
        issue_type: 'question',
        priority: 'medium',
        status: 'open',
      })
      refetch()
    } catch (err) {
      console.error('Failed to create issue:', err)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingIssue) return
    try {
      await update(editingIssue.id, {
        title: formData.title,
        body: formData.body || undefined,
        issue_type: formData.issue_type,
        priority: formData.priority,
        status: formData.status,
      })
      setEditModalOpen(false)
      setEditingIssue(null)
      refetch()
    } catch (err) {
      console.error('Failed to update issue:', err)
    }
  }

  const openEditModal = (issue: Issue) => {
    setEditingIssue(issue)
    setFormData({
      external_id: issue.external_id,
      number: issue.number.toString(),
      title: issue.title,
      body: issue.body || '',
      issue_type: issue.issue_type as IssueType,
      priority: issue.priority as IssuePriority,
      status: issue.status as IssueStatus,
    })
    setEditModalOpen(true)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const totalPages = data?.total_pages || 1
  const totalItems = data?.total || 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Issues</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Browse and manage GitHub issues with AI-powered classification
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Issue
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search issues"
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={issueTypeFilter}
              onChange={(e) => setIssueTypeFilter(e.target.value as IssueType)}
              placeholder="Type"
              aria-label="Filter by issue type"
            >
              <Option value="">All Types</Option>
              {ISSUE_TYPES.map((t) => (
                <Option key={t.value} value={t.value}>{t.label}</Option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as IssuePriority)}
              placeholder="Priority"
              aria-label="Filter by priority"
            >
              <Option value="">All Priorities</Option>
              {PRIORITIES.map((p) => (
                <Option key={p.value} value={p.value}>{p.label}</Option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as IssueStatus)}
              placeholder="Status"
              aria-label="Filter by status"
            >
              <Option value="">All Statuses</Option>
              {STATUSES.map((s) => (
                <Option key={s.value} value={s.value}>{s.label}</Option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-32">
            <Select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              aria-label="Items per page"
            >
              <Option value={10}>10 / page</Option>
              <Option value={20}>20 / page</Option>
              <Option value={50}>50 / page</Option>
              <Option value={100}>100 / page</Option>
            </Select>
          </div>
        </form>
      </Card>

      {/* Summary stats */}
      {summary && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">Total: {summary.total}</Badge>
          {Object.entries(summary.by_type).map(([type, count]) => (
            <Badge key={type} variant={TYPE_COLORS[type as IssueType] || 'default'}>
              {type}: {count}
            </Badge>
          ))}
          {Object.entries(summary.by_priority).map(([priority, count]) => (
            <Badge key={priority} variant={PRIORITY_COLORS[priority as IssuePriority] || 'default'}>
              {priority}: {count}
            </Badge>
          ))}
          {Object.entries(summary.by_status).map(([status, count]) => (
            <Badge key={status} variant={STATUS_COLORS[status as IssueStatus] || 'default'}>
              {status}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Issues table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sentinel-600 mx-auto" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading issues...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 dark:text-red-400">
            <p>Error loading issues: {error}</p>
            <Button variant="outline" onClick={refetch} className="mt-2">
              Retry
            </Button>
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>No issues found.</p>
            <p className="text-sm mt-1">Try adjusting your filters or create a new issue.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort('number')}
                      className="flex items-center gap-1 hover:text-sentinel-600 dark:hover:text-sentinel-400"
                    >
                      # {sortBy === 'number' ? (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : ''}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center gap-1 hover:text-sentinel-600 dark:hover:text-sentinel-400"
                    >
                      Title {sortBy === 'created_at' ? (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : ''}
                    </button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('updated_at')}
                      className="flex items-center gap-1 hover:text-sentinel-600 dark:hover:text-sentinel-400"
                    >
                      Updated {sortBy === 'updated_at' ? (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : ''}
                    </button>
                  </TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-mono text-gray-500 dark:text-gray-400">#{issue.number}</TableCell>
                    <TableCell className="max-w-xs truncate font-medium">{issue.title}</TableCell>
                    <TableCell>
                      <Badge variant={TYPE_COLORS[issue.issue_type as IssueType] || 'default'}>
                        {issue.issue_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={PRIORITY_COLORS[issue.priority as IssuePriority] || 'default'}>
                        {issue.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[issue.status as IssueStatus] || 'default'}>
                        {issue.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{issue.comments_count}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400">
                      {issue.updated_at ? format(new Date(issue.updated_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      {issue.classification_confidence > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-mono">
                            {(issue.classification_confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSimilarIssue(issue); setSimilarModalOpen(true); refetchSimilar(); }}
                          aria-label={`View similar issues for #${issue.number}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(issue)}
                          aria-label={`Edit issue #${issue.number}`}
                        >
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Page {page} of {totalPages} ({totalItems} total)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Issue"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="External ID"
            value={formData.external_id}
            onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
            required
            placeholder="e.g., anthropics/claude-code#123"
          />
          <Input
            label="Issue Number"
            type="number"
            value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            required
            placeholder="123"
          />
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="Issue title"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Type"
              value={formData.issue_type}
              onChange={(e) => setFormData({ ...formData, issue_type: e.target.value as IssueType })}
              aria-label="Issue type"
            >
              {ISSUE_TYPES.map((t) => (
                <Option key={t.value} value={t.value}>{t.label}</Option>
              ))}
            </Select>
            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as IssuePriority })}
              aria-label="Issue priority"
            >
              {PRIORITIES.map((p) => (
                <Option key={p.value} value={p.value}>{p.label}</Option>
              ))}
            </Select>
          </div>
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as IssueStatus })}
            aria-label="Issue status"
          >
            {STATUSES.map((s) => (
              <Option key={s.value} value={s.value}>{s.label}</Option>
            ))}
          </Select>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-sentinel-500"
              placeholder="Issue description (Markdown supported)"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createLoading}>
              Create Issue
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingIssue(null); }}
        title="Edit Issue"
        size="lg"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Type"
              value={formData.issue_type}
              onChange={(e) => setFormData({ ...formData, issue_type: e.target.value as IssueType })}
            >
              {ISSUE_TYPES.map((t) => (
                <Option key={t.value} value={t.value}>{t.label}</Option>
              ))}
            </Select>
            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as IssuePriority })}
            >
              {PRIORITIES.map((p) => (
                <Option key={p.value} value={p.value}>{p.label}</Option>
              ))}
            </Select>
          </div>
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as IssueStatus })}
          >
            {STATUSES.map((s) => (
              <Option key={s.value} value={s.value}>{s.label}</Option>
            ))}
          </Select>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-sentinel-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => { setEditModalOpen(false); setEditingIssue(null); }}>
              Cancel
            </Button>
            <Button type="submit" loading={updateLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}