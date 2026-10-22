import { useState } from 'react'
import { Plus, User, Key, Server, Save, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui'
import { Button } from '../components/ui'
import { Input } from '../components/ui'
import { Select, Option } from '../components/ui'
import { Badge } from '../components/ui'
import { Modal } from '../components/ui'
import { useCurrentProfile, useSwitchProfile, useCreateProfile, useUpdateProfile } from '../hooks/useApi'
import type { AccountProfile } from '../types'
import { clsx } from 'clsx'

const ACCOUNT_TYPES = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'github', label: 'GitHub' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'custom', label: 'Custom' },
]

export function Profiles() {
  const { data: profileData, loading, error, refetch } = useCurrentProfile()
  const { switchProfile, loading: switchLoading } = useSwitchProfile()
  const { create, loading: createLoading } = useCreateProfile()
  const { update, loading: updateLoading } = useUpdateProfile()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<AccountProfile | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    account_type: 'anthropic',
    account_id: '',
    display_name: '',
    mcp_config: '{}',
    is_active: true,
  })

  const user = profileData?.user
  const profiles = profileData?.profiles || []
  const activeProfile = profileData?.active_profile
  const accessibility = profileData?.accessibility

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await create({
        name: formData.name,
        account_type: formData.account_type,
        account_id: formData.account_id,
        display_name: formData.display_name || undefined,
        mcp_config: JSON.parse(formData.mcp_config || '{}'),
        is_active: formData.is_active,
      })
      setCreateModalOpen(false)
      setFormData({ name: '', account_type: 'anthropic', account_id: '', display_name: '', mcp_config: '{}', is_active: true })
      refetch()
    } catch (err) {
      console.error('Failed to create profile:', err)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProfile) return
    try {
      await update(editingProfile.id, {
        name: formData.name,
        display_name: formData.display_name || undefined,
        mcp_config: JSON.parse(formData.mcp_config || '{}'),
        is_active: formData.is_active,
      })
      setEditModalOpen(false)
      setEditingProfile(null)
      refetch()
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }

  const openEditModal = (profile: AccountProfile) => {
    setEditingProfile(profile)
    setFormData({
      name: profile.name,
      account_type: profile.account_type,
      account_id: profile.account_id,
      display_name: profile.display_name || '',
      mcp_config: profile.mcp_config || '{}',
      is_active: profile.is_active,
    })
    setEditModalOpen(true)
  }

  const handleSwitch = async (profileId: number) => {
    try {
      await switchProfile(profileId)
      refetch()
    } catch (err) {
      console.error('Failed to switch profile:', err)
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
        <p>Error loading profiles: {error}</p>
        <Button variant="outline" onClick={refetch} className="mt-2">Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profiles</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage multiple AI provider accounts and configurations
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Profile
        </Button>
      </div>

      {/* Current user info */}
      {user && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-sentinel-100 dark:bg-sentinel-900 flex items-center justify-center">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-16 w-16 rounded-full" />
                ) : (
                  <User className="h-8 w-8 text-sentinel-600 dark:text-sentinel-400" aria-hidden="true" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{user.name}</h2>
                <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {activeProfile ? `Active: ${activeProfile.display_name || activeProfile.name} (${activeProfile.account_type})` : 'No active profile'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profiles list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" aria-hidden="true" />
            Configured Profiles
          </CardTitle>
          <CardDescription>Each profile maintains separate credentials and MCP server configurations</CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No profiles configured yet.</p>
              <p className="text-sm mt-1">Click "Add Profile" to create your first account profile.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile) => {
                const isActive = activeProfile?.id === profile.id
                return (
                  <div
                    key={profile.id}
                    className={clsx(
                      'p-4 rounded-lg border transition-colors',
                      isActive
                        ? 'border-sentinel-300 bg-sentinel-50 dark:border-sentinel-800 dark:bg-sentinel-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={clsx(
                          'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
                          profile.account_type === 'anthropic' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                          profile.account_type === 'github' && 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                          profile.account_type === 'openai' && 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                          profile.account_type === 'custom' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                        )}>
                          {profile.account_type === 'anthropic' && <span className="text-xl font-bold">𝔠</span>}
                          {profile.account_type === 'github' && <span className="text-xl">⌘</span>}
                          {profile.account_type === 'openai' && <span className="text-xl font-bold">O</span>}
                          {profile.account_type === 'custom' && <Key className="h-6 w-6" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {profile.display_name || profile.name}
                            </h3>
                            {isActive && (
                              <Badge variant="success" className="gap-1">
                                <CheckCircle className="h-3 w-3" aria-hidden="true" />
                                Active
                              </Badge>
                            )}
                            {!profile.is_active && (
                              <Badge variant="outline">
                                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                                Inactive
                              </Badge>
                            )}
                            {profile.is_default && (
                              <Badge variant="info">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {profile.account_type} • {profile.account_id}
                          </p>
                          {profile.mcp_config && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                              MCP: {profile.mcp_config}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isActive && profile.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSwitch(profile.id)}
                            loading={switchLoading}
                            className="gap-1"
                          >
                            <User className="h-3 w-3" aria-hidden="true" />
                            Switch
                          </Button>
                        )}
                        {isActive && (
                          <Badge variant="success">Current</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(profile)}
                          aria-label={`Edit profile ${profile.name}`}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accessibility settings */}
      {accessibility && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" aria-hidden="true" />
              Accessibility Settings
            </CardTitle>
            <CardDescription>Customize the interface for your needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  id="reduced-motion"
                  checked={accessibility.reduced_motion}
                  onChange={(e) => console.log('reduced-motion', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-sentinel-600 focus:ring-sentinel-500"
                />
                <label htmlFor="reduced-motion" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Reduced Motion
                </label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  id="high-contrast"
                  checked={accessibility.high_contrast}
                  onChange={(e) => console.log('high-contrast', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-sentinel-600 focus:ring-sentinel-500"
                />
                <label htmlFor="high-contrast" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  High Contrast
                </label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  id="screen-reader"
                  checked={accessibility.screen_reader_announcements}
                  onChange={(e) => console.log('screen-reader', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-sentinel-600 focus:ring-sentinel-500"
                />
                <label htmlFor="screen-reader" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Screen Reader Announcements
                </label>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <label htmlFor="theme" className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24">Theme</label>
                <select
                  id="theme"
                  value={accessibility.theme}
                  onChange={(e) => console.log('theme', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sentinel-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <label htmlFor="font-size" className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24">Font Size</label>
                <input
                  type="range"
                  id="font-size"
                  min="12"
                  max="24"
                  value={accessibility.font_size}
                  onChange={(e) => console.log('font-size', e.target.value)}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sentinel-600"
                />
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400 w-10 text-right">
                  {accessibility.font_size}px
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}