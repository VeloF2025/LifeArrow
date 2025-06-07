import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Heart, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  Shield,
  Zap,
  Clock,
  ArrowLeft,
  ArrowRight,
  Building
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ProgressBar } from '../ui/ProgressBar'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  idNumber: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  dateOfBirth: z.string().optional(),
  
  // Address
  address1: z.string().optional(),
  address2: z.string().optional(),
  suburb: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  preferredContact: z.enum(['email', 'whatsapp', 'phone']).optional(),
  
  // Personal Information
  maritalStatus: z.string().optional(),
  maritalStatusOther: z.string().optional(),
  employmentStatus: z.string().optional(),
  employmentStatusOther: z.string().optional(),
  currentEmployer: z.string().optional(),
  occupation: z.string().optional(),
  academicInstitution: z.string().optional(),
  
  // Emergency Contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  
  // Health Information (basic)
  medications: z.string().optional(),
  allergies: z.string().optional(),
  previousSurgeries: z.string().optional(),
  
  // Preferences
  treatmentCentre: z.string().optional(),
  marketingConsent: z.boolean().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

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

const treatmentCentres = [
  'Pretoria - LifePath Silverwoods'
]

const steps = [
  {
    id: 1,
    title: 'Personal Details',
    description: 'Basic personal information',
    icon: User,
  },
  {
    id: 2,
    title: 'Contact & Address',
    description: 'Contact details and location',
    icon: MapPin,
  },
  {
    id: 3,
    title: 'Employment & Status',
    description: 'Work and personal status',
    icon: Briefcase,
  },
  {
    id: 4,
    title: 'Emergency Contact',
    description: 'Emergency contact information',
    icon: Shield,
  },
  {
    id: 5,
    title: 'Health Information',
    description: 'Medical history and health data',
    icon: Heart,
  },
  {
    id: 6,
    title: 'Preferences',
    description: 'Treatment centre and preferences',
    icon: Building,
  },
]

