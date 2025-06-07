import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Heart, 
  Shield, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Zap,
  MapPin,
  Briefcase,
  FileText,
  Camera,
  Building,
  Save,
  Clock
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'
import { generateClientCode } from '../../lib/utils'
import { supabase } from '../../lib/supabase'

// Enhanced onboarding schema based on the provided form structure
const onboardingSchema = z.object({
  // Page 1: Contact Information
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  idNumber: z.string().length(13, 'ID number must be exactly 13 digits').regex(/^\d+$/, 'ID number must contain only digits'),
  gender: z.enum(['male', 'female']).optional(),
  email: z.string().email('Please enter a valid email address'),
  mobile: z.string().min(10, 'Please enter a valid mobile number'),
  address1: z.string().optional(),
  address2: z.string().optional(),
  suburb: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('South Africa'),
  preferredContact: z.enum(['email', 'whatsapp', 'phone']).optional(),
  
  // Page 2: Personal Information
  maritalStatus: z.string().optional(),
  maritalStatusOther: z.string().optional(),
  employmentStatus: z.string().optional(),
  employmentStatusOther: z.string().optional(),
  currentEmployer: z.string().optional(),
  occupation: z.string().optional(),
  academicInstitution: z.string().optional(),
  
  // Page 3: Health Questionnaire
  currentMedications: z.array(z.object({
    name: z.string(),
    dosage: z.string()
  })).optional(),
  chronicConditions: z.array(z.object({
    condition: z.string(),
    diagnosedBy: z.string()
  })).optional(),
  currentTreatments: z.array(z.object({
    treatment: z.string(),
    provider: z.string()
  })).optional(),
  previousProcedures: z.array(z.object({
    procedure: z.string(),
    date: z.string()
  })).optional(),
  medicalImplants: z.array(z.object({
    implant: z.string(),
    position: z.string()
  })).optional(),
  
  // Page 4: General Information
  transformationReasons: z.array(z.string()).optional(),
  transformationReasonsOther: z.string().optional(),
  hearAboutUs: z.string().optional(),
  hearAboutUsOther: z.string().optional(),
  contactImage: z.string().optional(),
  
  // Page 5: Terms & Conditions
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
  
  // Page 6: Treatment Centre
  treatmentCentre: z.string().min(1, 'Please select a treatment centre'),
})

type OnboardingFormData = z.infer<typeof onboardingSchema>

const steps = [
  {
    id: 1,
    title: 'Contact Information',
    description: 'Your personal contact details',
    icon: User,
  },
  {
    id: 2,
    title: 'Personal Information',
    description: 'Employment and personal status',
    icon: Briefcase,
  },
  {
    id: 3,
    title: 'Health Questionnaire',
    description: 'Medical history and current health status',
    icon: Heart,
  },
  {
    id: 4,
    title: 'General Information',
    description: 'Goals and how you found us',
    icon: FileText,
  },
  {
    id: 5,
    title: 'Terms & Conditions',
    description: 'Review and accept our terms',
    icon: CheckCircle,
  },
  {
    id: 6,
    title: 'Treatment Centre',
    description: 'Select your preferred location',
    icon: Building,
  },
]

const provinces = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 
  'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
]

const maritalStatusOptions = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'other', label: 'Other' },
]

