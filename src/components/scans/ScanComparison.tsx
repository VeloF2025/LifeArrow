import React, { useState } from 'react'
import { 
  X, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Download,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { formatSADate } from '../../lib/utils'

interface ScanComparisonProps {
  scans: Array<{
    id: string
    client_id: string
    scan_date: string
    file_name: string
    path_ids: Array<{
      path_id: string
      value: string | number
      description?: string
      unit?: string
      status?: 'normal' | 'high' | 'low' | 'critical'
    }>
    client_info: {
      client_code: string
      first_name: string
      last_name: string
      email: string
    }
    created_at: string
  }>
  onClose: () => void
}

interface ComparisonData {
  path_id: string
  description?: string
  unit?: string
  values: Array<{
    scan_id: string
    scan_date: string
    value: string | number
    status?: string
    change?: {
      type: 'increase' | 'decrease' | 'stable'
      percentage?: number
      absolute?: number
    }
  }>
}

export function ScanComparison({ scans, onClose }: ScanComparisonProps) {
  const [viewMode, setViewMode] = useState<'table' | 'trends' | 'changes'>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyChanges, setShowOnlyChanges] = useState(false)

  // Sort scans by date
  const sortedScans = [...scans].sort((a, b) => new Date(a.scan_date).getTime() - new Date(b.scan_date).getTime())

  // Get all unique Path IDs across all scans
  const allPathIDs = new Set<string>()
  scans.forEach(scan => {
    scan.path_ids.forEach(pathID => {
      allPathIDs.add(pathID.path_id)
    })
  })

  // Build comparison data
  const comparisonData: ComparisonData[] = Array.from(allPathIDs).map(pathID => {
    const values = sortedScans.map(scan => {
      const pathIDData = scan.path_ids.find(p => p.path_id === pathID)
      return {
        scan_id: scan.id,
        scan_date: scan.scan_date,
        value: pathIDData?.value || '-',
        status: pathIDData?.status
      }
    })

    // Calculate changes between consecutive scans
    const valuesWithChanges = values.map((value, index) => {
      if (index === 0) return value

      const currentValue = typeof value.value === 'number' ? value.value : parseFloat(value.value?.toString() || '0')
      const previousValue = typeof values[index - 1].value === 'number' 
        ? values[index - 1].value 
        : parseFloat(values[index - 1].value?.toString() || '0')

      if (!isNaN(currentValue) && !isNaN(previousValue) && previousValue !== 0) {
        const absolute = currentValue - previousValue
        const percentage = (absolute / previousValue) * 100
        
        return {
          ...value,
          change: {
            type: absolute > 0 ? 'increase' as const : absolute < 0 ? 'decrease' as const : 'stable' as const,
            percentage: Math.abs(percentage),
            absolute: Math.abs(absolute)
          }
        }
      }

      return value
    })

    // Get description and unit from first available scan
    const firstPathIDData = scans.flatMap(s => s.path_ids).find(p => p.path_id === pathID)

    return {
      path_id: pathID,
      description: firstPathIDData?.description,
      unit: firstPathIDData?.unit,
      values: valuesWithChanges
    }
  })

  // Filter comparison data
  const filteredData = comparisonData.filter(data => {
    const matchesSearch = !searchTerm || 
      data.path_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const hasChanges = !showOnlyChanges || 
      data.values.some(v => v.change && v.change.type !== 'stable')

    return matchesSearch && hasChanges
  })

  const getChangeIcon = (change?: { type: 'increase' | 'decrease' | 'stable' }) => {
    if (!change) return <Minus className="w-4 h-4 text-gray-400" />
    
    switch (change.type) {
      case 'increase':
        return <ArrowUp className="w-4 h-4 text-red-600" />
      case 'decrease':
        return <ArrowDown className="w-4 h-4 text-blue-600" />
      default:
        return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getChangeColor = (change?: { type: 'increase' | 'decrease' | 'stable' }) => {
    if (!change) return 'text-gray-600'
    
    switch (change.type) {
      case 'increase':
        return 'text-red-600'
      case 'decrease':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const exportComparison = () => {
    const headers = ['Path ID', 'Description', 'Unit', ...sortedScans.map(scan => formatSADate(scan.scan_date))]
    const rows = filteredData.map(data => [
      data.path_id,
      data.description || '',
      data.unit || '',
      ...data.values.map(v => v.value.toString())
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scan-comparison-${scans[0].client_info.client_code}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const significantChanges = comparisonData.filter(data => 
    data.values.some(v => v.change && v.change.percentage && v.change.percentage > 20)
  )

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scan Comparison</h1>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center">
                <Activity className="w-4 h-4 mr-1" />
                {scans.length} scans
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatSADate(sortedScans[0]?.scan_date)} - {formatSADate(sortedScans[sortedScans.length - 1]?.scan_date)}
              </span>
              <span>
                {scans[0]?.client_info.first_name} {scans[0]?.client_info.last_name} ({scans[0]?.client_info.client_code})
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              icon={Download}
              onClick={exportComparison}
            >
              Export
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
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'table'
                ? 'bg-wellness-sage-100 text-wellness-sage-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Comparison Table
          </button>
          <button
            onClick={() => setViewMode('trends')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'trends'
                ? 'bg-wellness-sage-100 text-wellness-sage-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Trends
          </button>
          <button
            onClick={() => setViewMode('changes')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'changes'
                ? 'bg-wellness-sage-100 text-wellness-sage-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Significant Changes ({significantChanges.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === 'table' && (
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
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showOnlyChanges}
                      onChange={(e) => setShowOnlyChanges(e.target.checked)}
                      className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                    />
                    <span className="text-sm text-gray-700">Show only changed values</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Table */}
            <Card>
              <CardHeader
                title="Path ID Comparison"
                description={`${filteredData.length} Path IDs across ${scans.length} scans`}
              />
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 sticky left-0 bg-white">Path ID</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Unit</th>
                        {sortedScans.map((scan, index) => (
                          <th key={scan.id} className="text-center py-3 px-4 font-medium text-gray-700 min-w-32">
                            <div>
                              <div className="text-xs text-gray-500">Scan {index + 1}</div>
                              <div>{formatSADate(scan.scan_date)}</div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((data, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm sticky left-0 bg-white border-r border-gray-100">
                            {data.path_id}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                            {data.description || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {data.unit || '-'}
                          </td>
                          {data.values.map((value, valueIndex) => (
                            <td key={valueIndex} className="py-3 px-4 text-center">
                              <div className="flex flex-col items-center space-y-1">
                                <span className="font-semibold">
                                  {value.value}
                                </span>
                                {value.change && (
                                  <div className={`flex items-center space-x-1 text-xs ${getChangeColor(value.change)}`}>
                                    {getChangeIcon(value.change)}
                                    <span>
                                      {value.change.percentage ? `${value.change.percentage.toFixed(1)}%` : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p>No Path IDs match your search criteria</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === 'trends' && (
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Trend Analysis"
                description="Visual representation of Path ID changes over time"
              />
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Trend Visualization</h3>
                  <p>Interactive charts and trend analysis coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === 'changes' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="rose">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Significant Increases</p>
                      <p className="text-2xl font-bold text-red-600">
                        {comparisonData.filter(d => 
                          d.values.some(v => v.change?.type === 'increase' && v.change.percentage && v.change.percentage > 20)
                        ).length}
                      </p>
                    </div>
                    <ArrowUp className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card variant="eucalyptus">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Significant Decreases</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {comparisonData.filter(d => 
                          d.values.some(v => v.change?.type === 'decrease' && v.change.percentage && v.change.percentage > 20)
                        ).length}
                      </p>
                    </div>
                    <ArrowDown className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Stable Values</p>
                      <p className="text-2xl font-bold text-gray-600">
                        {comparisonData.filter(d => 
                          !d.values.some(v => v.change && v.change.percentage && v.change.percentage > 20)
                        ).length}
                      </p>
                    </div>
                    <Minus className="w-8 h-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Significant Changes List */}
            <Card>
              <CardHeader
                title="Significant Changes"
                description="Path IDs with changes greater than 20%"
              />
              <CardContent>
                {significantChanges.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No significant changes detected between scans</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {significantChanges.map((data, index) => {
                      const significantValue = data.values.find(v => 
                        v.change && v.change.percentage && v.change.percentage > 20
                      )
                      
                      if (!significantValue?.change) return null

                      return (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <h4 className="text-sm font-medium text-gray-900">{data.path_id}</h4>
                                <span className={`flex items-center space-x-1 text-sm ${getChangeColor(significantValue.change)}`}>
                                  {getChangeIcon(significantValue.change)}
                                  <span className="font-semibold">
                                    {significantValue.change.percentage?.toFixed(1)}%
                                  </span>
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{data.description}</p>
                              
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span>Latest: {significantValue.value} {data.unit}</span>
                                <span>Date: {formatSADate(significantValue.scan_date)}</span>
                                {significantValue.change.absolute && (
                                  <span>
                                    Change: {significantValue.change.type === 'increase' ? '+' : '-'}
                                    {significantValue.change.absolute.toFixed(2)} {data.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {significantValue.change.percentage && significantValue.change.percentage > 50 && (
                              <AlertTriangle className="w-5 h-5 text-amber-600" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}