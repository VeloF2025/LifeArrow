import React, { useState, useRef, useCallback } from 'react'
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  File, 
  Image, 
  X, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Users,
  Database,
  Zap,
  Eye,
  Download,
  Search
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ScanProcessor } from '../../lib/scanProcessor'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface ScanUploaderProps {
  onUploadComplete: () => void
  onCancel: () => void
}

interface UploadFile {
  id: string
  file: File
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  result?: ProcessingResult
  error?: string
}

interface ProcessingResult {
  client_id?: string
  client_info?: {
    client_code: string
    first_name: string
    last_name: string
    email: string
  }
  path_ids: Array<{
    path_id: string
    value: string | number
    description?: string
    unit?: string
  }>
  automation_status: 'automated' | 'manual' | 'failed'
  quality_score: number
  warnings: string[]
}

interface ClientSearchResult {
  id: string
  client_code: string
  first_name: string
  last_name: string
  email: string
}

const SUPPORTED_FORMATS = [
  { ext: '.xlsx', name: 'Excel Spreadsheet', icon: FileSpreadsheet, color: 'text-green-600' },
  { ext: '.xls', name: 'Excel Legacy', icon: FileSpreadsheet, color: 'text-green-600' },
  { ext: '.csv', name: 'CSV File', icon: FileText, color: 'text-blue-600' },
  { ext: '.pdf', name: 'PDF Document', icon: File, color: 'text-red-600' },
  { ext: '.txt', name: 'Text File', icon: FileText, color: 'text-gray-600' },
  { ext: '.json', name: 'JSON Data', icon: File, color: 'text-purple-600' },
  { ext: '.jpg', name: 'JPEG Image', icon: Image, color: 'text-orange-600' },
  { ext: '.png', name: 'PNG Image', icon: Image, color: 'text-orange-600' },
  { ext: '.tiff', name: 'TIFF Image', icon: Image, color: 'text-orange-600' },
]

