import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Star,
  Upload,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Link,
  Hash,
  Type,
  FileText,
  CheckSquare
} from 'lucide-react'
import { FormTemplate, FormField } from './FormBuilder'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface FormRendererProps {
  template: FormTemplate
  onSubmit: (data: any) => void
  initialData?: Record<string, any>
}

export function FormRenderer({ template, onSubmit, initialData = {} }: FormRendererProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Generate dynamic schema based on form fields
  const generateSchema = () => {
    const schemaFields: Record<string, any> = {}

    template.fields.forEach((field) => {
      let fieldSchema: any

      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email('Please enter a valid email address')
          break
        case 'phone':
          fieldSchema = z.string().min(10, 'Please enter a valid phone number')
          break
        case 'number':
          fieldSchema = z.number()
          if (field.validation?.min !== undefined) {
            fieldSchema = fieldSchema.min(field.validation.min)
          }
          if (field.validation?.max !== undefined) {
            fieldSchema = fieldSchema.max(field.validation.max)
          }
          break
        case 'url':
          fieldSchema = z.string().url('Please enter a valid URL')
          break
        case 'date':
        case 'datetime':
        case 'time':
          fieldSchema = z.string()
          break
        case 'checkbox':
        case 'toggle':
          fieldSchema = z.boolean()
          break
        case 'checkboxGroup':
        case 'multiselect':
          fieldSchema = z.array(z.string())
          break
        case 'file':
        case 'image':
          fieldSchema = z.any()
          break
        case 'rating':
          fieldSchema = z.number().min(1).max(5)
          break
        default:
          fieldSchema = z.string()
          if (field.validation?.minLength) {
            fieldSchema = fieldSchema.min(field.validation.minLength)
          }
          if (field.validation?.maxLength) {
            fieldSchema = fieldSchema.max(field.validation.maxLength)
          }
          if (field.validation?.pattern) {
            fieldSchema = fieldSchema.regex(new RegExp(field.validation.pattern))
          }
      }

      if (!field.required) {
        fieldSchema = fieldSchema.optional()
      }

      schemaFields[field.id] = fieldSchema
    })

    return z.object(schemaFields)
  }

  const schema = generateSchema()
  
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData,
  })

  const watchedValues = watch()

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Group fields by rows based on their width
  const groupFieldsIntoRows = (fields: FormField[]) => {
    const rows: FormField[][] = []
    let currentRow: FormField[] = []
    let currentRowWidth = 0

    fields.forEach(field => {
      const fieldWidth = field.layout?.width || 'full'
      const widthValue = fieldWidth === 'full' ? 12 : fieldWidth === 'half' ? 6 : 4

      // If adding this field would exceed row width, start a new row
      if (currentRowWidth + widthValue > 12 || fieldWidth === 'full') {
        if (currentRow.length > 0) {
          rows.push(currentRow)
          currentRow = []
          currentRowWidth = 0
        }
      }

      currentRow.push(field)
      currentRowWidth += widthValue

      // If this field fills the row completely, start a new row
      if (currentRowWidth >= 12) {
        rows.push(currentRow)
        currentRow = []
        currentRowWidth = 0
      }
    })

    // Add any remaining fields
    if (currentRow.length > 0) {
      rows.push(currentRow)
    }

    return rows
  }

  const getWidthClass = (width: string) => {
    switch (width) {
      case 'half':
        return 'w-1/2'
      case 'third':
        return 'w-1/3'
      default:
        return 'w-full'
    }
  }

  const renderField = (field: FormField) => {
    // Check conditional logic
    if (field.conditional) {
      const dependentValue = watchedValues[field.conditional.dependsOn]
      if (dependentValue !== field.conditional.value) {
        return null
      }
    }

    const error = errors[field.id]?.message as string

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <Input
            key={field.id}
            label={field.label}
            type={field.type}
            placeholder={field.placeholder}
            error={error}
            helperText={field.description}
            {...register(field.id)}
          />
        )

      case 'textarea':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <textarea
              className="wellness-input"
              placeholder={field.placeholder}
              rows={4}
              {...register(field.id)}
            />
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
        )

      case 'number':
        return (
          <Input
            key={field.id}
            label={field.label}
            type="number"
            placeholder={field.placeholder}
            error={error}
            helperText={field.description}
            {...register(field.id, { valueAsNumber: true })}
          />
        )

      case 'date':
        return (
          <Input
            key={field.id}
            label={field.label}
            type="date"
            error={error}
            helperText={field.description}
            {...register(field.id)}
          />
        )

      case 'datetime':
        return (
          <Input
            key={field.id}
            label={field.label}
            type="datetime-local"
            error={error}
            helperText={field.description}
            {...register(field.id)}
          />
        )

      case 'time':
        return (
          <Input
            key={field.id}
            label={field.label}
            type="time"
            error={error}
            helperText={field.description}
            {...register(field.id)}
          />
        )

      case 'select':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <select className="wellness-input" {...register(field.id)}>
              <option value="">{field.placeholder || 'Select an option'}</option>
              {field.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
        )

      case 'multiselect':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <select
              className="wellness-input"
              multiple
              size={Math.min(field.options?.length || 3, 5)}
              {...register(field.id)}
            >
              {field.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
        )

      case 'radio':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {field.label} {field.required && '*'}
            </label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value={option}
                    className="text-wellness-sage-600 focus:ring-wellness-sage-500"
                    {...register(field.id)}
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
        )

      case 'checkboxGroup':
        return (
          <Controller
            key={field.id}
            name={field.id}
            control={control}
            defaultValue={[]}
            render={({ field: controllerField }) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {field.label} {field.required && '*'}
                </label>
                <div className="space-y-2">
                  {field.options?.map((option, index) => (
                    <label key={index} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={option}
                        checked={controllerField.value?.includes(option) || false}
                        onChange={(e) => {
                          const currentValues = controllerField.value || []
                          if (e.target.checked) {
                            controllerField.onChange([...currentValues, option])
                          } else {
                            controllerField.onChange(
                              currentValues.filter((v: string) => v !== option)
                            )
                          }
                        }}
                        className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
                {field.description && (
                  <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                )}
                {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
              </div>
            )}
          />
        )

      case 'checkbox':
        return (
          <div key={field.id}>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                {...register(field.id)}
              />
              <span className="text-sm text-gray-700">
                {field.label} {field.required && '*'}
              </span>
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
        )

      case 'toggle':
        return (
          <Controller
            key={field.id}
            name={field.id}
            control={control}
            defaultValue={false}
            render={({ field: controllerField }) => (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {field.label} {field.required && '*'}
                  </span>
                  <button
                    type="button"
                    onClick={() => controllerField.onChange(!controllerField.value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-wellness-sage-500 focus:ring-offset-2 ${
                      controllerField.value ? 'bg-wellness-sage-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        controllerField.value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {field.description && (
                  <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                )}
                {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
              </div>
            )}
          />
        )

      case 'rating':
        return (
          <Controller
            key={field.id}
            name={field.id}
            control={control}
            defaultValue={0}
            render={({ field: controllerField }) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label} {field.required && '*'}
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => controllerField.onChange(star)}
                      className={`w-8 h-8 ${
                        star <= controllerField.value
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      } hover:text-yellow-400 transition-colors`}
                    >
                      <Star className="w-full h-full fill-current" />
                    </button>
                  ))}
                </div>
                {field.description && (
                  <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                )}
                {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
              </div>
            )}
          />
        )

      case 'file':
      case 'image':
        return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                {field.type === 'image' ? 'Upload an image' : 'Upload a file'}
              </p>
              <input
                type="file"
                accept={field.type === 'image' ? 'image/*' : '*/*'}
                className="hidden"
                id={field.id}
                {...register(field.id)}
              />
              <label
                htmlFor={field.id}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                Choose File
              </label>
            </div>
            {field.description && (
              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
        )

      case 'heading':
        return (
          <h3 key={field.id} className="text-lg font-semibold text-gray-900 mb-2">
            {field.label}
          </h3>
        )

      case 'paragraph':
        return (
          <p key={field.id} className="text-sm text-gray-600 mb-4">
            {field.description || field.label}
          </p>
        )

      case 'divider':
        return <hr key={field.id} className="border-gray-200 my-6" />

      default:
        return (
          <Input
            key={field.id}
            label={field.label}
            placeholder={field.placeholder}
            error={error}
            helperText={field.description}
            {...register(field.id)}
          />
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader
          title={template.name}
          description={template.description}
        />
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {groupFieldsIntoRows(template.fields).map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-4">
                {row.map((field) => (
                  <div key={field.id} className={getWidthClass(field.layout?.width || 'full')}>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            ))}
            
            <div className="flex justify-end pt-6 border-t border-gray-100">
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                size="lg"
              >
                Submit Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}