import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Trash2,
  Edit,
  Save,
  Eye,
  Copy,
  Settings,
  Type,
  Hash,
  Mail,
  Phone,
  Calendar,
  CheckSquare,
  List,
  FileText,
  Image,
  Star,
  ToggleLeft,
  MapPin,
  Clock,
  Link,
  Upload,
  GripVertical,
  X,
  ChevronDown,
  ChevronUp,
  Columns,
  Grid3X3,
  Square
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { supabase } from '../../lib/supabase'

// Field type definitions
export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
  }
  conditional?: {
    dependsOn: string
    value: string
  }
  description?: string
  defaultValue?: string | string[] | boolean
  layout?: {
    width: 'full' | 'half' | 'third'
    order?: number
  }
}

export type FieldType = 
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'datetime'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'checkboxGroup'
  | 'file'
  | 'image'
  | 'url'
  | 'rating'
  | 'toggle'
  | 'address'
  | 'signature'
  | 'divider'
  | 'heading'
  | 'paragraph'

export interface FormTemplate {
  id: string
  name: string
  description: string
  fields: FormField[]
  settings: {
    multiPage: boolean
    progressBar: boolean
    saveProgress: boolean
    theme: string
  }
  created_at: string
  updated_at: string
  created_by: string
}

const fieldTypes: Array<{
  type: FieldType
  label: string
  icon: React.ComponentType<{ className?: string }>
  category: 'input' | 'choice' | 'media' | 'layout'
}> = [
  // Input Fields
  { type: 'text', label: 'Text Input', icon: Type, category: 'input' },
  { type: 'textarea', label: 'Text Area', icon: FileText, category: 'input' },
  { type: 'email', label: 'Email', icon: Mail, category: 'input' },
  { type: 'phone', label: 'Phone', icon: Phone, category: 'input' },
  { type: 'number', label: 'Number', icon: Hash, category: 'input' },
  { type: 'date', label: 'Date', icon: Calendar, category: 'input' },
  { type: 'datetime', label: 'Date & Time', icon: Calendar, category: 'input' },
  { type: 'time', label: 'Time', icon: Clock, category: 'input' },
  { type: 'url', label: 'URL', icon: Link, category: 'input' },
  { type: 'address', label: 'Address', icon: MapPin, category: 'input' },
  
  // Choice Fields
  { type: 'select', label: 'Dropdown', icon: List, category: 'choice' },
  { type: 'multiselect', label: 'Multi-Select', icon: List, category: 'choice' },
  { type: 'radio', label: 'Radio Buttons', icon: CheckSquare, category: 'choice' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, category: 'choice' },
  { type: 'checkboxGroup', label: 'Checkbox Group', icon: CheckSquare, category: 'choice' },
  { type: 'rating', label: 'Rating', icon: Star, category: 'choice' },
  { type: 'toggle', label: 'Toggle', icon: ToggleLeft, category: 'choice' },
  
  // Media Fields
  { type: 'file', label: 'File Upload', icon: Upload, category: 'media' },
  { type: 'image', label: 'Image Upload', icon: Image, category: 'media' },
  { type: 'signature', label: 'Signature', icon: Edit, category: 'media' },
  
  // Layout Fields
  { type: 'heading', label: 'Heading', icon: Type, category: 'layout' },
  { type: 'paragraph', label: 'Paragraph', icon: FileText, category: 'layout' },
  { type: 'divider', label: 'Divider', icon: Type, category: 'layout' },
]

const fieldSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  type: z.string().min(1, 'Field type is required'),
  placeholder: z.string().optional(),
  required: z.boolean(),
  description: z.string().optional(),
  defaultValue: z.string().optional(),
  options: z.array(z.string()).optional(),
  width: z.enum(['full', 'half', 'third']),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
})

type FieldFormData = z.infer<typeof fieldSchema>

interface FormBuilderProps {
  template?: FormTemplate
  onSave: (template: FormTemplate) => void
  onCancel: () => void
}

