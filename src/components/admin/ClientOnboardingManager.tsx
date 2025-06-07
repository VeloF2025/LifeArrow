import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Search, 
  Edit, 
  Save, 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Heart,
  Shield,
  Zap,
  Filter,
  Download,
  Eye,
  MapPin,
  Briefcase,
  FileText,
  Plus,
  UserPlus
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { formatSADate, generateClientCode } from '../../lib/utils'

// Enhanced schema for editing comprehensive onboarding data
const editOnboardingSchema = z.object({
  // Basic Information
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  idNumber: z.string().optional(),
  gender: z.string().optional(),
  
  // Address Information
  address1: z.string().optional(),
  address2: z.string().optional(),
  suburb: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  preferredContact: z.string().optional(),
  
  // Personal Information
  maritalStatus: z.string().optional(),
  maritalStatusOther: z.string().optional(),
  employmentStatus: z.string().optional(),
  employmentStatusOther: z.string().optional(),
  currentEmployer: z.string().optional(),
  occupation: z.string().optional(),
  academicInstitution: z.string().optional(),
  
  // Health Information (simplified for editing)
  medications: z.string().optional(),
  allergies: z.string().optional(),
  previousSurgeries: z.string().optional(),
  
  // Goals and Preferences
  primaryGoals: z.array(z.string()).optional(),
  activityLevel: z.string().optional(),
  dietaryPreferences: z.string().optional(),
  
  // Other Information
  transformationReasons: z.array(z.string()).optional(),
  hearAboutUs: z.string().optional(),
  treatmentCentre: z.string().optional(),
  marketingConsent: z.boolean().optional(),
})

// Schema for creating new clients
const createClientSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  idNumber: z.string().optional(),
  gender: z.string().optional(),
  treatmentCentre: z.string().min(1, 'Please select a treatment centre'),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
})

type EditOnboardingFormData = z.infer<typeof editOnboardingSchema>
type CreateClientFormData = z.infer<typeof createClientSchema>

interface EnhancedClientOnboardingData {
  id: string
  client_id: string
  profile: {
    first_name: string
    last_name: string
    email: string
    phone: string
    date_of_birth: string
    clients: {
      client_code: string
      emergency_contact: any
    }
  }
  
  // Enhanced fields
  id_number: string
  gender: string
  address_1: string
  address_2: string
  suburb: string
  city: string
  province: string
  postal_code: string
  country: string
  preferred_contact: string
  
  marital_status: string
  marital_status_other: string
  employment_status: string
  employment_status_other: string
  current_employer: string
  occupation: string
  academic_institution: string
  
  current_medications: any[]
  chronic_conditions: any[]
  current_treatments: any[]
  previous_procedures: any[]
  medical_implants: any[]
  
  transformation_reasons: string[]
  transformation_reasons_other: string
  hear_about_us: string
  hear_about_us_other: string
  treatment_centre: string
  terms_accepted: boolean
  
  // Legacy fields
  medications: string
  allergies: string
  previous_surgeries: string
  primary_goals: string[]
  activity_level: string
  dietary_preferences: string
  marketing_consent: boolean
  
  created_at: string
  updated_at: string
}

const provinces = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 
  'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
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

const activityLevelOptions = [
  { value: 'sedentary', label: 'Sedentary (little to no exercise)' },
  { value: 'light', label: 'Light (1-3 days per week)' },
  { value: 'moderate', label: 'Moderate (3-5 days per week)' },
  { value: 'active', label: 'Active (6-7 days per week)' },
  { value: 'very_active', label: 'Very Active (2x per day or intense training)' },
]

const treatmentCentres = [
  'Pretoria - Life Arrow Silverwoods'
]

