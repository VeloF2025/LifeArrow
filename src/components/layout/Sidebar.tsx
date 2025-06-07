import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  Calendar, 
  FileText, 
  Settings,
  Heart,
  Zap,
  TrendingUp,
  Shield,
  User
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'

const adminNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Scan Data', href: '/scans', icon: Activity },
  { name: 'Bookings', href: '/bookings', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const staffNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Scan Data', href: '/scans', icon: Activity },
  { name: 'Bookings', href: '/bookings', icon: Calendar },
  { name: 'Reports', href: '/reports', icon: FileText },
]

const clientNavItems = [
  { name: 'My Wellness', href: '/dashboard', icon: Heart },
  { name: 'My Profile', href: '/profile', icon: User },
  { name: 'Wellness Passport', href: '/passport', icon: Shield, requiresOnboarding: true },
  { name: 'My Scans', href: '/scans', icon: Activity, requiresOnboarding: true },
  { name: 'Appointments', href: '/bookings', icon: Calendar, requiresOnboarding: true },
  { name: 'Progress', href: '/progress', icon: TrendingUp, requiresOnboarding: true },
]

export function Sidebar() {
  const { profile, user } = useAuth()
  const location = useLocation()
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)

  useEffect(() => {
    if (profile?.role === 'client' && user) {
      checkOnboardingStatus()
    } else if (profile?.role !== 'client') {
      // For non-client users, onboarding is not required
      setOnboardingCompleted(true)
    }
  }, [profile, user])

  const checkOnboardingStatus = async () => {
    if (!user) return

    try {
      console.log('Checking onboarding status for user:', user.id)
      
      const { data, error } = await supabase
        .from('client_onboarding_data')
        .select('onboarding_completed, onboarding_progress, last_saved_at')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding status:', error)
        setOnboardingCompleted(false)
        return
      }

      const latestOnboarding = data && data.length > 0 ? data[0] : null
      const isCompleted = latestOnboarding?.onboarding_completed === true
      
      console.log('Onboarding status check result:', { 
        latestOnboarding, 
        isCompleted,
        onboarding_completed: latestOnboarding?.onboarding_completed 
      })
      
      setOnboardingCompleted(isCompleted)
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      setOnboardingCompleted(false)
    }
  }

  const getNavItems = () => {
    switch (profile?.role) {
      case 'admin':
        return adminNavItems
      case 'staff':
        return staffNavItems
      case 'client':
        return clientNavItems
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 lg:block hidden">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center px-6 py-8 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-wellness-sage-500 to-wellness-eucalyptus-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">LifePath</h1>
              <p className="text-xs text-gray-500">Wellness Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            const isDisabled = item.requiresOnboarding && profile?.role === 'client' && onboardingCompleted === false
            
            if (isDisabled) {
              return (
                <div
                  key={item.name}
                  className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-400 cursor-not-allowed relative group"
                >
                  <item.icon className="w-5 h-5 mr-3 opacity-50" />
                  <span className="opacity-50">{item.name}</span>
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    Complete your profile setup first
                  </div>
                </div>
              )
            }

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-wellness-sage-100 text-wellness-sage-700 border-r-2 border-wellness-sage-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            )
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-wellness-sage-50">
            <div className="w-8 h-8 bg-wellness-sage-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-wellness-sage-700">
                {profile?.first_name?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {profile?.role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}