export function FormBuilder({ template, onSave, onCancel }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(template?.fields || [])
  const [selectedField, setSelectedField] = useState<FormField | null>(null)
  const [showFieldEditor, setShowFieldEditor] = useState(false)
  const [formName, setFormName] = useState(template?.name || '')
  const [formDescription, setFormDescription] = useState(template?.description || '')
  const [previewMode, setPreviewMode] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    input: true,
    choice: true,
    media: true,
    layout: true,
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
  })

  const watchedOptions = watch('options') || []
  const watchedType = watch('type')

  // Watch for type changes and handle options accordingly
  useEffect(() => {
    if (watchedType && ['select', 'multiselect', 'radio', 'checkboxGroup'].includes(watchedType)) {
      // If switching to a choice field and no options exist, add default options
      if (!watchedOptions || watchedOptions.length === 0) {
        setValue('options', ['Option 1', 'Option 2', 'Option 3'])
      }
    } else {
      // If switching away from choice fields, clear options
      setValue('options', [])
    }
  }, [watchedType, setValue, watchedOptions])

  const generateFieldId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: generateFieldId(),
      type,
      label: `New ${fieldTypes.find(ft => ft.type === type)?.label || type}`,
      required: false,
      placeholder: '',
      description: '',
      layout: {
        width: 'full',
        order: fields.length
      }
    }

    // Add default options for choice fields
    if (['select', 'multiselect', 'radio', 'checkboxGroup'].includes(type)) {
      newField.options = ['Option 1', 'Option 2', 'Option 3']
    }

    setFields([...fields, newField])
    setSelectedField(newField)
    setShowFieldEditor(true)
  }

  const editField = (field: FormField) => {
    console.log('Editing field:', field) // Debug log
    setSelectedField(field)
    setShowFieldEditor(true)
    
    // Populate form with field data - CRITICAL: Include type
    reset({
      label: field.label,
      type: field.type, // ENSURE TYPE IS SET
      placeholder: field.placeholder || '',
      required: field.required,
      description: field.description || '',
      defaultValue: typeof field.defaultValue === 'string' ? field.defaultValue : '',
      options: field.options || [],
      width: field.layout?.width || 'full',
      validation: field.validation,
    })
  }

  const saveField = (data: FieldFormData) => {
    if (!selectedField) {
      console.error('No selected field to save')
      return
    }

    console.log('Saving field with form data:', data) // Debug log
    console.log('Current form values:', getValues()) // Debug log

    // CRITICAL: Ensure we get the latest form values
    const currentValues = getValues()
    
    const updatedField: FormField = {
      ...selectedField,
      type: currentValues.type as FieldType, // Use current form values
      label: currentValues.label,
      placeholder: currentValues.placeholder,
      required: currentValues.required,
      description: currentValues.description,
      defaultValue: currentValues.defaultValue,
      options: currentValues.options && currentValues.options.length > 0 ? currentValues.options : undefined,
      layout: {
        ...selectedField.layout,
        width: currentValues.width,
      },
      validation: currentValues.validation,
    }

    console.log('Updated field object:', updatedField) // Debug log

    // Update the fields array
    const updatedFields = fields.map(f => f.id === selectedField.id ? updatedField : f)
    console.log('Updated fields array:', updatedFields) // Debug log
    
    setFields(updatedFields)
    
    // Close the editor
    setShowFieldEditor(false)
    setSelectedField(null)
    reset()
  }

  const deleteField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId))
    if (selectedField?.id === fieldId) {
      setShowFieldEditor(false)
      setSelectedField(null)
    }
  }

  const duplicateField = (field: FormField) => {
    const duplicatedField: FormField = {
      ...field,
      id: generateFieldId(),
      label: `${field.label} (Copy)`,
      layout: {
        ...field.layout,
        order: fields.length
      }
    }
    
    const fieldIndex = fields.findIndex(f => f.id === field.id)
    const newFields = [...fields]
    newFields.splice(fieldIndex + 1, 0, duplicatedField)
    setFields(newFields)
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(fields)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update order in layout
    const updatedItems = items.map((item, index) => ({
      ...item,
      layout: {
        ...item.layout,
        order: index
      }
    }))

    setFields(updatedItems)
  }

  const changeFieldWidth = (fieldId: string, width: 'full' | 'half' | 'third') => {
    setFields(fields.map(f => 
      f.id === fieldId 
        ? { ...f, layout: { ...f.layout, width } }
        : f
    ))
  }

  const saveTemplate = async () => {
    if (!formName.trim()) {
      alert('Please enter a form name')
      return
    }

    const templateData: FormTemplate = {
      id: template?.id || generateFieldId(),
      name: formName,
      description: formDescription,
      fields,
      settings: {
        multiPage: false,
        progressBar: true,
        saveProgress: true,
        theme: 'default',
      },
      created_at: template?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: template?.created_by || 'current_user',
    }

    onSave(templateData)
  }

  const addOption = () => {
    const currentOptions = watchedOptions
    setValue('options', [...currentOptions, `Option ${currentOptions.length + 1}`])
  }

  const removeOption = (index: number) => {
    const currentOptions = watchedOptions
    setValue('options', currentOptions.filter((_, i) => i !== index))
  }

  const updateOption = (index: number, value: string) => {
    const currentOptions = watchedOptions
    const newOptions = [...currentOptions]
    newOptions[index] = value
    setValue('options', newOptions)
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
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

  const renderFieldPreview = (field: FormField) => {
    const commonProps = {
      label: field.label,
      placeholder: field.placeholder,
      required: field.required,
      disabled: true,
    }

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return <Input {...commonProps} type={field.type} />
      
      case 'textarea':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <textarea
              className="wellness-input"
              placeholder={field.placeholder}
              rows={3}
              disabled
            />
          </div>
        )
      
      case 'number':
        return <Input {...commonProps} type="number" />
      
      case 'date':
        return <Input {...commonProps} type="date" />
      
      case 'datetime':
        return <Input {...commonProps} type="datetime-local" />
      
      case 'time':
        return <Input {...commonProps} type="time" />
      
      case 'select':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <select className="wellness-input" disabled>
              <option value="">{field.placeholder || 'Select an option'}</option>
              {field.options?.map((option, index) => (
                <option key={index} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )
      
      case 'radio':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {field.label} {field.required && '*'}
            </label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={field.id}
                    value={option}
                    className="text-wellness-sage-600 focus:ring-wellness-sage-500"
                    disabled
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        )
      
      case 'checkboxGroup':
        return (
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
                    className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                    disabled
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        )
      
      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
              disabled
            />
            <span className="text-sm text-gray-700">
              {field.label} {field.required && '*'}
            </span>
          </label>
        )
      
      case 'toggle':
        return (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {field.label} {field.required && '*'}
            </span>
            <button
              type="button"
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-wellness-sage-500 focus:ring-offset-2"
              disabled
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
            </button>
          </div>
        )
      
      case 'file':
      case 'image':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {field.type === 'image' ? 'Upload an image' : 'Upload a file'}
              </p>
            </div>
          </div>
        )
      
      case 'rating':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label} {field.required && '*'}
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 text-gray-300" />
              ))}
            </div>
          </div>
        )
      
      case 'heading':
        return (
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {field.label}
          </h3>
        )
      
      case 'paragraph':
        return (
          <p className="text-sm text-gray-600 mb-4">
            {field.description || field.label}
          </p>
        )
      
      case 'divider':
        return <hr className="border-gray-200 my-6" />
      
      default:
        return <Input {...commonProps} />
    }
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

  const groupedFieldTypes = fieldTypes.reduce((acc, fieldType) => {
    if (!acc[fieldType.category]) {
      acc[fieldType.category] = []
    }
    acc[fieldType.category].push(fieldType)
    return acc
  }, {} as Record<string, typeof fieldTypes>)

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar - Field Types */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Form Builder</h2>
          <p className="text-sm text-gray-600">Drag fields to build your form</p>
        </div>
        
        <div className="p-4 space-y-4">
          {Object.entries(groupedFieldTypes).map(([category, types]) => (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center justify-between w-full p-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <span className="capitalize">{category} Fields</span>
                {expandedCategories[category] ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {expandedCategories[category] && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {types.map((fieldType) => (
                    <button
                      key={fieldType.type}
                      onClick={() => addField(fieldType.type)}
                      className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:border-wellness-sage-300 hover:bg-wellness-sage-50 transition-colors"
                    >
                      <fieldType.icon className="w-5 h-5 text-gray-600 mb-1" />
                      <span className="text-xs text-gray-700 text-center">
                        {fieldType.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Input
              placeholder="Form Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-64"
            />
            <Input
              placeholder="Form Description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-80"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              icon={Eye}
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={saveTemplate}
            >
              Save Form
            </Button>
          </div>
        </div>

        {/* Form Canvas - CONSISTENT SIZE FOR BOTH MODES */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader
                title={formName || 'Untitled Form'}
                description={formDescription || (previewMode ? '' : 'Build your form by dragging fields from the sidebar')}
              />
              <CardContent>
                {previewMode ? (
                  /* Preview Mode */
                  <div className="space-y-6">
                    {groupFieldsIntoRows(fields).map((row, rowIndex) => (
                      <div key={rowIndex} className="flex gap-4">
                        {row.map((field) => (
                          <div key={field.id} className={getWidthClass(field.layout?.width || 'full')}>
                            {renderFieldPreview(field)}
                            {field.description && (
                              <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                    
                    {fields.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No fields added yet. Switch to edit mode to add fields.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Edit Mode - SAME LAYOUT AS PREVIEW */
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="form-fields">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-4"
                        >
                          {fields.map((field, index) => (
                            <Draggable key={field.id} draggableId={field.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`bg-white border rounded-lg p-4 ${
                                    snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                                  } ${selectedField?.id === field.id ? 'ring-2 ring-wellness-sage-500' : ''}`}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="cursor-move text-gray-400 hover:text-gray-600"
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                      <span className="text-sm font-medium text-gray-700">
                                        {field.label}
                                      </span>
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {fieldTypes.find(ft => ft.type === field.type)?.label}
                                      </span>
                                      {field.required && (
                                        <span className="text-xs text-red-500">Required</span>
                                      )}
                                      <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">
                                        {field.layout?.width === 'full' ? 'Full Width' : 
                                         field.layout?.width === 'half' ? 'Half Width' : 'Third Width'}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center space-x-1">
                                      {/* Width Controls */}
                                      <div className="flex items-center space-x-1 mr-2">
                                        <Button
                                          variant={field.layout?.width === 'full' ? 'primary' : 'ghost'}
                                          size="sm"
                                          icon={Square}
                                          onClick={() => changeFieldWidth(field.id, 'full')}
                                          title="Full Width"
                                        />
                                        <Button
                                          variant={field.layout?.width === 'half' ? 'primary' : 'ghost'}
                                          size="sm"
                                          icon={Columns}
                                          onClick={() => changeFieldWidth(field.id, 'half')}
                                          title="Half Width"
                                        />
                                        <Button
                                          variant={field.layout?.width === 'third' ? 'primary' : 'ghost'}
                                          size="sm"
                                          icon={Grid3X3}
                                          onClick={() => changeFieldWidth(field.id, 'third')}
                                          title="Third Width"
                                        />
                                      </div>
                                      
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        icon={Edit}
                                        onClick={() => editField(field)}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        icon={Copy}
                                        onClick={() => duplicateField(field)}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        icon={Trash2}
                                        onClick={() => deleteField(field.id)}
                                        className="text-red-600 hover:text-red-700"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="pointer-events-none">
                                    {renderFieldPreview(field)}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {fields.length === 0 && (
                            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                              <p className="text-lg font-medium mb-2">Start building your form</p>
                              <p>Drag field types from the left sidebar to add them to your form</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Field Editor Modal */}
      {showFieldEditor && selectedField && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader
              title="Edit Field"
              description="Configure the properties for this field"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => {
                    setShowFieldEditor(false)
                    setSelectedField(null)
                    reset()
                  }}
                />
              }
            />
            <CardContent>
              <form onSubmit={handleSubmit(saveField)} className="space-y-6">
                {/* Field Type Selector - CRITICAL FIX */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Type *
                  </label>
                  <select
                    className="wellness-input"
                    {...register('type', { required: 'Field type is required' })}
                    defaultValue={selectedField.type} // ENSURE DEFAULT VALUE IS SET
                  >
                    {Object.entries(groupedFieldTypes).map(([category, types]) => (
                      <optgroup key={category} label={`${category.charAt(0).toUpperCase() + category.slice(1)} Fields`}>
                        {types.map((fieldType) => (
                          <option key={fieldType.type} value={fieldType.type}>
                            {fieldType.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {errors.type && (
                    <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
                  )}
                </div>

                <Input
                  label="Field Label *"
                  error={errors.label?.message}
                  {...register('label', { required: 'Label is required' })}
                />
                
                {!['heading', 'paragraph', 'divider'].includes(watchedType) && (
                  <Input
                    label="Placeholder Text"
                    {...register('placeholder')}
                  />
                )}
                
                <Input
                  label="Description"
                  {...register('description')}
                />
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                    {...register('required')}
                  />
                  <span className="text-sm text-gray-700">Required field</span>
                </label>
                
                {/* Layout Controls */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Width
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="full"
                        className="text-wellness-sage-600 focus:ring-wellness-sage-500"
                        {...register('width')}
                      />
                      <span className="text-sm text-gray-700">Full</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="half"
                        className="text-wellness-sage-600 focus:ring-wellness-sage-500"
                        {...register('width')}
                      />
                      <span className="text-sm text-gray-700">Half</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="third"
                        className="text-wellness-sage-600 focus:ring-wellness-sage-500"
                        {...register('width')}
                      />
                      <span className="text-sm text-gray-700">Third</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Controls how many fields appear side by side
                  </p>
                </div>
                
                {/* Options for choice fields - DYNAMIC BASED ON TYPE */}
                {watchedType && ['select', 'multiselect', 'radio', 'checkboxGroup'].includes(watchedType) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options
                    </label>
                    <div className="space-y-2">
                      {watchedOptions.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            className="wellness-input flex-1"
                            placeholder={`Option ${index + 1}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            onClick={() => removeOption(index)}
                            className="text-red-600 hover:text-red-700"
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={Plus}
                        onClick={addOption}
                      >
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Validation for text/number fields */}
                {watchedType && ['text', 'textarea', 'number'].includes(watchedType) && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700">Validation</h4>
                    
                    {['text', 'textarea'].includes(watchedType) && (
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Min Length"
                          type="number"
                          {...register('validation.minLength', { valueAsNumber: true })}
                        />
                        <Input
                          label="Max Length"
                          type="number"
                          {...register('validation.maxLength', { valueAsNumber: true })}
                        />
                      </div>
                    )}
                    
                    {watchedType === 'number' && (
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Min Value"
                          type="number"
                          {...register('validation.min', { valueAsNumber: true })}
                        />
                        <Input
                          label="Max Value"
                          type="number"
                          {...register('validation.max', { valueAsNumber: true })}
                        />
                      </div>
                    )}
                    
                    <Input
                      label="Pattern (Regex)"
                      placeholder="e.g., ^[A-Za-z]+$"
                      {...register('validation.pattern')}
                    />
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowFieldEditor(false)
                      setSelectedField(null)
                      reset()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    icon={Save}
                  >
                    Save Field
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}