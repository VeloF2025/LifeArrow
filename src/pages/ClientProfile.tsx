import React, { useState, useEffect } from 'react'
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ProfileEditor } from '../components/client/ProfileEditor'
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

type ProfileTab = 'overview' | 'edit' | 'onboarding' | 'notifications' | 'privacy' | 'preferences'

const profileTabs = [
  { id: 'overview' as ProfileTab, name: 'Profile Overview', icon: User, description: 'View your profile information' },
  { id: 'edit' as ProfileTab, name: 'Edit Profile', icon: Edit, description: 'Update your personal information' },
  { id: 'onboarding' as ProfileTab, name: 'Profile Setup', icon: FileText, description: 'Complete your onboarding information' },
  { id: 'notifications' as ProfileTab, name: 'Notifications', icon: Bell, description: 'Manage your notification preferences' },
  { id: 'privacy' as ProfileTab, name: 'Privacy', icon: Shield, description: 'Control your privacy settings' },
  { id: 'preferences' as ProfileTab, name: 'Preferences', icon: Settings, description: 'Customize your experience' },
]

export function ClientProfile() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')
  const [onboardingStatus, setOnboardingStatus] = useState<{
    completed: boolean
    lastSaved?: string
    progress?: any
  } | null>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user, profile } = useAuth()

  useEffect(() => {
    loadProfileData()
  }, [user])

  const loadProfileData = async () => {
    if (!user) return

    try {
      // Load all profile-related data
      const [onboardingResponse, clientResponse] = await Promise.all([
        supabase
          .from('client_onboarding_data')
          .select('*')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('clients')
          .select('*')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
      ])

      const onboardingData = onboardingResponse.data && onboardingResponse.data.length > 0 ? onboardingResponse.data[0] : null
      const clientData = clientResponse.data && clientResponse.data.length > 0 ? clientResponse.data[0] : null

      setOnboardingStatus({
        completed: onboardingData?.onboarding_completed || false,
        lastSaved: onboardingData?.last_saved_at,
        progress: onboardingData?.onboarding_progress
      })

      setProfileData({
        onboarding: onboardingData,
        client: clientData
      })

      // If onboarding is not completed, default to onboarding tab
      if (!onboardingData?.onboarding_completed) {
        setActiveTab('onboarding')
      }
    } catch (error) {
      console.error('Error loading profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOnboardingComplete = () => {
    setOnboardingStatus(prev => prev ? { ...prev, completed: true } : { completed: true })
    setActiveTab('overview')
    loadProfileData() // Refresh data
  }

  const renderOverview = () => {
    if (!onboardingStatus?.completed) {
      return (
        <div className="space-y-6">
          <Card variant="minimal\" className="border-amber-200 bg-amber-50">
            <CardContent>
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-900">Complete Your Profile Setup</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Please complete your onboarding information to access all features and get the most out of your LifePath experience.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => setActiveTab('onboarding')}
                  >
                    Complete Setup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Profile Summary */}
        <Card variant="sage">
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-wellness-sage-200 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-wellness-sage-700">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">
                  {profile?.first_name} {profile?.last_name}
                </h2>
                <p className="text-gray-600">{profile?.email}</p>
                <div className="flex items-center mt-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-700">Profile Complete</span>
                </div>
              </div>
              <Button
                variant="outline"
                icon={Edit}
                onClick={() => setActiveTab('edit')}
              >
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader
              title="Contact Information"
              description="Your primary contact details"
            />
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{profile?.email || 'Not provided'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{profile?.phone || 'Not provided'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Location"
              description="Your address information"
            />
            <CardContent>
              <div className="space-y-2 text-sm">
                {profileData?.onboarding?.city && profileData?.onboarding?.province ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{profileData.onboarding.city}, {profileData.onboarding.province}</span>
                    </div>
                    <p className="text-gray-600 ml-6">{profileData.onboarding.country || 'South Africa'}</p>
                  </>
                ) : (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Not provided</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Treatment Centre"
              description="Your preferred location"
            />
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{profileData?.onboarding?.treatment_centre || 'Not selected'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Completion Status */}
        <Card>
          <CardHeader
            title="Profile Status"
            description="Your profile completion and recent activity"
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Completion Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Personal Information</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Contact Details</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Health Information</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Preferences</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  {onboardingStatus?.lastSaved ? (
                    <p>Profile last updated: {new Date(onboardingStatus.lastSaved).toLocaleDateString()}</p>
                  ) : (
                    <p>Profile completed during registration</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      
      case 'edit':
        return <ProfileEditor />
      
      case 'onboarding':
        if (onboardingStatus?.completed) {
          return (
            <div className="space-y-6">
              <Card variant="sage">
                <CardContent>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Profile Setup Complete</h3>
                      <p className="text-gray-600">Your onboarding information has been completed successfully.</p>
                      {onboardingStatus.lastSaved && (
                        <p className="text-sm text-gray-500 mt-1">
                          Last updated: {new Date(onboardingStatus.lastSaved).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader
                  title="Update Your Information"
                  description="Need to make changes to your profile? You can edit your information anytime."
                />
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        Update your personal details, contact information, health data, and preferences.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      icon={Edit}
                      onClick={() => setActiveTab('edit')}
                    >
                      Edit Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        }

        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Complete Your Profile Setup</h3>
                  <p className="text-sm text-blue-800 mt-1">
                    Please complete your onboarding information to get the most out of your LifePath experience.
                    {onboardingStatus?.lastSaved && (
                      <span className="block mt-1">
                        Last saved: {new Date(onboardingStatus.lastSaved).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <OnboardingWizard onComplete={handleOnboardingComplete} />
          </div>
        )
      
      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h2>
              <p className="text-gray-600">Choose how you'd like to be notified about your wellness journey.</p>
            </div>
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Notification Preferences</h3>
                  <p className="text-gray-600">Coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy Settings</h2>
              <p className="text-gray-600">Control how your information is used and shared.</p>
            </div>
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Privacy Controls</h3>
                  <p className="text-gray-600">Coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      case 'preferences':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Preferences</h2>
              <p className="text-gray-600">Customize your LifePath experience.</p>
            </div>
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Personal Preferences</h3>
                  <p className="text-gray-600">Coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-wellness-sage-200 border-t-wellness-sage-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Profile Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-wellness-sage-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-wellness-sage-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">My Profile</h1>
              <p className="text-sm text-gray-600">Manage your wellness profile</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {profileTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-start p-3 rounded-lg text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-wellness-sage-100 text-wellness-sage-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">{tab.name}</div>
                <div className="text-xs text-gray-500 mt-1">{tab.description}</div>
                {tab.id === 'onboarding' && onboardingStatus && (
                  <div className="flex items-center mt-2">
                    {onboardingStatus.completed ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-600 mr-1" />
                        <span className="text-xs text-green-600">Complete</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-600 mr-1" />
                        <span className="text-xs text-amber-600">Incomplete</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}