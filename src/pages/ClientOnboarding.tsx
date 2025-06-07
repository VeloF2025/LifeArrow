import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard'
import { FormRenderer } from '../components/forms/FormRenderer'
import { FormTemplate } from '../components/forms/FormBuilder'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { generateClientCode } from '../lib/utils'

export function ClientOnboarding() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()
  const [onboardingForm, setOnboardingForm] = useState<FormTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [useCustomForm, setUseCustomForm] = useState(false)

  useEffect(() => {
    if (user) {
      checkOnboardingStatus()
    }
  }, [user])

  const checkOnboardingStatus = async () => {
    if (!user) return

    try {
      // Check if user has completed onboarding
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('client_onboarding_data')
        .select('onboarding_completed, onboarding_progress')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (onboardingError && onboardingError.code !== 'PGRST116') {
        throw onboardingError
      }

      const latestOnboardingData = onboardingData && onboardingData.length > 0 ? onboardingData[0] : null

      // If onboarding is completed, redirect to dashboard
      if (latestOnboardingData?.onboarding_completed) {
        console.log('Onboarding already completed, redirecting to dashboard')
        navigate('/dashboard')
        return
      }

      // Check if there's a custom onboarding form configured
      const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'onboarding_form_template')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError
      }

      const latestSettings = settings && settings.length > 0 ? settings[0] : null

      if (latestSettings?.value?.enabled && latestSettings?.value?.template_id) {
        // Fetch the configured form template
        const { data: template, error: templateError } = await supabase
          .from('form_templates')
          .select('*')
          .eq('id', latestSettings.value.template_id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (templateError && templateError.code !== 'PGRST116') {
          console.error('Error fetching onboarding form template:', templateError)
          // Fall back to default onboarding
        } else {
          const latestTemplate = template && template.length > 0 ? template[0] : null
          if (latestTemplate) {
            setOnboardingForm(latestTemplate)
            setUseCustomForm(true)
          }
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      // Fall back to default onboarding
    } finally {
      setLoading(false)
    }
  }

  const handleCustomFormSubmit = async (formData: any) => {
    try {
      console.log('Processing custom form submission:', formData)
      
      // Update the user's profile with basic information if available
      const profileUpdates: any = {}
      
      // Try to extract common fields from the form data
      Object.keys(formData).forEach(key => {
        const value = formData[key]
        if (typeof value === 'string' && value.trim()) {
          // Map common field patterns to profile fields
          if (key.toLowerCase().includes('firstname') || key.toLowerCase().includes('first_name')) {
            profileUpdates.first_name = value
          } else if (key.toLowerCase().includes('lastname') || key.toLowerCase().includes('last_name')) {
            profileUpdates.last_name = value
          } else if (key.toLowerCase().includes('email')) {
            profileUpdates.email = value
          } else if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
            profileUpdates.phone = value
          }
        }
      })

      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(profileUpdates)
      }

      // Create client record if it doesn't exist
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const latestClient = existingClient && existingClient.length > 0 ? existingClient[0] : null

      if (!latestClient) {
        const clientCode = generateClientCode()
        
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            profile_id: user?.id,
            client_code: clientCode,
            emergency_contact: JSON.stringify({
              name: `${profileUpdates.first_name || ''} ${profileUpdates.last_name || ''}`.trim() || 'Self',
              phone: profileUpdates.phone || '',
              relation: 'Self',
            }),
            medical_conditions: [],
          })

        if (clientError) {
          throw clientError
        }
      }

      // Store the custom form submission data with completion flag
      const onboardingData = {
        client_id: user?.id,
        
        // Store the custom form data in a structured way
        custom_form_data: formData,
        custom_form_template_id: onboardingForm?.id,
        onboarding_completed: true, // CRITICAL: Mark as completed
        
        // Set default values for required fields
        terms_accepted: true,
        country: 'South Africa',
        current_medications: [],
        chronic_conditions: [],
        current_treatments: [],
        previous_procedures: [],
        medical_implants: [],
        transformation_reasons: [],
        primary_goals: [],
        medications: '',
        allergies: '',
        previous_surgeries: '',
        activity_level: 'not_specified',
        dietary_preferences: '',
        marketing_consent: false,
        
        // Update timestamps
        updated_at: new Date().toISOString(),
        last_saved_at: new Date().toISOString()
      }

      console.log('Saving custom form data with completion flag:', { onboarding_completed: onboardingData.onboarding_completed })

      const { error: onboardingError } = await supabase
        .from('client_onboarding_data')
        .upsert(onboardingData)

      if (onboardingError) {
        console.error('Error saving custom form data:', onboardingError)
        throw onboardingError
      }

      console.log('Custom form onboarding completed successfully, redirecting to dashboard')
      
      // Redirect to dashboard
      navigate('/dashboard')
    } catch (error) {
      console.error('Error completing custom form onboarding:', error)
      alert('There was an error completing your registration. Please try again.')
    }
  }

  const handleDefaultOnboardingComplete = async (data: any) => {
    try {
      console.log('Processing default onboarding completion:', data)

      // Update the user's profile with basic information
      await updateProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.mobile,
        email: data.email,
      })

      // Create client record if it doesn't exist
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const latestClient = existingClient && existingClient.length > 0 ? existingClient[0] : null

      if (!latestClient) {
        const clientCode = generateClientCode()
        
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            profile_id: user?.id,
            client_code: clientCode,
            emergency_contact: JSON.stringify({
              name: `${data.firstName} ${data.lastName}`,
              phone: data.mobile,
              relation: 'Self',
            }),
            medical_conditions: [],
          })

        if (clientError) {
          throw clientError
        }
      }

      console.log('Default onboarding completed successfully, redirecting to dashboard')
      
      // Redirect to dashboard
      navigate('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      alert('There was an error completing your registration. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wellness-sage-50 via-white to-wellness-eucalyptus-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-wellness-sage-200 border-t-wellness-sage-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your onboarding form...</p>
        </div>
      </div>
    )
  }

  // If a custom form is configured, use FormRenderer
  if (useCustomForm && onboardingForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wellness-sage-50 via-white to-wellness-eucalyptus-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to LifePath</h1>
            <p className="text-gray-600">Please complete your onboarding information</p>
          </div>
          
          <FormRenderer
            template={onboardingForm}
            onSubmit={handleCustomFormSubmit}
          />
        </div>
      </div>
    )
  }

  // Fall back to the default onboarding wizard
  return <OnboardingWizard onComplete={handleDefaultOnboardingComplete} />
}