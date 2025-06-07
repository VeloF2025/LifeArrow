import React, { useState } from 'react'
import { 
  Settings as SettingsIcon, 
  FormInput, 
  Users, 
  Shield, 
  Bell, 
  Palette,
  Database,
  Mail,
  Globe,
  CreditCard
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { FormTemplateManager } from '../components/forms/FormTemplateManager'

type SettingsTab = 'forms' | 'users' | 'security' | 'notifications' | 'appearance' | 'integrations' | 'billing'

const settingsTabs = [
  { id: 'forms' as SettingsTab, name: 'Form Templates', icon: FormInput, description: 'Create and manage form templates' },
  { id: 'users' as SettingsTab, name: 'User Management', icon: Users, description: 'Manage user accounts and permissions' },
  { id: 'security' as SettingsTab, name: 'Security', icon: Shield, description: 'Security settings and access control' },
  { id: 'notifications' as SettingsTab, name: 'Notifications', icon: Bell, description: 'Email and system notifications' },
  { id: 'appearance' as SettingsTab, name: 'Appearance', icon: Palette, description: 'Customize the look and feel' },
  { id: 'integrations' as SettingsTab, name: 'Integrations', icon: Database, description: 'Third-party integrations' },
  { id: 'billing' as SettingsTab, name: 'Billing', icon: CreditCard, description: 'Subscription and billing settings' },
]

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('forms')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'forms':
        return <FormTemplateManager />
      
      case 'users':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">User Management</h2>
              <p className="text-gray-600">Manage user accounts, roles, and permissions.</p>
            </div>
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
                  <p className="text-gray-600">Coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Settings</h2>
              <p className="text-gray-600">Configure security policies and access controls.</p>
            </div>
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Security Settings</h3>
                  <p className="text-gray-600">Coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h2>
              <p className="text-gray-600">Configure email and system notifications.</p>
            </div>
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Notification Settings</h3>
                  <p className="text-gray-600">Coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Appearance Settings</h2>
              <p className="text-gray-600">Customize the look and feel of your wellness portal.</p>
            </div>
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Appearance Settings</h3>
                  <p className="text-gray-600">Coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      case 'integrations':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h2>
              <p className="text-gray-600">Connect with third-party services and APIs.</p>
            </div>
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Integrations</h3>
                  <p className="text-gray-600">Coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      
      case 'billing':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Billing & Subscription</h2>
              <p className="text-gray-600">Manage your subscription and billing information.</p>
            </div>
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Billing & Subscription</h3>
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Settings Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-wellness-sage-100 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-wellness-sage-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-600">Manage your wellness portal</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          {settingsTabs.map((tab) => (
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