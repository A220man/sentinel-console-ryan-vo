import { useState } from 'react'
import { Moon, Sun, Monitor, MousePointer, Eye, Type, Palette, Save, Check } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui'
import { Button } from '../components/ui'
import { Select, Option } from '../components/ui'
import { useAccessibility, useUpdateAccessibility } from '../hooks/useApi'
import { useTheme } from '../hooks/useTheme'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function Settings() {
  const { data: accessibility, loading, error } = useAccessibility()
  const { update, loading: updateLoading } = useUpdateAccessibility()
  const { theme, resolvedTheme, toggleTheme, setThemeMode } = useTheme()
  const prefersReducedMotion = useReducedMotion()

  const [saved, setSaved] = useState(false)

  const handleSave = async (updates: Record<string, unknown>) => {
    try {
      await update(updates)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sentinel-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600 dark:text-red-400">
        <p>Error loading settings: {error}</p>
      </div>
    )
  }

  const a11y = accessibility || {
    reduced_motion: false,
    high_contrast: false,
    screen_reader_announcements: true,
    status_update_interval_ms: 500,
    theme: 'system' as const,
    font_size: 14,
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Customize your Sentinel Console experience
        </p>
      </div>

      {/* Theme settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" aria-hidden="true" />
            Appearance
          </CardTitle>
          <CardDescription>Configure theme, colors, and visual preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Color Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Light', icon: Sun, desc: 'Always use light mode' },
                { value: 'dark', label: 'Dark', icon: Moon, desc: 'Always use dark mode' },
                { value: 'system', label: 'System', icon: Monitor, desc: 'Match system preference' },
              ].map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => { setThemeMode(value as 'light' | 'dark' | 'system'); handleSave({ theme: value as 'light' | 'dark' | 'system' }); }}
                  className={clsx(
                    'p-4 rounded-xl border-2 transition-all text-left',
                    theme === value
                      ? 'border-sentinel-500 bg-sentinel-50 dark:bg-sentinel-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                  aria-pressed={theme === value}
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'p-2 rounded-lg',
                      theme === value
                        ? 'bg-sentinel-100 dark:bg-sentinel-800'
                        : 'bg-gray-100 dark:bg-gray-800'
                    )}>
                      <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                    </div>
                  </div>
                  {theme === value && (
                    <div className="absolute top-2 right-2 text-sentinel-500">
                      <Check className="h-5 w-5" aria-hidden="true" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Current resolved theme: <strong>{resolvedTheme}</strong>
            </p>
          </div>

          {/* Font size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Font Size: <span className="font-mono">{a11y.font_size}px</span>
            </label>
            <input
              type="range"
              min="12"
              max="24"
              value={a11y.font_size}
              onChange={(e) => handleSave({ font_size: Number(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sentinel-600"
              aria-label="Font size"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>12px</span>
              <span>24px</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" aria-hidden="true" />
            Accessibility
          </CardTitle>
          <CardDescription>Adjust interface behavior for accessibility needs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={a11y.reduced_motion || prefersReducedMotion}
                onChange={(e) => handleSave({ reduced_motion: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-sentinel-600 focus:ring-sentinel-500"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Reduced Motion</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Minimize animations and transitions. {prefersReducedMotion && '(System preference detected)'}
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={a11y.high_contrast}
                onChange={(e) => handleSave({ high_contrast: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-sentinel-600 focus:ring-sentinel-500"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">High Contrast</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Increase color contrast for better visibility
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={a11y.screen_reader_announcements}
                onChange={(e) => handleSave({ screen_reader_announcements: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-sentinel-600 focus:ring-sentinel-500"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Screen Reader Announcements</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Announce dynamic content changes to screen readers
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Status Update Interval: <span className="font-mono">{a11y.status_update_interval_ms}ms</span>
            </label>
            <Select
              value={a11y.status_update_interval_ms}
              onChange={(e) => handleSave({ status_update_interval_ms: Number(e.target.value) })}
              aria-label="Status update interval"
            >
              <Option value={100}>100ms (Fast)</Option>
              <Option value={250}>250ms</Option>
              <Option value={500}>500ms (Default)</Option>
              <Option value={1000}>1s (Slow)</Option>
              <Option value={2000}>2s (Very Slow)</Option>
            </Select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              How frequently status indicators update (lower = more responsive, higher = less CPU)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Terminal accessibility info */}
      <Card variant="outlined">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" aria-hidden="true" />
            Terminal Accessibility
          </CardTitle>
          <CardDescription>Features for terminal-based workflows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <MousePointer className="h-4 w-4" aria-hidden="true" />
                In-Place Status Updates
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Status indicators update in-place using terminal control sequences, preventing screen flickering and full buffer redraws.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Eye className="h-4 w-4" aria-hidden="true" />
                Screen Reader Compatible
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Live region announcements for status changes, compatible with NVDA, JAWS, VoiceOver, and Orca.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Palette className="h-4 w-4" aria-hidden="true" />
                High Contrast Mode
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Optional high contrast color scheme for terminal output, meeting WCAG AAA contrast requirements.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Type className="h-4 w-4" aria-hidden="true" />
                Configurable Update Rate
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Adjust status update frequency from 100ms to 2s to balance responsiveness with CPU usage.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {saved && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <Check className="h-5 w-5" aria-hidden="true" />
          <span>Settings saved</span>
        </div>
      )}
    </div>
  )
}

function clsx(...args: (string | undefined | false)[]) {
  return args.filter(Boolean).join(' ')
}