const employmentStatusOptions = [
  { value: 'employed', label: 'Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'student', label: 'Student' },
  { value: 'retired', label: 'Retired' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'sabbatical', label: 'Sabbatical' },
  { value: 'other', label: 'Other' },
]

const transformationReasonOptions = [
  'Career & Education',
  'Financial Wellness',
  'Relationships & Social Connections',
  'Physical Health & Fitness',
  'Personal Development & Self-Improvement',
  'Sports and Recreation',
  'Other'
]

const hearAboutUsOptions = [
  { value: 'referral', label: 'Friend or Family Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'website', label: 'Website/Search Engine' },
  { value: 'advertisement', label: 'Advertisement (Online/Print)' },
  { value: 'event', label: 'Event or Workshop' },
  { value: 'healthcare', label: 'Healthcare Provider' },
  { value: 'other', label: 'Other' },
]

const treatmentCentres = [
  'Pretoria - LifePath Silverwoods'
]

interface OnboardingWizardProps {
  onComplete: (data: OnboardingFormData) => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingExistingData, setLoadingExistingData] = useState(true)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [existingOnboardingId, setExistingOnboardingId] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange',
    defaultValues: {
      country: 'South Africa',
      currentMedications: [],
      chronicConditions: [],
      currentTreatments: [],
      previousProcedures: [],
      medicalImplants: [],
      transformationReasons: [],
    }
  })

  const watchedValues = watch()

  // Load existing data on component mount
  useEffect(() => {
    if (user && profile) {
      loadExistingData()
    }
  }, [user, profile])

  // Auto-save functionality - save every 30 seconds when form data changes
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (user && !loadingExistingData && !isSubmitting && existingOnboardingId) {
        autoSaveProgress()
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [user, loadingExistingData, isSubmitting, watchedValues, existingOnboardingId])

  // Auto-save when moving between steps
  useEffect(() => {
    if (user && !loadingExistingData && currentStep > 1 && existingOnboardingId) {
      autoSaveProgress()
    }
  }, [currentStep])

  const loadExistingData = async () => {
    if (!user) return

    try {
      console.log('Loading existing onboarding data for user:', user.id)
      
      // Load existing onboarding data - get the most recent one
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('client_onboarding_data')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (onboardingError && onboardingError.code !== 'PGRST116') {
        throw onboardingError
      }

      const latestOnboarding = onboardingData && onboardingData.length > 0 ? onboardingData[0] : null

      if (latestOnboarding) {
        console.log('Found existing onboarding data:', latestOnboarding.id)
        setExistingOnboardingId(latestOnboarding.id)

        // If already completed, redirect to dashboard
        if (latestOnboarding.onboarding_completed) {
          console.log('Onboarding already completed, redirecting to dashboard')
          navigate('/dashboard')
          return
        }

        // Prepopulate form with existing data
        const existingData: Partial<OnboardingFormData> = {
          // From profile
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || '',
          mobile: profile.phone || '',
          
          // From onboarding data
          idNumber: latestOnboarding.id_number || '',
          gender: latestOnboarding.gender || undefined,
          address1: latestOnboarding.address_1 || '',
          address2: latestOnboarding.address_2 || '',
          suburb: latestOnboarding.suburb || '',
          city: latestOnboarding.city || '',
          province: latestOnboarding.province || '',
          postalCode: latestOnboarding.postal_code || '',
          country: latestOnboarding.country || 'South Africa',
          preferredContact: latestOnboarding.preferred_contact || undefined,
          
          maritalStatus: latestOnboarding.marital_status || '',
          maritalStatusOther: latestOnboarding.marital_status_other || '',
          employmentStatus: latestOnboarding.employment_status || '',
          employmentStatusOther: latestOnboarding.employment_status_other || '',
          currentEmployer: latestOnboarding.current_employer || '',
          occupation: latestOnboarding.occupation || '',
          academicInstitution: latestOnboarding.academic_institution || '',
          
          // Health data
          currentMedications: latestOnboarding.current_medications || [],
          chronicConditions: latestOnboarding.chronic_conditions || [],
          currentTreatments: latestOnboarding.current_treatments || [],
          previousProcedures: latestOnboarding.previous_procedures || [],
          medicalImplants: latestOnboarding.medical_implants || [],
          
          transformationReasons: latestOnboarding.transformation_reasons || [],
          transformationReasonsOther: latestOnboarding.transformation_reasons_other || '',
          hearAboutUs: latestOnboarding.hear_about_us || '',
          hearAboutUsOther: latestOnboarding.hear_about_us_other || '',
          contactImage: latestOnboarding.contact_image || '',
          
          treatmentCentre: latestOnboarding.treatment_centre || '',
          termsAccepted: latestOnboarding.terms_accepted || false,
        }

        // Set form values
        Object.entries(existingData).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            setValue(key as keyof OnboardingFormData, value)
          }
        })

        // Set last saved time
        if (latestOnboarding.last_saved_at) {
          setLastSaved(new Date(latestOnboarding.last_saved_at))
        }

        // Set current step from progress
        if (latestOnboarding.onboarding_progress?.current_step) {
          setCurrentStep(latestOnboarding.onboarding_progress.current_step)
        }

        console.log('Prepopulated form with existing data')
      } else {
        console.log('No existing onboarding data found, will create new record')
        // Prepopulate with profile data only
        setValue('firstName', profile.first_name || '')
        setValue('lastName', profile.last_name || '')
        setValue('email', profile.email || '')
        setValue('mobile', profile.phone || '')
      }

    } catch (error) {
      console.error('Error loading existing data:', error)
    } finally {
      setLoadingExistingData(false)
    }
  }

  const autoSaveProgress = async () => {
    if (!user || autoSaving) return

    setAutoSaving(true)
    try {
      const formData = getValues()
      
      // Save current progress to database
      const progressData = {
        client_id: user.id,
        
        // Contact Information - use null for empty strings on constrained fields
        id_number: formData.idNumber || null,
        gender: formData.gender || null,
        address_1: formData.address1 || null,
        address_2: formData.address2 || null,
        suburb: formData.suburb || null,
        city: formData.city || null,
        province: formData.province || null,
        postal_code: formData.postalCode || null,
        country: formData.country || 'South Africa',
        preferred_contact: formData.preferredContact || null,
        
        // Personal Information - use null for empty strings on constrained fields
        marital_status: formData.maritalStatus || null,
        marital_status_other: formData.maritalStatusOther || null,
        employment_status: formData.employmentStatus || null,
        employment_status_other: formData.employmentStatusOther || null,
        current_employer: formData.currentEmployer || null,
        occupation: formData.occupation || null,
        academic_institution: formData.academicInstitution || null,
        
        // Health Information
        current_medications: formData.currentMedications || [],
        chronic_conditions: formData.chronicConditions || [],
        current_treatments: formData.currentTreatments || [],
        previous_procedures: formData.previousProcedures || [],
        medical_implants: formData.medicalImplants || [],
        
        // General Information - use null for empty strings on constrained fields
        transformation_reasons: formData.transformationReasons || [],
        transformation_reasons_other: formData.transformationReasonsOther || null,
        hear_about_us: formData.hearAboutUs || null,
        hear_about_us_other: formData.hearAboutUsOther || null,
        contact_image: formData.contactImage || null,
        
        // Terms and Treatment Centre
        terms_accepted: formData.termsAccepted || false,
        treatment_centre: formData.treatmentCentre || null,
        
        // Progress tracking
        onboarding_completed: false, // Not completed until final submission
        onboarding_progress: {
          current_step: currentStep,
          completed_steps: Array.from({ length: currentStep - 1 }, (_, i) => i + 1),
          last_step_completed: currentStep - 1,
          form_data_snapshot: formData
        },
        
        // Legacy fields for compatibility
        medications: (formData.currentMedications || []).map((med: any) => `${med.name} (${med.dosage})`).join(', ') || null,
        allergies: null,
        previous_surgeries: (formData.previousProcedures || []).map((proc: any) => `${proc.procedure} (${proc.date})`).join(', ') || null,
        primary_goals: formData.transformationReasons || [],
        activity_level: 'not_specified',
        dietary_preferences: null,
        marketing_consent: false,
        
        // Update timestamps
        updated_at: new Date().toISOString(),
        last_saved_at: new Date().toISOString()
      }

      let error
      if (existingOnboardingId) {
        // Update existing record
        const result = await supabase
          .from('client_onboarding_data')
          .update(progressData)
          .eq('id', existingOnboardingId)
        error = result.error
      } else {
        // Create new record
        const result = await supabase
          .from('client_onboarding_data')
          .insert(progressData)
          .select('id')
          .single()
        
        error = result.error
        if (!error && result.data) {
          setExistingOnboardingId(result.data.id)
        }
      }

      if (error) {
        console.error('Auto-save error:', error)
      } else {
        setLastSaved(new Date())
        console.log('Auto-saved progress for step:', currentStep)
      }
    } catch (error) {
      console.error('Auto-save error:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await trigger(fieldsToValidate)
    
    if (isValid && currentStep < steps.length) {
      // Auto-save before moving to next step
      await autoSaveProgress()
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getFieldsForStep = (step: number): (keyof OnboardingFormData)[] => {
    switch (step) {
      case 1:
        return ['firstName', 'lastName', 'idNumber', 'email', 'mobile']
      case 2:
        return [] // Optional fields
      case 3:
        return [] // Optional fields
      case 4:
        return [] // Optional fields
      case 5:
        return ['termsAccepted']
      case 6:
        return ['treatmentCentre']
      default:
        return []
    }
  }

  const onSubmit = async (data: OnboardingFormData) => {
    console.log('Starting onboarding submission with data:', data)
    setIsSubmitting(true)
    
    try {
      // Validate required fields for final step
      if (!data.termsAccepted) {
        throw new Error('You must accept the terms and conditions')
      }
      
      if (!data.treatmentCentre) {
        throw new Error('Please select a treatment centre')
      }

      console.log('Validation passed, proceeding with submission')
      
      // Prepare the final data with completion status
      const finalData = {
        client_id: user?.id,
        
        // Contact Information
        id_number: data.idNumber || null,
        gender: data.gender || null,
        address_1: data.address1 || null,
        address_2: data.address2 || null,
        suburb: data.suburb || null,
        city: data.city || null,
        province: data.province || null,
        postal_code: data.postalCode || null,
        country: data.country || 'South Africa',
        preferred_contact: data.preferredContact || null,
        
        // Personal Information
        marital_status: data.maritalStatus || null,
        marital_status_other: data.maritalStatusOther || null,
        employment_status: data.employmentStatus || null,
        employment_status_other: data.employmentStatusOther || null,
        current_employer: data.currentEmployer || null,
        occupation: data.occupation || null,
        academic_institution: data.academicInstitution || null,
        
        // Health Information
        current_medications: data.currentMedications || [],
        chronic_conditions: data.chronicConditions || [],
        current_treatments: data.currentTreatments || [],
        previous_procedures: data.previousProcedures || [],
        medical_implants: data.medicalImplants || [],
        
        // General Information
        transformation_reasons: data.transformationReasons || [],
        transformation_reasons_other: data.transformationReasonsOther || null,
        hear_about_us: data.hearAboutUs || null,
        hear_about_us_other: data.hearAboutUsOther || null,
        contact_image: data.contactImage || null,
        
        // Terms and Treatment Centre
        terms_accepted: data.termsAccepted,
        treatment_centre: data.treatmentCentre,
        
        // CRITICAL: Mark as completed
        onboarding_completed: true,
        onboarding_progress: {
          current_step: steps.length,
          completed_steps: Array.from({ length: steps.length }, (_, i) => i + 1),
          last_step_completed: steps.length,
          completion_date: new Date().toISOString()
        },
        
        // Legacy fields for compatibility
        medications: (data.currentMedications || []).map((med: any) => `${med.name} (${med.dosage})`).join(', ') || null,
        allergies: null,
        previous_surgeries: (data.previousProcedures || []).map((proc: any) => `${proc.procedure} (${proc.date})`).join(', ') || null,
        primary_goals: data.transformationReasons || [],
        activity_level: 'not_specified',
        dietary_preferences: null,
        marketing_consent: false,
        
        // Update timestamps
        updated_at: new Date().toISOString(),
        last_saved_at: new Date().toISOString()
      }

      console.log('Saving final onboarding data with completion flag:', finalData)

      let saveError
      if (existingOnboardingId) {
        // Update existing record
        const result = await supabase
          .from('client_onboarding_data')
          .update(finalData)
          .eq('id', existingOnboardingId)
        saveError = result.error
      } else {
        // Create new record (shouldn't happen at this point, but just in case)
        const result = await supabase
          .from('client_onboarding_data')
          .insert(finalData)
        saveError = result.error
      }

      if (saveError) {
        console.error('Error saving final onboarding data:', saveError)
        throw saveError
      }

      console.log('Onboarding data saved successfully, calling completion handler')
      
      // Call the completion handler
      await onComplete(data)
      
    } catch (error) {
      console.error('Onboarding submission error:', error)
      alert(`There was an error completing your registration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArrayFieldChange = (
    fieldName: 'transformationReasons',
    value: string,
    checked: boolean
  ) => {
    const currentValues = watchedValues[fieldName] || []
    if (checked) {
      setValue(fieldName, [...currentValues, value])
    } else {
      setValue(fieldName, currentValues.filter(item => item !== value))
    }
  }

  const addSubformEntry = (fieldName: string) => {
    const currentValues = watchedValues[fieldName as keyof OnboardingFormData] as any[] || []
    const newEntry = getEmptySubformEntry(fieldName)
    setValue(fieldName as any, [...currentValues, newEntry])
  }

  const removeSubformEntry = (fieldName: string, index: number) => {
    const currentValues = watchedValues[fieldName as keyof OnboardingFormData] as any[] || []
    setValue(fieldName as any, currentValues.filter((_, i) => i !== index))
  }

  const getEmptySubformEntry = (fieldName: string) => {
    switch (fieldName) {
      case 'currentMedications':
        return { name: '', dosage: '' }
      case 'chronicConditions':
        return { condition: '', diagnosedBy: '' }
      case 'currentTreatments':
        return { treatment: '', provider: '' }
      case 'previousProcedures':
        return { procedure: '', date: '' }
      case 'medicalImplants':
        return { implant: '', position: '' }
      default:
        return {}
    }
  }

  const renderSubform = (
    title: string,
    fieldName: string,
    fields: { key: string; label: string; type?: string }[],
    maxEntries: number = 10
  ) => {
    const entries = watchedValues[fieldName as keyof OnboardingFormData] as any[] || []
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-medium text-gray-900">{title}</h5>
          {entries.length < maxEntries && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSubformEntry(fieldName)}
            >
              Add {title.split(' ')[0]}
            </Button>
          )}
        </div>
        
        {entries.map((entry, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {title.split(' ')[0]} {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSubformEntry(fieldName, index)}
                className="text-red-600 hover:text-red-700"
              >
                Remove
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  type={field.type || 'text'}
                  {...register(`${fieldName}.${index}.${field.key}` as any)}
                />
              ))}
            </div>
          </div>
        ))}
        
        {entries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No {title.toLowerCase()} added yet.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSubformEntry(fieldName)}
              className="mt-2"
            >
              Add {title.split(' ')[0]}
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name *"
                type="text"
                icon={User}
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label="Last Name *"
                type="text"
                icon={User}
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="South African ID Number *"
                type="text"
                placeholder="1234567890123"
                error={errors.idNumber?.message}
                {...register('idNumber')}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  className="wellness-input"
                  {...register('gender')}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email Address *"
                type="email"
                icon={Mail}
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Mobile Number *"
                type="tel"
                icon={Phone}
                placeholder="+27 XX XXX XXXX"
                error={errors.mobile?.message}
                {...register('mobile')}
              />
            </div>
            
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900 flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Address Information
              </h4>
              
              <Input
                label="Address Line 1"
                type="text"
                {...register('address1')}
              />
              
              <Input
                label="Address Line 2"
                type="text"
                {...register('address2')}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Suburb"
                  type="text"
                  {...register('suburb')}
                />
                <Input
                  label="City / Town"
                  type="text"
                  {...register('city')}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Province
                  </label>
                  <select
                    className="wellness-input"
                    {...register('province')}
                  >
                    <option value="">Select province</option>
                    {provinces.map((province) => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Postal Code"
                  type="text"
                  {...register('postalCode')}
                />
                <Input
                  label="Country"
                  type="text"
                  {...register('country')}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Method of Contact
              </label>
              <select
                className="wellness-input"
                {...register('preferredContact')}
              >
                <option value="">Select preferred contact method</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp/SMS</option>
                <option value="phone">Telephone Call</option>
              </select>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Briefcase className="w-12 h-12 text-wellness-sage-500 mx-auto mb-2" />
              <p className="text-gray-600">
                Tell us about your personal and professional background.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marital Status
                </label>
                <select
                  className="wellness-input"
                  {...register('maritalStatus')}
                >
                  <option value="">Select marital status</option>
                  {maritalStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
              {watchedValues.maritalStatus === 'other' && (
                <Input
                  label="Please specify"
                  type="text"
                  {...register('maritalStatusOther')}
                />
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Status
                </label>
                <select
                  className="wellness-input"
                  {...register('employmentStatus')}
                >
                  <option value="">Select employment status</option>
                  {employmentStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
              {watchedValues.employmentStatus === 'other' && (
                <Input
                  label="Please specify"
                  type="text"
                  {...register('employmentStatusOther')}
                />
              )}
            </div>
            
            <Input
              label="Current Employer/University/School"
              type="text"
              {...register('currentEmployer')}
            />
            
            <Input
              label="Occupation/School Grade"
              type="text"
              {...register('occupation')}
            />
            
            <Input
              label="Academic Institution"
              type="text"
              {...register('academicInstitution')}
            />
          </div>
        )

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <Heart className="w-12 h-12 text-wellness-rose-500 mx-auto mb-2" />
              <p className="text-gray-600">
                This information helps us provide you with the safest and most effective wellness program.
              </p>
            </div>
            
            {renderSubform(
              'Current Medication',
              'currentMedications',
              [
                { key: 'name', label: 'Name of Medicine' },
                { key: 'dosage', label: 'Dosage' }
              ],
              10
            )}
            
            {renderSubform(
              'Chronic Conditions',
              'chronicConditions',
              [
                { key: 'condition', label: 'Name of Condition' },
                { key: 'diagnosedBy', label: 'Diagnosed By' }
              ],
              10
            )}
            
            {renderSubform(
              'Current Treatments',
              'currentTreatments',
              [
                { key: 'treatment', label: 'Treatment' },
                { key: 'provider', label: 'Treating Provider' }
              ],
              5
            )}
            
            {renderSubform(
              'Previous Procedures',
              'previousProcedures',
              [
                { key: 'procedure', label: 'Procedures' },
                { key: 'date', label: 'Month-Year', type: 'month' }
              ],
              5
            )}
            
            {renderSubform(
              'Medical Implants',
              'medicalImplants',
              [
                { key: 'implant', label: 'Implant' },
                { key: 'position', label: 'Position in body' }
              ],
              5
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <FileText className="w-12 h-12 text-wellness-eucalyptus-500 mx-auto mb-2" />
              <p className="text-gray-600">
                Help us understand your goals and how you discovered LifePath.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Reason for Transformation (Select all that apply)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {transformationReasonOptions.map((reason) => (
                  <label key={reason} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                      checked={(watchedValues.transformationReasons || []).includes(reason)}
                      onChange={(e) => handleArrayFieldChange('transformationReasons', reason, e.target.checked)}
                    />
                    <span className="text-sm text-gray-700">{reason}</span>
                  </label>
                ))}
              </div>
              
              {(watchedValues.transformationReasons || []).includes('Other') && (
                <div className="mt-4">
                  <Input
                    label="Please specify other reason"
                    type="text"
                    {...register('transformationReasonsOther')}
                  />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Where did you hear about LifePath?
              </label>
              <select
                className="wellness-input"
                {...register('hearAboutUs')}
              >
                <option value="">Select how you heard about us</option>
                {hearAboutUsOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              
              {watchedValues.hearAboutUs === 'other' && (
                <div className="mt-4">
                  <Input
                    label="Please specify"
                    type="text"
                    {...register('hearAboutUsOther')}
                  />
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Please take or upload a photo of yourself or the person being treated
                </p>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  id="contact-image"
                  {...register('contactImage')}
                />
                <label
                  htmlFor="contact-image"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  Choose Photo
                </label>
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-600">
                Please review and accept our terms and conditions to continue.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms and Conditions</h3>
              
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <h4 className="font-semibold mb-2">Consent for Assessment, Scan & Treatments</h4>
                  <p>
                    I consent to receive wellness assessments, body composition scans, and wellness treatments 
                    as recommended by LifePath Wellness. I understand that these services are for wellness 
                    purposes and are not intended to diagnose, treat, cure, or prevent any disease.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Disclosure & Client Commitment Agreement</h4>
                  <p>
                    I agree to provide accurate and complete health information and understand that 
                    withholding relevant health information may affect the safety and effectiveness 
                    of the wellness services provided.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Cancellation Policy</h4>
                  <p>
                    Appointments must be cancelled at least 24 hours in advance. Late cancellations 
                    or no-shows may be subject to a cancellation fee.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibtml mb-2">Privacy Policy</h4>
                  <p>
                    Your personal information will be kept confidential and used only for providing 
                    wellness services and communicating with you about your wellness journey.
                  </p>
                </div>
              </div>
            </div>
            
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                className="mt-1 rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                {...register('termsAccepted')}
              />
              <div className="text-sm">
                <span className="font-medium text-gray-900">
                  I have read and accept the Terms and Conditions *
                </span>
                <p className="text-gray-600 mt-1">
                  By checking this box, I acknowledge that I have read, understood, and agree to be bound by these terms and conditions.
                </p>
              </div>
            </label>
            {errors.termsAccepted && (
              <p className="text-sm text-red-600">{errors.termsAccepted.message}</p>
            )}
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Building className="w-12 h-12 text-wellness-sage-500 mx-auto mb-2" />
              <p className="text-gray-600">
                Select your nearest treatment centre to complete your registration.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                My Nearest Treatment Centre *
              </label>
              <select
                className="wellness-input"
                {...register('treatmentCentre')}
              >
                <option value="">Select a treatment centre</option>
                {treatmentCentres.map((centre) => (
                  <option key={centre} value={centre}>{centre}</option>
                ))}
              </select>
              {errors.treatmentCentre && (
                <p className="text-sm text-red-600 mt-1">{errors.treatmentCentre.message}</p>
              )}
            </div>
            
            <div className="bg-wellness-sage-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• You'll receive a confirmation email with your client details</li>
                <li>• Our team will contact you within 24 hours to schedule your first appointment</li>
                <li>• You'll have access to your personal wellness portal</li>
                <li>• Your wellness journey with LifePath begins!</li>
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (loadingExistingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wellness-sage-50 via-white to-wellness-eucalyptus-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-wellness-sage-200 border-t-wellness-sage-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-sage-50 via-white to-wellness-eucalyptus-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-wellness-sage-500 to-wellness-eucalyptus-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to LifePath</h1>
          <p className="text-gray-600">Complete your wellness journey registration</p>
          
          {/* Auto-save indicator */}
          {(autoSaving || lastSaved) && (
            <div className="flex items-center justify-center space-x-2 mt-4 text-sm text-gray-600">
              {autoSaving ? (
                <>
                  <Save className="w-4 h-4 animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <ProgressBar 
            currentStep={currentStep} 
            totalSteps={steps.length}
            steps={steps}
          />
        </div>

        {/* Main Content */}
        <Card className="max-w-3xl mx-auto" padding="lg">
          <CardHeader
            title={steps[currentStep - 1]?.title}
            description={steps[currentStep - 1]?.description}
          />
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              {renderStepContent()}
              
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  icon={ArrowLeft}
                  iconPosition="left"
                >
                  Previous
                </Button>
                
                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={nextStep}
                    icon={ArrowRight}
                    iconPosition="right"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    icon={CheckCircle}
                    iconPosition="right"
                  >
                    Complete Registration
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}