export function ClientOnboardingManager() {
  const [clients, setClients] = useState<EnhancedClientOnboardingData[]>([])
  const [filteredClients, setFilteredClients] = useState<EnhancedClientOnboardingData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingClient, setEditingClient] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'recent' | 'incomplete'>('all')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const { profile } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditOnboardingFormData>({
    resolver: zodResolver(editOnboardingSchema),
  })

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
  })

  const watchedValues = watch()

  useEffect(() => {
    fetchClientOnboardingData()
  }, [])

  useEffect(() => {
    filterClients()
  }, [clients, searchTerm, filterStatus])

  const fetchClientOnboardingData = async () => {
    try {
      const { data, error } = await supabase
        .from('client_onboarding_data')
        .select(`
          *,
          profile:profiles!client_onboarding_data_client_id_fkey(
            first_name,
            last_name,
            email,
            phone,
            date_of_birth,
            clients(
              client_code,
              emergency_contact
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching client onboarding data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterClients = () => {
    let filtered = clients

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client => 
        client.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.profile?.clients?.client_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.id_number?.includes(searchTerm)
      )
    }

    // Status filter
    if (filterStatus === 'recent') {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      filtered = filtered.filter(client => 
        new Date(client.created_at) > oneWeekAgo
      )
    } else if (filterStatus === 'incomplete') {
      filtered = filtered.filter(client => 
        !client.terms_accepted || !client.treatment_centre
      )
    }

    setFilteredClients(filtered)
  }

  const createNewClient = async (data: CreateClientFormData) => {
    setCreating(true)
    try {
      console.log('Starting client creation process...')
      
      // Get the current user's session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session found')
      }

      // Call the edge function to create the client
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-client`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create client')
      }

      // Refresh the client list
      await fetchClientOnboardingData()
      
      // Reset form and close modal
      resetCreate()
      setShowCreateForm(false)
      
      alert(`Client created successfully!\nClient Code: ${result.clientCode}\n\nThe client can now log in with their email (${data.email}) and the password you provided.`)
      
    } catch (error) {
      console.error('Error creating client:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Error creating client: ${errorMessage}`)
    } finally {
      setCreating(false)
    }
  }

  const startEditing = (client: EnhancedClientOnboardingData) => {
    setEditingClient(client.id)
    
    // Set form values with comprehensive data
    reset({
      firstName: client.profile?.first_name || '',
      lastName: client.profile?.last_name || '',
      email: client.profile?.email || '',
      phone: client.profile?.phone || '',
      idNumber: client.id_number || '',
      gender: client.gender || '',
      
      address1: client.address_1 || '',
      address2: client.address_2 || '',
      suburb: client.suburb || '',
      city: client.city || '',
      province: client.province || '',
      postalCode: client.postal_code || '',
      country: client.country || '',
      preferredContact: client.preferred_contact || '',
      
      maritalStatus: client.marital_status || '',
      maritalStatusOther: client.marital_status_other || '',
      employmentStatus: client.employment_status || '',
      employmentStatusOther: client.employment_status_other || '',
      currentEmployer: client.current_employer || '',
      occupation: client.occupation || '',
      academicInstitution: client.academic_institution || '',
      
      medications: client.medications || '',
      allergies: client.allergies || '',
      previousSurgeries: client.previous_surgeries || '',
      
      primaryGoals: client.primary_goals || [],
      activityLevel: client.activity_level || '',
      dietaryPreferences: client.dietary_preferences || '',
      
      transformationReasons: client.transformation_reasons || [],
      hearAboutUs: client.hear_about_us || '',
      treatmentCentre: client.treatment_centre || '',
      marketingConsent: client.marketing_consent || false,
    })
  }

  const cancelEditing = () => {
    setEditingClient(null)
    reset()
  }

  const saveChanges = async (data: EditOnboardingFormData) => {
    if (!editingClient) return

    setSaving(true)
    try {
      const client = clients.find(c => c.id === editingClient)
      if (!client) throw new Error('Client not found')

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', client.client_id)

      if (profileError) throw profileError

      // Update comprehensive onboarding data - use null for empty strings on constrained fields
      const { error: onboardingError } = await supabase
        .from('client_onboarding_data')
        .update({
          id_number: data.idNumber || null,
          gender: data.gender || null,
          address_1: data.address1 || null,
          address_2: data.address2 || null,
          suburb: data.suburb || null,
          city: data.city || null,
          province: data.province || null,
          postal_code: data.postalCode || null,
          country: data.country || null,
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
          primary_goals: data.primaryGoals || [],
          activity_level: data.activityLevel || null,
          dietary_preferences: data.dietaryPreferences || null,
          
          transformation_reasons: data.transformationReasons || [],
          hear_about_us: data.hearAboutUs || null,
          treatment_centre: data.treatmentCentre || null,
          marketing_consent: data.marketingConsent || false,
          
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingClient)

      if (onboardingError) throw onboardingError

      // Refresh data
      await fetchClientOnboardingData()
      setEditingClient(null)
      reset()
    } catch (error) {
      console.error('Error saving changes:', error)
      alert('Error saving changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleArrayFieldChange = (
    fieldName: 'primaryGoals' | 'transformationReasons',
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

  const exportData = async () => {
    try {
      const csvContent = [
        // Headers
        [
          'Client Code', 'First Name', 'Last Name', 'Email', 'Phone', 'ID Number',
          'Gender', 'Address', 'City', 'Province', 'Postal Code',
          'Marital Status', 'Employment Status', 'Current Employer', 'Occupation',
          'Medications', 'Allergies', 'Previous Surgeries',
          'Transformation Reasons', 'Hear About Us', 'Treatment Centre',
          'Terms Accepted', 'Created At'
        ].join(','),
        // Data rows
        ...filteredClients.map(client => {
          const fullAddress = [
            client.address_1,
            client.address_2,
            client.suburb
          ].filter(Boolean).join(', ')

          return [
            client.profile?.clients?.client_code || '',
            client.profile?.first_name || '',
            client.profile?.last_name || '',
            client.profile?.email || '',
            client.profile?.phone || '',
            client.id_number || '',
            client.gender || '',
            fullAddress,
            client.city || '',
            client.province || '',
            client.postal_code || '',
            client.marital_status || '',
            client.employment_status || '',
            client.current_employer || '',
            client.occupation || '',
            client.medications || '',
            client.allergies || '',
            client.previous_surgeries || '',
            (client.transformation_reasons || []).join('; '),
            client.hear_about_us || '',
            client.treatment_centre || '',
            client.terms_accepted ? 'Yes' : 'No',
            formatSADate(client.created_at)
          ].map(field => `"${field}"`).join(',')
        })
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `client-onboarding-data-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Error exporting data. Please try again.')
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Onboarding Management</h1>
          <p className="text-gray-600 mt-1">View and edit comprehensive client onboarding information</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => setShowCreateForm(true)}
          >
            Add New Client
          </Button>
          <Button
            variant="secondary"
            icon={Download}
            onClick={exportData}
          >
            Export Data
          </Button>
        </div>
      </div>

      {/* Create Client Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader
              title="Add New Client"
              description="Create a new client profile with basic information"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => {
                    setShowCreateForm(false)
                    resetCreate()
                  }}
                />
              }
            />
            <CardContent>
              <form onSubmit={handleSubmitCreate(createNewClient)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    error={createErrors.firstName?.message}
                    {...registerCreate('firstName')}
                  />
                  <Input
                    label="Last Name *"
                    error={createErrors.lastName?.message}
                    {...registerCreate('lastName')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email Address *"
                    type="email"
                    error={createErrors.email?.message}
                    {...registerCreate('email')}
                  />
                  <Input
                    label="Phone Number *"
                    type="tel"
                    error={createErrors.phone?.message}
                    {...registerCreate('phone')}
                  />
                </div>

                <Input
                  label="Password *"
                  type="password"
                  placeholder="Minimum 8 characters"
                  error={createErrors.password?.message}
                  {...registerCreate('password')}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="ID Number"
                    error={createErrors.idNumber?.message}
                    {...registerCreate('idNumber')}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gender
                    </label>
                    <select
                      className="wellness-input"
                      {...registerCreate('gender')}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Treatment Centre *
                  </label>
                  <select
                    className="wellness-input"
                    {...registerCreate('treatmentCentre')}
                  >
                    <option value="">Select treatment centre</option>
                    {treatmentCentres.map((centre) => (
                      <option key={centre} value={centre}>{centre}</option>
                    ))}
                  </select>
                  {createErrors.treatmentCentre && (
                    <p className="text-sm text-red-600 mt-1">{createErrors.treatmentCentre.message}</p>
                  )}
                </div>

                <div className="border-t pt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Emergency Contact (Optional)</h4>
                  <div className="space-y-4">
                    <Input
                      label="Emergency Contact Name"
                      {...registerCreate('emergencyContactName')}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Emergency Contact Phone"
                        type="tel"
                        {...registerCreate('emergencyContactPhone')}
                      />
                      <Input
                        label="Relationship"
                        placeholder="e.g., Spouse, Parent, Friend"
                        {...registerCreate('emergencyContactRelation')}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      resetCreate()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={creating}
                    icon={UserPlus}
                  >
                    Create Client
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, client code, or ID number..."
                icon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="wellness-input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">All Clients</option>
                <option value="recent">Recent (Last 7 days)</option>
                <option value="incomplete">Incomplete Data</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {filteredClients.length} of {clients.length} clients
      </div>

      {/* Client List */}
      <div className="space-y-4">
        {filteredClients.map((client) => (
          <Card key={client.id} className="overflow-hidden">
            <CardHeader
              title={
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-wellness-sage-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-wellness-sage-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {client.profile?.first_name} {client.profile?.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {client.profile?.clients?.client_code} • {client.id_number} • Joined {formatSADate(client.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {editingClient === client.id ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={X}
                          onClick={cancelEditing}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Save}
                          loading={saving}
                          onClick={handleSubmit(saveChanges)}
                        >
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Edit}
                        onClick={() => startEditing(client)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              }
            />
            
            <CardContent>
              {editingClient === client.id ? (
                /* Edit Form */
                <form className="space-y-8">
                  {/* Personal Information */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Personal Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="First Name"
                        error={errors.firstName?.message}
                        {...register('firstName')}
                      />
                      <Input
                        label="Last Name"
                        error={errors.lastName?.message}
                        {...register('lastName')}
                      />
                      <Input
                        label="ID Number"
                        error={errors.idNumber?.message}
                        {...register('idNumber')}
                      />
                      <Input
                        label="Email"
                        type="email"
                        error={errors.email?.message}
                        {...register('email')}
                      />
                      <Input
                        label="Phone"
                        type="tel"
                        error={errors.phone?.message}
                        {...register('phone')}
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
                  </div>

                  {/* Address Information */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Address Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Address Line 1"
                        {...register('address1')}
                      />
                      <Input
                        label="Address Line 2"
                        {...register('address2')}
                      />
                      <Input
                        label="Suburb"
                        {...register('suburb')}
                      />
                      <Input
                        label="City"
                        {...register('city')}
                      />
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
                        {...register('postalCode')}
                      />
                    </div>
                  </div>

                  {/* Employment Information */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Employment & Personal Status
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Marital Status"
                        {...register('maritalStatus')}
                      />
                      <Input
                        label="Employment Status"
                        {...register('employmentStatus')}
                      />
                      <Input
                        label="Current Employer"
                        {...register('currentEmployer')}
                      />
                      <Input
                        label="Occupation"
                        {...register('occupation')}
                      />
                    </div>
                  </div>

                  {/* Health Information */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <Heart className="w-4 h-4 mr-2" />
                      Health Information
                    </h4>
                    <div className="space-y-4">
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
                  </div>

                  {/* Goals & Preferences */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Goals & Preferences
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Transformation Reasons
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Activity Level
                        </label>
                        <select
                          className="wellness-input"
                          {...register('activityLevel')}
                        >
                          <option value="">Select activity level</option>
                          {activityLevelOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <Input
                        label="Treatment Centre"
                        {...register('treatmentCentre')}
                      />

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                          {...register('marketingConsent')}
                        />
                        <span className="text-sm text-gray-700">
                          Consent to marketing communications
                        </span>
                      </label>
                    </div>
                  </div>
                </form>
              ) : (
                /* View Mode */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Contact Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Contact Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Email:</span> {client.profile?.email}</p>
                      <p><span className="text-gray-500">Phone:</span> {client.profile?.phone}</p>
                      <p><span className="text-gray-500">ID Number:</span> {client.id_number || 'Not provided'}</p>
                      <p><span className="text-gray-500">Gender:</span> {client.gender || 'Not specified'}</p>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Address
                    </h4>
                    <div className="space-y-2 text-sm">
                      {client.address_1 && <p>{client.address_1}</p>}
                      {client.address_2 && <p>{client.address_2}</p>}
                      {client.suburb && <p>{client.suburb}</p>}
                      <p>{client.city}, {client.province}</p>
                      {client.postal_code && <p>{client.postal_code}</p>}
                    </div>
                  </div>

                  {/* Employment Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Employment
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Status:</span> {client.employment_status || 'Not specified'}</p>
                      <p><span className="text-gray-500">Employer:</span> {client.current_employer || 'Not provided'}</p>
                      <p><span className="text-gray-500">Occupation:</span> {client.occupation || 'Not provided'}</p>
                    </div>
                  </div>

                  {/* Transformation Goals */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Transformation Goals & Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Reasons:</span>
                        <div className="mt-1">
                          {client.transformation_reasons?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {client.transformation_reasons.map((reason, index) => (
                                <span key={index} className="inline-block bg-wellness-sage-100 text-wellness-sage-700 px-2 py-1 rounded text-xs">
                                  {reason}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">None specified</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Heard About Us:</span>
                        <p className="mt-1">{client.hear_about_us || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Treatment Centre:</span>
                        <p className="mt-1">{client.treatment_centre || 'Not selected'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Health Information */}
                  {(client.medications || client.allergies || client.previous_surgeries) && (
                    <div className="md:col-span-2 lg:col-span-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <Heart className="w-4 h-4 mr-2" />
                        Health Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {client.medications && (
                          <div>
                            <span className="text-gray-500">Medications:</span>
                            <p className="mt-1">{client.medications}</p>
                          </div>
                        )}
                        {client.allergies && (
                          <div>
                            <span className="text-gray-500">Allergies:</span>
                            <p className="mt-1">{client.allergies}</p>
                          </div>
                        )}
                        {client.previous_surgeries && (
                          <div>
                            <span className="text-gray-500">Previous Surgeries:</span>
                            <p className="mt-1">{client.previous_surgeries}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No client onboarding data available yet.'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <Button
                  variant="primary"
                  icon={UserPlus}
                  onClick={() => setShowCreateForm(true)}
                >
                  Add Your First Client
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}