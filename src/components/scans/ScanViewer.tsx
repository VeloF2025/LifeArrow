import React, { useState } from 'react'
import { 
  X, 
  Download, 
  Share2, 
  BarChart3, 
  FileText, 
  Calendar, 
  User, 
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  Edit
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { formatSADate } from '../../lib/utils'

interface ScanViewerProps {
  scan: {
    id: string
    client_id: string
    scan_date: string
    file_name: string
    file_type: string
    processing_status: string
    automation_status: string
    path_ids: Array<{
      path_id: string
      value: string | number
      description?: string
      unit?: string
      reference_range?: string
      status?: 'normal' | 'high' | 'low' | 'critical'
    }>
    client_info: {
      client_code: string
      first_name: string
      last_name: string
      email: string
    }
    metadata: {
      upload_source: string
      processed_at?: string
      quality_score?: number
      warnings?: string[]
    }
    created_at: string
  }
  onClose: () => void
}

export function ScanViewer({ scan, onClose }: ScanViewerProps) {
  const [viewMode, setViewMode] = useState<'overview' | 'pathids' | 'raw'>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'high' | 'low' | 'critical'>('all')

  const filteredPathIDs = scan.path_ids.filter(pathID => {
    const matchesSearch = !searchTerm || 
      pathID.path_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pathID.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || pathID.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'high':
        return <TrendingUp className="w-4 h-4 text-orange-600" />
      case 'low':
        return <TrendingDown className="w-4 h-4 text-blue-600" />
      case 'normal':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      default:
        return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'normal':
        return 'bg-green-50 border-green-200 text-green-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const statusCounts = scan.path_ids.reduce((acc, pathID) => {
    const status = pathID.status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const exportScanData = () => {
    const csvContent = [
      ['Path ID', 'Value', 'Unit', 'Status', 'Description', 'Reference Range'].join(','),
      ...scan.path_ids.map(pathID => [
        pathID.path_id,
        pathID.value,
        pathID.unit || '',
        pathID.status || '',
        pathID.description || '',
        pathID.reference_range || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scan-${scan.client_info.client_code}-${formatSADate(scan.scan_date)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {scan.client_info.first_name} {scan.client_info.last_name}
              </h1>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {scan.client_info.client_code}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                scan.processing_status === 'completed' ? 'bg-green-100 text-green-700' :
                scan.processing_status === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {scan.processing_status}
              </span>
            </div>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatSADate(scan.scan_date)}
              </span>
              <span className="flex items-center">
                <FileText className="w-4 h-4 mr-1" />
                {scan.file_name}
              </span>
              <span className="flex items-center">
                <Activity className="w-4 h-4 mr-1" />
                {scan.path_ids.length} Path IDs
              </span>
              {scan.metadata.quality_score && (
                <span className="flex items-center">
                  <BarChart3 className="w-4 h-4 mr-1" />
                  {scan.metadata.quality_score}% Quality
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              icon={Download}
              onClick={exportScanData}
            >
              Export
            </Button>
            <Button
              variant="outline"
              icon={Share2}
            >
              Share
            </Button>
            <Button
              variant="outline"
              icon={X}
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'overview'
                ? 'bg-wellness-sage-100 text-wellness-sage-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('pathids')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'pathids'
                ? 'bg-wellness-sage-100 text-wellness-sage-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Path IDs ({scan.path_ids.length})
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'raw'
                ? 'bg-wellness-sage-100 text-wellness-sage-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Raw Data
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === 'overview' && (
          <div className="space-y-6">
            {/* Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card variant="sage">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Path IDs</p>
                      <p className="text-2xl font-bold text-gray-900">{scan.path_ids.length}</p>
                    </div>
                    <Activity className="w-8 h-8 text-wellness-sage-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Normal</p>
                      <p className="text-2xl font-bold text-green-600">{statusCounts.normal || 0}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Abnormal</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {(statusCounts.high || 0) + (statusCounts.low || 0)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Critical</p>
                      <p className="text-2xl font-bold text-red-600">{statusCounts.critical || 0}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Warnings */}
            {scan.metadata.warnings && scan.metadata.warnings.length > 0 && (
              <Card variant="minimal" className="border-amber-200 bg-amber-50">
                <CardHeader
                  title="Processing Warnings"
                  description="Issues detected during scan processing"
                />
                <CardContent>
                  <ul className="space-y-2">
                    {scan.metadata.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Critical Values */}
            {statusCounts.critical > 0 && (
              <Card variant="minimal" className="border-red-200 bg-red-50">
                <CardHeader
                  title="Critical Values"
                  description="Path IDs requiring immediate attention"
                />
                <CardContent>
                  <div className="space-y-3">
                    {scan.path_ids
                      .filter(pathID => pathID.status === 'critical')
                      .map((pathID, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{pathID.path_id}</h4>
                              <p className="text-xs text-gray-600">{pathID.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-600">
                              {pathID.value} {pathID.unit}
                            </p>
                            {pathID.reference_range && (
                              <p className="text-xs text-gray-500">Ref: {pathID.reference_range}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scan Metadata */}
            <Card>
              <CardHeader
                title="Scan Information"
                description="Processing and upload details"
              />
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">File Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">File Name:</span>
                          <span className="text-gray-900">{scan.file_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">File Type:</span>
                          <span className="text-gray-900">{scan.file_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Upload Source:</span>
                          <span className="text-gray-900 capitalize">{scan.metadata.upload_source}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Processing Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Automation Status:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            scan.automation_status === 'automated' ? 'bg-green-100 text-green-700' :
                            scan.automation_status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {scan.automation_status}
                          </span>
                        </div>
                        {scan.metadata.processed_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Processed:</span>
                            <span className="text-gray-900">{formatSADate(scan.metadata.processed_at)}</span>
                          </div>
                        )}
                        {scan.metadata.quality_score && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Quality Score:</span>
                            <span className="text-gray-900">{scan.metadata.quality_score}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === 'pathids' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search Path IDs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="wellness-input"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="wellness-input"
                  >
                    <option value="all">All Status</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Path IDs Table */}
            <Card>
              <CardHeader
                title="Path ID Data"
                description={`${filteredPathIDs.length} of ${scan.path_ids.length} Path IDs`}
              />
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Path ID</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Value</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Unit</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPathIDs.map((pathID, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm">{pathID.path_id}</td>
                          <td className="py-3 px-4 font-semibold">{pathID.value}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{pathID.unit || '-'}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(pathID.status)}
                              <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(pathID.status)}`}>
                                {pathID.status || 'unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                            {pathID.description || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {pathID.reference_range || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredPathIDs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No Path IDs match your search criteria</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === 'raw' && (
          <Card>
            <CardHeader
              title="Raw Scan Data"
              description="Original processed data structure"
            />
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(scan, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}