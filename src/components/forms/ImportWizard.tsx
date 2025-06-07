import React, { useState, useRef } from 'react'
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  File, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Eye,
  Edit,
  Download,
  RefreshCw,
  Info
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { FormTemplate } from './FormBuilder'
import { FormRenderer } from './FormRenderer'
import { FileImporter, ImportResult } from '../../lib/fileImporter'

interface ImportWizardProps {
  onImportComplete: (template: FormTemplate) => void
  onCancel: () => void
}

const SUPPORTED_FORMATS = [
  {
    extension: '.xlsx, .xls',
    name: 'Excel Spreadsheet',
    icon: FileSpreadsheet,
    description: 'Import from Excel files. First row should contain field names.',
    color: 'text-green-600'
  },
  {
    extension: '.csv',
    name: 'CSV File',
    icon: FileText,
    description: 'Import from comma-separated values files.',
    color: 'text-blue-600'
  },
  {
    extension: '.pdf',
    name: 'PDF Document',
    icon: File,
    description: 'Extract form fields from PDF documents using text analysis.',
    color: 'text-red-600'
  },
  {
    extension: '.docx',
    name: 'Word Document',
    icon: FileText,
    description: 'Import from Microsoft Word documents.',
    color: 'text-blue-700'
  },
  {
    extension: '.txt',
    name: 'Text File',
    icon: FileText,
    description: 'Parse form fields from plain text files.',
    color: 'text-gray-600'
  },
  {
    extension: '.json',
    name: 'JSON File',
    icon: File,
    description: 'Import from JSON files or existing form templates.',
    color: 'text-purple-600'
  }
]

export function ImportWizard({ onImportComplete, onCancel }: ImportWizardProps) {
  const [dragActive, setDragActive] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    setImporting(true)
    setImportResult(null)
    
    try {
      const result = await FileImporter.importFile(file)
      setImportResult(result)
      
      if (result.success && result.template) {
        setPreviewTemplate(result.template)
      }
    } catch (error) {
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setImporting(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handlePreview = () => {
    if (previewTemplate) {
      setShowPreview(true)
    }
  }

  const handleConfirmImport = () => {
    if (previewTemplate) {
      onImportComplete(previewTemplate)
    }
  }

  const handleRetry = () => {
    setImportResult(null)
    setPreviewTemplate(null)
    setShowPreview(false)
  }

  if (showPreview && previewTemplate) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Preview Imported Form</h2>
            <p className="text-sm text-gray-600">{previewTemplate.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
            >
              Back to Import
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmImport}
            >
              Import This Form
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FormRenderer
            template={previewTemplate}
            onSubmit={(data) => {
              console.log('Preview form submitted:', data)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader
          title="Import Form from File"
          description="Upload a file to automatically create a form template"
          action={
            <Button variant="outline\" onClick={onCancel}>
              Cancel
            </Button>
          }
        />
        <CardContent>
          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-wellness-sage-400 bg-wellness-sage-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.docx,.txt,.json"
              onChange={handleFileInput}
              className="hidden"
            />
            
            {importing ? (
              <div className="flex flex-col items-center">
                <RefreshCw className="w-12 h-12 text-wellness-sage-500 animate-spin mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Processing File...</h3>
                <p className="text-gray-600">Analyzing and converting to form fields</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop your file here or click to browse
                </h3>
                <p className="text-gray-600 mb-4">
                  Supports Excel, CSV, PDF, Word, Text, and JSON files
                </p>
                <Button
                  variant="primary"
                  onClick={handleImportClick}
                  disabled={importing}
                >
                  Choose File
                </Button>
              </div>
            )}
          </div>

          {/* Import Result */}
          {importResult && (
            <div className="mt-6">
              {importResult.success ? (
                <Card variant="minimal\" className="border-green-200 bg-green-50">
                  <CardContent>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-green-800 mb-1">
                          Import Successful!
                        </h3>
                        <p className="text-sm text-green-700 mb-3">
                          Successfully imported {importResult.template?.fields.length} fields from your file.
                        </p>
                        
                        {importResult.warnings && importResult.warnings.length > 0 && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-amber-800 mb-1">Warnings:</h4>
                            <ul className="text-sm text-amber-700 list-disc list-inside">
                              {importResult.warnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Eye}
                            onClick={handlePreview}
                          >
                            Preview Form
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleConfirmImport}
                          >
                            Import Form
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={RefreshCw}
                            onClick={handleRetry}
                          >
                            Try Another File
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card variant="minimal" className="border-red-200 bg-red-50">
                  <CardContent>
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-red-800 mb-1">
                          Import Failed
                        </h3>
                        <p className="text-sm text-red-700 mb-3">
                          {importResult.error}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={RefreshCw}
                          onClick={handleRetry}
                        >
                          Try Again
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supported Formats */}
      <Card>
        <CardHeader
          title="Supported File Formats"
          description="Choose the format that works best for your existing forms"
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUPPORTED_FORMATS.map((format) => (
              <div
                key={format.extension}
                className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <format.icon className={`w-6 h-6 ${format.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {format.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {format.extension}
                  </p>
                  <p className="text-xs text-gray-600">
                    {format.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">Import Tips</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• For Excel/CSV: Use the first row for field names</li>
                  <li>• For PDF/Word: Ensure text is selectable (not scanned images)</li>
                  <li>• Field types are automatically detected but can be adjusted after import</li>
                  <li>• Large files may take longer to process</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}