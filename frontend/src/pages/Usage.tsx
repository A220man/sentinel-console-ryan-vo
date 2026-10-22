import { useState } from 'react'
import { Download, BarChart3, TrendingUp, DollarSign, Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui'
import { Button } from '../components/ui'
import { Select, Option } from '../components/ui'
import { Badge } from '../components/ui'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '../components/ui'
import { useUsage, useUsageSummary, useCreateUsageRecord } from '../hooks/useApi'
import { format } from 'date-fns'
import { clsx } from 'clsx'

export function Usage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [modelFilter, setModelFilter] = useState('')
  const [days, setDays] = useState(30)
  const [summaryDays, setSummaryDays] = useState(30)

  const { data, loading, error, refetch } = useUsage({
    page,
    page_size: pageSize,
    model: modelFilter || undefined,
    start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })

  const { data: summary, loading: summaryLoading } = useUsageSummary(summaryDays)
  const { create, loading: createLoading } = useCreateUsageRecord()

  const totalPages = data?.total_pages || 1
  const totalItems = data?.total || 0

  const formatNumber = (num: number) => num.toLocaleString()
  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(num)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Usage Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor API usage, tokens, and costs across models
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={summaryDays}
            onChange={(e) => setSummaryDays(Number(e.target.value))}
            className="w-[140px]"
            aria-label="Summary period"
          >
            <Option value={7}>Last 7 days</Option>
            <Option value={30}>Last 30 days</Option>
            <Option value={90}>Last 90 days</Option>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Requests</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {summaryLoading ? '...' : formatNumber(summary.total_records)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                  <BarChart3 className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tokens</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {summaryLoading ? '...' : formatNumber(summary.total_tokens)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                  <TrendingUp className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Est. Cost (USD)</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {summaryLoading ? '...' : formatCurrency(summary.total_cost_usd)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-400">
                  <DollarSign className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Models Used</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {summaryLoading ? '...' : summary.by_model.length}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                  <Calendar className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* By Model breakdown */}
      {summary && !summaryLoading && summary.by_model.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
              By Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.by_model.map((model) => (
                  <TableRow key={model.model}>
                    <TableCell className="font-medium font-mono text-sm">{model.model}</TableCell>
                    <TableCell className="text-right">{formatNumber(model.requests)}</TableCell>
                    <TableCell className="text-right">{formatNumber(model.tokens)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(model.cost_usd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Daily trend */}
      {summary && !summaryLoading && summary.daily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
              Daily Trend ({summaryDays} days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.daily.slice(-14).map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{format(new Date(day.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">{formatNumber(day.tokens)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(day.cost_usd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage records table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
              Usage Records
            </CardTitle>
            <CardDescription>Detailed API call history</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={modelFilter}
              onChange={(e) => { setModelFilter(e.target.value); setPage(1); }}
              placeholder="Filter by model"
              className="w-[180px]"
              aria-label="Filter by model"
            >
              <Option value="">All Models</Option>
              {summary?.by_model.map((m) => (
                <Option key={m.model} value={m.model}>{m.model}</Option>
              ))}
            </Select>
            <Select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="w-[140px]"
              aria-label="Items per page"
            >
              <Option value={25}>25 / page</Option>
              <Option value={50}>50 / page</Option>
              <Option value={100}>100 / page</Option>
            </Select>
          </div>
        </CardHeader>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sentinel-600 mx-auto" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading usage records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 dark:text-red-400">
            <p>Error loading usage: {error}</p>
            <Button variant="outline" onClick={refetch} className="mt-2">Retry</Button>
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>No usage records found.</p>
            <p className="text-sm mt-1">Record some API usage to see data here.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Input Tokens</TableHead>
                  <TableHead className="text-right">Output Tokens</TableHead>
                  <TableHead className="text-right">Total Tokens</TableHead>
                  <TableHead className="text-right">Cost (USD)</TableHead>
                  <TableHead>Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {record.timestamp ? format(new Date(record.timestamp), 'MMM d, yyyy HH:mm:ss') : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{record.model}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(record.input_tokens)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(record.output_tokens)}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatNumber(record.total_tokens)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(record.cost_usd)}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
                      {record.session_id || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Page {page} of {totalPages} ({totalItems} total)
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}