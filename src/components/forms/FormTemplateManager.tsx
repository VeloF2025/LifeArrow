import React, { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Download,
  Upload,
  Search,
  Filter,
  MoreVertical,
  FileText,
  Calendar,
  User,
  Settings,
  UserPlus,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { FormBuilder, FormTemplate } from './FormBuilder'
import { FormRenderer } from './FormRenderer'
import { ImportWizard } from './ImportWizard'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatSADate } from '../../lib/utils'

interface OnboardingSettings {
  template_id: string | null
  enabled: boolean
}

export function FormTemplateManager() {
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<FormTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null)
  const [onboardingSettings, setOnboardingSettings] = useState<OnboardingSettings>({ template_id: null, enabled: false })
  const [showOnboardingSettings, setShowOnboardingSettings] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const { profile } = useAuth()
  
  // Create a ref for the file input
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchTemplates()
    fetchOnboardingSettings()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchTerm])

  // Clear messages after 5 seconds
  useEffect(() => {
    if (importError || importSuccess) {
      const timer = setTimeout(() => {
        setImportError(null)
        setImportSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [importError, importSuccess])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOnboardingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'onboarding_form_template')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setOnboardingSettings(data.value as OnboardingSettings)
      }
    } catch (error) {
      console.error('Error fetching onboarding settings:', error)
    }
  }

  const updateOnboardingSettings = async (settings: OnboardingSettings) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'onboarding_form_template',
          value: settings,
          description: 'Form template to use for new customer onboarding'
        })

      if (error) throw error
      
      setOnboardingSettings(settings)
      setShowOnboardingSettings(false)
      setImportSuccess('Onboarding form settings updated successfully!')
    } catch (error) {
      console.error('Error updating onboarding settings:', error)
      setImportError('Error updating onboarding settings. Please try again.')
    }
  }

  const filterTemplates = () => {
    let filtered = templates

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredTemplates(filtered)
  }

  const saveTemplate = async (template: FormTemplate) => {
    try {
      const templateData = {
        id: template.id,
        name: template.name,
        description: template.description,
        fields: template.fields,
        settings: template.settings,
        created_by: profile?.id,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('form_templates')
        .upsert(templateData)

      if (error) throw error

      await fetchTemplates()
      setShowBuilder(false)
      setShowImportWizard(false)
      setEditingTemplate(null)
      setImportSuccess('Form template saved successfully!')
    } catch (error) {
      console.error('Error saving template:', error)
      setImportError('Error saving template. Please try again.')
    }
  }

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this form template?')) return

    // Check if this template is being used for onboarding
    if (onboardingSettings.template_id === templateId) {
      if (!confirm('This template is currently set as the onboarding form. Deleting it will disable onboarding forms. Continue?')) {
        return
      }
      // Update onboarding settings to disable
      await updateOnboardingSettings({ template_id: null, enabled: false })
    }

    try {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      await fetchTemplates()
      setImportSuccess('Form template deleted successfully!')
    } catch (error) {
      console.error('Error deleting template:', error)
      setImportError('Error deleting template. Please try again.')
    }
  }

  const duplicateTemplate = async (template: FormTemplate) => {
    const duplicatedTemplate: FormTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${template.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await saveTemplate(duplicatedTemplate)
  }

  const exportTemplate = (template: FormTemplate) => {
    try {
      const dataStr = JSON.stringify(template, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${template.name.replace(/\s+/g, '_')}_template.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setImportSuccess('Form template exported successfully!')
    } catch (error) {
      console.error('Error exporting template:', error)
      setImportError('Error exporting template. Please try again.')
    }
  }

  const handleImportClick = () => {
    setShowImportWizard(true)
  }

  const handleImportComplete = (template: FormTemplate) => {
    saveTemplate(template)
  }

  const setAsOnboardingForm = async (templateId: string) => {
    await updateOnboardingSettings({
      template_id: templateId,
      enabled: true
    })
  }

  if (showImportWizard) {
    return (
      <ImportWizard
        onImportComplete={handleImportComplete}
        onCancel={() => setShowImportWizard(false)}
      />
    )
  }

  if (showBuilder) {
    return (
      <FormBuilder
        template={editingTemplate || undefined}
        onSave={saveTemplate}
        onCancel={() => {
          setShowBuilder(false)
          setEditingTemplate(null)
        }}
      />
    )
  }

  if (showPreview && selectedTemplate) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{selectedTemplate.name}</h2>
            <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setShowPreview(false)
              setSelectedTemplate(null)
            }}
          >
            Back to Templates
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FormRenderer
            template={selectedTemplate}
            onSubmit={(data) => {
              console.log('Form submitted:', data)
              setImportSuccess('Form submitted successfully!')
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Form Templates</h1>
          <p className="text-gray-600 mt-1">Create and manage form templates</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            icon={Settings}
            onClick={() => setShowOnboardingSettings(true)}
          >
            Onboarding Settings
          </Button>
          
          <Button
            variant="outline"
            icon={Upload}
            onClick={handleImportClick}
          >
            Import from File
          </Button>
          
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setShowBuilder(true)}
          >
            Create New Form
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {importError && (
        <Card variant="minimal" className="border-red-200 bg-red-50">
          <CardContent>
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Import Error</h3>
                <p className="text-sm text-red-700 mt-1">{importError}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportError(null)}
                className="ml-auto text-red-600 hover:text-red-700"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {importSuccess && (
        <Card variant="minimal" className="border-green-200 bg-green-50">
          <CardContent>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <p className="text-sm text-green-700 mt-1">{importSuccess}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportSuccess(null)}
                className="ml-auto text-green-600 hover:text-green-700"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Status Banner */}
      {onboardingSettings.enabled && onboardingSettings.template_id && (
        <Card variant="sage">
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-wellness-sage-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-wellness-sage-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Onboarding Form Active</h3>
                  <p className="text-sm text-gray-600">
                    New customers will complete "{templates.find(t => t.id === onboardingSettings.template_id)?.name}" during registration
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={Settings}
                onClick={() => setShowOnboardingSettings(true)}
              >
                Manage
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Settings Modal */}
      {showOnboardingSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader
              title="Onboarding Form Settings"
              description="Configure which form new customers must complete during registration"
            />
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={onboardingSettings.enabled}
                      onChange={(e) => setOnboardingSettings({
                        ...onboardingSettings,
                        enabled: e.target.checked
                      })}
                      className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable onboarding form for new customers
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    When enabled, new customers will be required to complete the selected form during registration
                  </p>
                </div>

                {onboardingSettings.enabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Onboarding Form Template
                    </label>
                    <select
                      value={onboardingSettings.template_id || ''}
                      onChange={(e) => setOnboardingSettings({
                        ...onboardingSettings,
                        template_id: e.target.value || null
                      })}
                      className="wellness-input"
                    >
                      <option value="">Select a form template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.fields.length} fields)
                        </option>
                      ))}
                    </select>
                    {onboardingSettings.enabled && !onboardingSettings.template_id && (
                      <p className="text-sm text-red-600 mt-1">
                        Please select a form template to enable onboarding forms
                      </p>
                    )}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">How it works:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• New customers will see the selected form after registration</li>
                    <li>• Form completion is required before accessing the dashboard</li>
                    <li>• Submitted data is stored in the client onboarding records</li>
                    <li>• You can view and manage submissions in the Client Management section</li>
                  </ul>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowOnboardingSettings(false)
                      fetchOnboardingSettings() // Reset to original values
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => updateOnboardingSettings(onboardingSettings)}
                    disabled={onboardingSettings.enabled && !onboardingSettings.template_id}
                  >
                    Save Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search templates..."
                icon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-wellness-sage-200 border-t-wellness-sage-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader
                title={
                  <div className="flex items-center justify-between">
                    <span>{template.name}</span>
                    {onboardingSettings.template_id === template.id && onboardingSettings.enabled && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-wellness-sage-100 text-wellness-sage-700">
                        <UserPlus className="w-3 h-3 mr-1" />
                        Onboarding
                      </span>
                    )}
                  </div>
                }
                description={template.description}
              />
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span className="flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      {template.fields.length} fields
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatSADate(template.updated_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Eye}
                      onClick={() => {
                        setSelectedTemplate(template)
                        setShowPreview(true)
                      }}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Edit}
                      onClick={() => {
                        setEditingTemplate(template)
                        setShowBuilder(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Copy}
                      onClick={() => duplicateTemplate(template)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Download}
                      onClick={() => exportTemplate(template)}
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    {onboardingSettings.template_id === template.id && onboardingSettings.enabled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={CheckCircle}
                        onClick={() => updateOnboardingSettings({ template_id: null, enabled: false })}
                        className="w-full text-wellness-sage-600"
                      >
                        Remove from Onboarding
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={UserPlus}
                        onClick={() => setAsOnboardingForm(template.id)}
                        className="w-full"
                      >
                        Set as Onboarding Form
                      </Button>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => deleteTemplate(template.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredTemplates.length === 0 && !loading && (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? 'Try adjusting your search criteria.'
                  : 'Get started by creating your first form template.'
                }
              </p>
              {!searchTerm && (
                <div className="flex items-center justify-center space-x-3">
                  <Button
                    variant="outline"
                    icon={Upload}
                    onClick={handleImportClick}
                  >
                    Import from File
                  </Button>
                  <Button
                    variant="primary"
                    icon={Plus}
                    onClick={() => setShowBuilder(true)}
                  >
                    Create Your First Form
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}