export function ScanUploader({ onUploadComplete, onCancel }: ScanUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [processing, setProcessing] = useState(false)
  const [showClientSearch, setShowClientSearch] = useState<string | null>(null)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [clientSearchResults, setClientSearchResults] = useState<ClientSearchResult[]>([])
  const [searchingClients, setSearchingClients] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { profile } = useAuth()

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (files: File[]) => {
    const newUploadFiles: UploadFile[] = files.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending',
      progress: 0
    }))
    
    setUploadFiles(prev => [...prev, ...newUploadFiles])
  }

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const processFiles = async () => {
    if (uploadFiles.length === 0) return
    
    setProcessing(true)
    
    for (const uploadFile of uploadFiles) {
      if (uploadFile.status !== 'pending') continue
      
      try {
        // Update status to processing
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'processing', progress: 10 }
            : f
        ))

        // Process the file
        const result = await ScanProcessor.processFile(uploadFile.file)
        
        // Update progress
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 50 }
            : f
        ))

        if (result.success && result.data) {
          // If automation failed, show client search
          if (result.data.automation_status === 'failed') {
            setShowClientSearch(uploadFile.id)
            setUploadFiles(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, status: 'failed', result: result.data, error: 'Client ID not found - manual assignment required' }
                : f
            ))
            continue
          }

          // Save to database
          await saveScanToDatabase(uploadFile, result.data)
          
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'completed', progress: 100, result: result.data }
              : f
          ))
        } else {
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'failed', error: result.error || 'Processing failed' }
              : f
          ))
        }
      } catch (error) {
        console.error('Error processing file:', error)
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
            : f
        ))
      }
    }
    
    setProcessing(false)
  }

  const saveScanToDatabase = async (uploadFile: UploadFile, result: ProcessingResult) => {
    try {
      // Upload file to storage (simplified - would use actual file storage)
      const filePath = `scans/${result.client_id}/${uploadFile.file.name}`
      
      // Create scan record
      const { error } = await supabase
        .from('scans')
        .insert({
          client_id: result.client_id,
          scan_date: new Date().toISOString(),
          file_path: filePath,
          raw_data: {
            path_ids: result.path_ids,
            automation_status: result.automation_status,
            upload_source: 'manual',
            processed_at: new Date().toISOString(),
            quality_score: result.quality_score,
            warnings: result.warnings,
            file_metadata: {
              name: uploadFile.file.name,
              size: uploadFile.file.size,
              type: uploadFile.file.type
            }
          }
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving scan to database:', error)
      throw error
    }
  }

  const searchClients = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setClientSearchResults([])
      return
    }

    setSearchingClients(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          client_code,
          profile:profiles!clients_profile_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .or(`client_code.ilike.%${searchTerm}%,profile.first_name.ilike.%${searchTerm}%,profile.last_name.ilike.%${searchTerm}%,profile.email.ilike.%${searchTerm}%`)
        .limit(10)

      if (error) throw error

      const results: ClientSearchResult[] = (data || []).map(client => ({
        id: client.id,
        client_code: client.client_code,
        first_name: client.profile?.first_name || '',
        last_name: client.profile?.last_name || '',
        email: client.profile?.email || ''
      }))

      setClientSearchResults(results)
    } catch (error) {
      console.error('Error searching clients:', error)
    } finally {
      setSearchingClients(false)
    }
  }

  const assignClientToScan = async (fileId: string, clientId: string) => {
    const uploadFile = uploadFiles.find(f => f.id === fileId)
    if (!uploadFile || !uploadFile.result) return

    try {
      const client = clientSearchResults.find(c => c.id === clientId)
      if (!client) return

      const updatedResult = {
        ...uploadFile.result,
        client_id: clientId,
        client_info: {
          client_code: client.client_code,
          first_name: client.first_name,
          last_name: client.last_name,
          email: client.email
        },
        automation_status: 'manual' as const
      }

      // Save to database
      await saveScanToDatabase(uploadFile, updatedResult)

      // Update file status
      setUploadFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'completed', progress: 100, result: updatedResult }
          : f
      ))

      setShowClientSearch(null)
      setClientSearchTerm('')
      setClientSearchResults([])
    } catch (error) {
      console.error('Error assigning client:', error)
      alert('Error assigning client. Please try again.')
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = '.' + fileName.split('.').pop()?.toLowerCase()
    const format = SUPPORTED_FORMATS.find(f => f.ext === ext)
    return format ? format.icon : File
  }

  const getFileColor = (fileName: string) => {
    const ext = '.' + fileName.split('.').pop()?.toLowerCase()
    const format = SUPPORTED_FORMATS.find(f => f.ext === ext)
    return format ? format.color : 'text-gray-600'
  }

  const allCompleted = uploadFiles.length > 0 && uploadFiles.every(f => f.status === 'completed')
  const hasFailures = uploadFiles.some(f => f.status === 'failed')

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Upload Scan Files</h2>
          <p className="text-gray-600">Upload and process scan data with automated client association</p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent>
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
              multiple
              accept=".xlsx,.xls,.csv,.pdf,.txt,.json,.jpg,.jpeg,.png,.tiff"
              onChange={handleFileInput}
              className="hidden"
            />
            
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop scan files here or click to browse
            </h3>
            <p className="text-gray-600 mb-4">
              Supports Excel, CSV, PDF, images, and more
            </p>
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
            >
              Choose Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Supported Formats */}
      <Card>
        <CardHeader
          title="Supported File Formats"
          description="Automated processing capabilities for each format"
        />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SUPPORTED_FORMATS.map((format) => (
              <div key={format.ext} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                <format.icon className={`w-5 h-5 ${format.color}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{format.name}</p>
                  <p className="text-xs text-gray-500">{format.ext}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardHeader
            title="Upload Queue"
            description={`${uploadFiles.length} file(s) ready for processing`}
            action={
              <div className="flex items-center space-x-2">
                {allCompleted && (
                  <Button
                    variant="primary"
                    onClick={onUploadComplete}
                  >
                    Complete
                  </Button>
                )}
                {!processing && !allCompleted && (
                  <Button
                    variant="primary"
                    icon={Zap}
                    onClick={processFiles}
                    disabled={uploadFiles.length === 0}
                  >
                    Process Files
                  </Button>
                )}
              </div>
            }
          />
          <CardContent>
            <div className="space-y-4">
              {uploadFiles.map((uploadFile) => {
                const FileIcon = getFileIcon(uploadFile.file.name)
                const fileColor = getFileColor(uploadFile.file.name)
                
                return (
                  <div key={uploadFile.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <FileIcon className={`w-6 h-6 ${fileColor} flex-shrink-0 mt-1`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {uploadFile.file.name}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded ${
                              uploadFile.status === 'completed' ? 'bg-green-100 text-green-700' :
                              uploadFile.status === 'failed' ? 'bg-red-100 text-red-700' :
                              uploadFile.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {uploadFile.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>{(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span>{uploadFile.file.type || 'Unknown type'}</span>
                          </div>

                          {/* Progress Bar */}
                          {uploadFile.status === 'processing' && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-wellness-sage-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadFile.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Results */}
                          {uploadFile.result && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="font-medium text-gray-700">Client:</span>
                                  <p className="text-gray-600">
                                    {uploadFile.result.client_info 
                                      ? `${uploadFile.result.client_info.first_name} ${uploadFile.result.client_info.last_name} (${uploadFile.result.client_info.client_code})`
                                      : 'Not assigned'
                                    }
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Path IDs:</span>
                                  <p className="text-gray-600">{uploadFile.result.path_ids.length} extracted</p>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Quality:</span>
                                  <p className="text-gray-600">{uploadFile.result.quality_score}%</p>
                                </div>
                              </div>
                              
                              {uploadFile.result.warnings.length > 0 && (
                                <div className="mt-2">
                                  <span className="font-medium text-amber-700 text-xs">Warnings:</span>
                                  <ul className="text-xs text-amber-600 list-disc list-inside">
                                    {uploadFile.result.warnings.map((warning, index) => (
                                      <li key={index}>{warning}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Error Message */}
                          {uploadFile.error && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              {uploadFile.error}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {uploadFile.status === 'processing' && (
                          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                        )}
                        {uploadFile.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {uploadFile.status === 'failed' && uploadFile.result && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Users}
                            onClick={() => setShowClientSearch(uploadFile.id)}
                          >
                            Assign Client
                          </Button>
                        )}
                        {uploadFile.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={X}
                            onClick={() => removeFile(uploadFile.id)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Search Modal */}
      {showClientSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader
              title="Assign Client"
              description="Search and select the client for this scan"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => {
                    setShowClientSearch(null)
                    setClientSearchTerm('')
                    setClientSearchResults([])
                  }}
                />
              }
            />
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Search by client code, name, or email..."
                  icon={Search}
                  value={clientSearchTerm}
                  onChange={(e) => {
                    setClientSearchTerm(e.target.value)
                    searchClients(e.target.value)
                  }}
                />
                
                {searchingClients && (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-5 h-5 text-wellness-sage-600 animate-spin" />
                  </div>
                )}
                
                {clientSearchResults.length > 0 && (
                  <div className="space-y-2">
                    {clientSearchResults.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => assignClientToScan(showClientSearch, client.id)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-wellness-sage-300 hover:bg-wellness-sage-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {client.first_name} {client.last_name}
                            </h4>
                            <p className="text-xs text-gray-600">
                              {client.client_code} • {client.email}
                            </p>
                          </div>
                          <Users className="w-4 h-4 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {clientSearchTerm && !searchingClients && clientSearchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No clients found matching "{clientSearchTerm}"</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}