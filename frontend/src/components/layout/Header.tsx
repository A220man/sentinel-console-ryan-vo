import { Sun, Moon, Monitor, Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useTheme } from '../../hooks/useTheme'
import { Button } from '../ui'

interface HeaderProps {
  onMenuClick: () => void
  user?: {
    name: string
    email: string
    avatar?: string
  }
  onLogout?: () => void
}

export function Header({ onMenuClick, user, onLogout }: HeaderProps) {
  const { theme, resolvedTheme, toggleTheme, setThemeMode } = useTheme()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left: Menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
          aria-label="Open menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Center: Title (mobile only) */}
        <div className="lg:hidden flex-1 text-center">
          <h1 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Sentinel Console</h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label={`Current theme: ${theme}. Click to cycle.`}
              title={`Current theme: ${theme}. Click to cycle.`}
            >
              {resolvedTheme === 'dark' ? (
                <Moon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Sun className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>

            {/* Theme dropdown */}
            <div
              className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50"
              role="menu"
            >
              <button
                onClick={() => setThemeMode('light')}
                className={clsx(
                  'w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                  theme === 'light' ? 'bg-sentinel-50 text-sentinel-700 dark:bg-sentinel-900/30 dark:text-sentinel-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
                role="menuitem"
              >
                <Monitor className="h-4 w-4" aria-hidden="true" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setThemeMode('dark')}
                className={clsx(
                  'w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                  theme === 'dark' ? 'bg-sentinel-50 text-sentinel-700 dark:bg-sentinel-900/30 dark:text-sentinel-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
                role="menuitem"
              >
                <Moon className="h-4 w-4" aria-hidden="true" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => setThemeMode('system')}
                className={clsx(
                  'w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                  theme === 'system' ? 'bg-sentinel-50 text-sentinel-700 dark:bg-sentinel-900/30 dark:text-sentinel-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
                role="menuitem"
              >
                <Monitor className="h-4 w-4" aria-hidden="true" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
            </Button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Notifications</h3>
                </div>
                <div className="py-2">
                  <p className="px-4 text-sm text-gray-500 dark:text-gray-400 text-center">No notifications</p>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          {user && (
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="User menu"
                aria-expanded={userMenuOpen}
                className="gap-2"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-sentinel-100 dark:bg-sentinel-900 flex items-center justify-center">
                    <User className="h-5 w-5 text-sentinel-600 dark:text-sentinel-400" aria-hidden="true" />
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.name}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </Button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}