export function ProfileEditor() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const { user, profile, updateProfile } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: {
      country: 'South Africa',
    }
  })

  const watchedValues = watch()

  useEffect(() => {
    if (user && profile) {
      loadProfileData()
    }
  }, [user, profile])

  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [saveMessage])

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (user && !loading && !saving) {
        autoSaveProgress()
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [user, loading, saving, watchedValues])

  // Check step completion when form data changes
  useEffect(() => {
    checkStepCompletion()
  }, [watchedValues])

  const loadProfileData = async () => {
    if (!user) return

    try {
      // Load existing profile and onboarding data
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

      const onboardingData = onboardingResponse.data?.[0]
      const clientData = clientResponse.data?.[0]

      // Prepopulate form with existing data
      const existingData: Partial<ProfileFormData> = {
        // From profile
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        dateOfBirth: profile.date_of_birth || '',
        
        // From onboarding data
        idNumber: onboardingData?.id_number || '',
        gender: onboardingData?.gender || undefined,
        address1: onboardingData?.address_1 || '',
        address2: onboardingData?.address_2 || '',
        suburb: onboardingData?.suburb || '',
        city: onboardingData?.city || '',
        province: onboardingData?.province || '',
        postalCode: onboardingData?.postal_code || '',
        country: onboardingData?.country || 'South Africa',
        preferredContact: onboardingData?.preferred_contact || undefined,
        
        maritalStatus: onboardingData?.marital_status || '',
        maritalStatusOther: onboardingData?.marital_status_other || '',
        employmentStatus: onboardingData?.employment_status || '',
        employmentStatusOther: onboardingData?.employment_status_other || '',
        currentEmployer: onboardingData?.current_employer || '',
        occupation: onboardingData?.occupation || '',
        academicInstitution: onboardingData?.academic_institution || '',
        
        medications: onboardingData?.medications || '',
        allergies: onboardingData?.allergies || '',
        previousSurgeries: onboardingData?.previous_surgeries || '',
        
        treatmentCentre: onboardingData?.treatment_centre || '',
        marketingConsent: onboardingData?.marketing_consent || false,
        
        // From client data (emergency contact)
        emergencyContactName: clientData?.emergency_contact?.name || '',
        emergencyContactPhone: clientData?.emergency_contact?.phone || '',
        emergencyContactRelation: clientData?.emergency_contact?.relation || '',
      }

      // Set form values
      Object.entries(existingData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          reset(prev => ({ ...prev, [key]: value }))
        }
      })

      // Set last saved time if data exists
      if (onboardingData?.last_saved_at) {
        setLastSaved(new Date(onboardingData.last_saved_at))
      }

      setProfileData({ onboardingData, clientData })
    } catch (error) {
      console.error('Error loading profile data:', error)
      setSaveMessage({ type: 'error', text: 'Failed to load profile data' })
    } finally {
      setLoading(false)
    }
  }

  const checkStepCompletion = () => {
    const newCompletedSteps = new Set<number>()
    
    // Step 1: Personal Details
    if (watchedValues.firstName && watchedValues.lastName && watchedValues.email && watchedValues.phone) {
      newCompletedSteps.add(1)
    }
    
    // Step 2: Contact & Address (optional fields, mark as complete if any are filled)
    if (watchedValues.address1 || watchedValues.city || watchedValues.province || watchedValues.preferredContact) {
      newCompletedSteps.add(2)
    }
    
    // Step 3: Employment & Status (optional fields, mark as complete if any are filled)
    if (watchedValues.maritalStatus || watchedValues.employmentStatus || watchedValues.currentEmployer) {
      newCompletedSteps.add(3)
    }
    
    // Step 4: Emergency Contact (optional fields, mark as complete if any are filled)
    if (watchedValues.emergencyContactName || watchedValues.emergencyContactPhone) {
      newCompletedSteps.add(4)
    }
    
    // Step 5: Health Information (optional fields, mark as complete if any are filled)
    if (watchedValues.medications || watchedValues.allergies || watchedValues.previousSurgeries) {
      newCompletedSteps.add(5)
    }
    
    // Step 6: Preferences (optional fields, mark as complete if any are filled)
    if (watchedValues.treatmentCentre || watchedValues.marketingConsent !== undefined) {
      newCompletedSteps.add(6)
    }
    
    setCompletedSteps(newCompletedSteps)
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
        medications: formData.medications || null,
        allergies: formData.allergies || null,
        previous_surgeries: formData.previousSurgeries || null,
        
        // Preferences
        treatment_centre: formData.treatmentCentre || null,
        marketing_consent: formData.marketingConsent || false,
        
        // Legacy fields for compatibility
        current_medications: [],
        chronic_conditions: [],
        current_treatments: [],
        previous_procedures: [],
        medical_implants: [],
        transformation_reasons: [],
        primary_goals: [],
        activity_level: 'not_specified',
        dietary_preferences: null,
        
        // Update timestamps
        updated_at: new Date().toISOString(),
        last_saved_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('client_onboarding_data')
        .upsert(progressData)

      if (error) {
        console.error('Auto-save error:', error)
      } else {
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Auto-save error:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  const goToStep = async (stepNumber: number) => {
    // Auto-save before changing steps
    await autoSaveProgress()
    setCurrentStep(stepNumber)
  }

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await trigger(fieldsToValidate)
    
    if (isValid && currentStep < steps.length) {
      await autoSaveProgress()
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getFieldsForStep = (step: number): (keyof ProfileFormData)[] => {
    switch (step) {
      case 1:
        return ['firstName', 'lastName', 'email', 'phone']
      case 2:
        return [] // Optional fields
      case 3:
        return [] // Optional fields
      case 4:
        return [] // Optional fields
      case 5:
        return [] // Optional fields
      case 6:
        return [] // Optional fields
      default:
        return []
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true)
    try {
      // Update profile table
      const profileUpdates = {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.dateOfBirth || null,
        updated_at: new Date().toISOString()
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user?.id)

      if (profileError) throw profileError

      // Update onboarding data
      const onboardingUpdates = {
        client_id: user?.id,
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
        marital_status: data.maritalStatus || null,
        marital_status_other: data.maritalStatusOther || null,
        employment_status: data.employmentStatus || null,
        employment_status_other: data.employmentStatusOther || null,
        current_employer: data.currentEmployer || null,
        occupation: data.occupation || null,
        academic_institution: data.academicInstitution || null,
        medications: data.medications || null,
        allergies: data.allergies || null,
        previous_surgeries: data.previousSurgeries || null,
        treatment_centre: data.treatmentCentre || null,
        marketing_consent: data.marketingConsent || false,
        updated_at: new Date().toISOString(),
        last_saved_at: new Date().toISOString()
      }

      const { error: onboardingError } = await supabase
        .from('client_onboarding_data')
        .upsert(onboardingUpdates)

      if (onboardingError) throw onboardingError

      // Update emergency contact in clients table
      const emergencyContact = {
        name: data.emergencyContactName || '',
        phone: data.emergencyContactPhone || '',
        relation: data.emergencyContactRelation || '',
      }

      const { error: clientError } = await supabase
        .from('clients')
        .update({
          emergency_contact: emergencyContact,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', user?.id)

      if (clientError) throw clientError

      // Update local auth context
      await updateProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.dateOfBirth || null,
      })

      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' })
      setLastSaved(new Date())
      await loadProfileData() // Reload to get fresh data
    } catch (error) {
      console.error('Error saving profile:', error)
      setSaveMessage({ type: 'error', text: 'Failed to save profile changes' })
    } finally {
      setSaving(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="w-12 h-12 text-wellness-sage-500 mx-auto mb-2" />
              <p className="text-gray-600">
                Update your basic personal information.
              </p>
            </div>
            
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
                label="South African ID Number"
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
                label="Phone Number *"
                type="tel"
                icon={Phone}
                placeholder="+27 XX XXX XXXX"
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>

            <Input
              label="Date of Birth"
              type="date"
              icon={Calendar}
              {...register('dateOfBirth')}
            />
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MapPin className="w-12 h-12 text-wellness-eucalyptus-500 mx-auto mb-2" />
              <p className="text-gray-600">
                Update your contact details and address information.
              </p>
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
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Briefcase className="w-12 h-12 text-wellness-rose-500 mx-auto mb-2" />
              <p className="text-gray-600">
                Update your employment and personal status information.
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

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 text-wellness-sage-500 mx-auto mb-2" />
              <p className="text-gray-600">
                Update your emergency contact information.
              </p>
            </div>
            
            <Input
              label="Emergency Contact Name"
              type="text"
              {...register('emergencyContactName')}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Emergency Contact Phone"
                type="tel"
                icon={Phone}
                {...register('emergencyContactPhone')}
              />
              <Input
                label="Relationship"
                type="text"
                placeholder="e.g., Spouse, Parent, Friend"
                {...register('emergencyContactRelation')}
              />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Heart className="w-12 h-12 text-wellness-rose-500 mx-auto mb-2" />
              <p className="text-gray-600">
                Update your health information and medical history.
              </p>
            </div>
            
            <Input
              label="Current Medications"
              placeholder="List any medications currently taking"
              {...register('medications')}
            />
            
            <Input
              label="Allergies"
              placeholder="List any known allergies"
              {...register('allergies')}
            />
            
            <Input
              label="Previous Surgeries"
              placeholder="List any previous surgeries or major procedures"
              {...register('previousSurgeries')}
            />
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Building className="w-12 h-12 text-wellness-eucalyptus-500 mx-auto mb-2" />
              <p className="text-gray-600">
                Update your treatment centre and communication preferences.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Treatment Centre
              </label>
              <select
                className="wellness-input"
                {...register('treatmentCentre')}
              >
                <option value="">Select treatment centre</option>
                {treatmentCentres.map((centre) => (
                  <option key={centre} value={centre}>{centre}</option>
                ))}
              </select>
            </div>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                {...register('marketingConsent')}
              />
              <span className="text-sm text-gray-700">
                I consent to receive marketing communications
              </span>
            </label>
          </div>
        )

      default:
        return null
    }
  }

  // Custom ProgressBar component with clickable steps
  const renderClickableProgressBar = () => {
    return (
      <div className="w-full">
        {/* Desktop Progress Bar */}
        <div className="hidden md:block">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const stepNumber = index + 1
              const isCompleted = completedSteps.has(stepNumber)
              const isCurrent = stepNumber === currentStep
              const isUpcoming = stepNumber > currentStep
              
              return (
                <div key={step.id} className="flex items-center">
                  {/* Step Circle - Now Clickable */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => goToStep(stepNumber)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-wellness-sage-500 focus:ring-offset-2 ${
                        isCompleted ? 'bg-wellness-sage-500 border-wellness-sage-500 text-white' :
                        isCurrent ? 'bg-white border-wellness-sage-500 text-wellness-sage-600 shadow-lg' :
                        'bg-gray-100 border-gray-300 text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <step.icon className="w-6 h-6" />
                      )}
                    </button>
                    
                    {/* Step Info */}
                    <div className="mt-3 text-center">
                      <p
                        className={`text-sm font-medium ${
                          (isCompleted || isCurrent) ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          (isCompleted || isCurrent) ? 'text-gray-600' : 'text-gray-400'
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${
                        completedSteps.has(stepNumber) ? 'bg-wellness-sage-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Mobile Progress Bar */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((currentStep / steps.length) * 100)}% Complete
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-wellness-sage-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
          
          <div className="mt-4 text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {steps[currentStep - 1]?.title}
            </h3>
            <p className="text-sm text-gray-600">
              {steps[currentStep - 1]?.description}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Your Profile</h1>
          <p className="text-gray-600">Update your wellness journey information</p>
          
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

        {/* Clickable Progress Bar */}
        <div className="mb-8">
          {renderClickableProgressBar()}
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className="mb-6">
            <Card variant="minimal" className={`border-2 ${
              saveMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <CardContent>
                <div className="flex items-center space-x-3">
                  {saveMessage.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {saveMessage.text}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
                    loading={saving}
                    icon={Save}
                    iconPosition="right"
                  >
                    Save Profile
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