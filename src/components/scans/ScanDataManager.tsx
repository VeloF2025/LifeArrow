import React, { useState, useEffect } from 'react'
import { 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Trash2, 
  RefreshCw,
  Activity,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  BarChart3,
  Settings,
  Cloud,
  Database,
  Zap,
  Shield
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ScanUploader } from './ScanUploader'
import { ScanViewer } from './ScanViewer'
import { ScanComparison } from './ScanComparison'
import { DropboxIntegration } from './DropboxIntegration'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { formatSADate } from '../../lib/utils'

interface ScanData {
  id: string
  client_id: string
  scan_date: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  automation_status: 'automated' | 'manual' | 'failed'
  path_ids: PathIDData[]
  client_info: {
    client_code: string
    first_name: string
    last_name: string
    email: string
  }
  metadata: {
    upload_source: 'manual' | 'dropbox' | 'api'
    processed_at?: string
    error_message?: string
    quality_score?: number
  }
  created_at: string
  updated_at: string
}

interface PathIDData {
  path_id: string
  value: string | number
  description?: string
  unit?: string
  reference_range?: string
  status?: 'normal' | 'high' | 'low' | 'critical'
}

interface ScanStats {
  total_scans: number
  automated_success_rate: number
  recent_uploads: number
  processing_queue: number
  storage_used: number
  unique_clients: number
}

type ViewMode = 'overview' | 'upload' | 'viewer' | 'comparison' | 'settings'

export function ScanDataManager() {
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [scans, setScans] = useState<ScanData[]>([])
  const [filteredScans, setFilteredScans] = useState<ScanData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'failed'>('all')
  const [filterSource, setFilterSource] = useState<'all' | 'manual' | 'dropbox' | 'api'>('all')
  const [selectedScans, setSelectedScans] = useState<string[]>([])
  const [stats, setStats] = useState<ScanStats | null>(null)
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null)
  const [comparisonScans, setComparisonScans] = useState<ScanData[]>([])
  const { profile } = useAuth()

  // Check if user has admin privileges
  const isAdmin = profile?.role === 'admin'
  const isStaff = profile?.role === 'staff'
  const canManageScans = isAdmin || isStaff

  useEffect(() => {
    fetchScans()
    fetchStats()
  }, [])

  useEffect(() => {
    filterScans()
  }, [scans, searchTerm, filterStatus, filterSource])

  const fetchScans = async () => {
    try {
      setLoading(true)
      
      // Build query based on user role
      let query = supabase
        .from('scans')
        .select(`
          *,
          client:clients!scans_client_id_fkey(
            client_code,
            profile:profiles!clients_profile_id_fkey(
              first_name,
              last_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false })

      // If user is a client, only show their scans
      if (profile?.role === 'client') {
        query = query.eq('client_id', profile.id)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform data to match our interface
      const transformedScans: ScanData[] = (data || []).map(scan => ({
        id: scan.id,
        client_id: scan.client_id,
        scan_date: scan.scan_date,
        file_name: scan.file_path?.split('/').pop() || 'Unknown',
        file_path: scan.file_path,
        file_type: scan.file_path?.split('.').pop()?.toUpperCase() || 'Unknown',
        file_size: 0, // Would need to be stored separately
        processing_status: scan.raw_data ? 'completed' : 'pending',
        automation_status: scan.raw_data?.automation_status || 'manual',
        path_ids: scan.raw_data?.path_ids || [],
        client_info: {
          client_code: scan.client?.client_code || '',
          first_name: scan.client?.profile?.first_name || '',
          last_name: scan.client?.profile?.last_name || '',
          email: scan.client?.profile?.email || ''
        },
        metadata: {
          upload_source: scan.raw_data?.upload_source || 'manual',
          processed_at: scan.raw_data?.processed_at,
          error_message: scan.raw_data?.error_message,
          quality_score: scan.raw_data?.quality_score
        },
        created_at: scan.created_at,
        updated_at: scan.updated_at || scan.created_at
      }))

      setScans(transformedScans)
    } catch (error) {
      console.error('Error fetching scans:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Get basic stats
      const { data: scanCount } = await supabase
        .from('scans')
        .select('id', { count: 'exact', head: true })

      const { data: recentScans } = await supabase
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      const { data: uniqueClients } = await supabase
        .from('scans')
        .select('client_id')
        .not('client_id', 'is', null)

      const uniqueClientCount = new Set(uniqueClients?.map(s => s.client_id)).size

      setStats({
        total_scans: scanCount?.length || 0,
        automated_success_rate: 95, // Would calculate from actual data
        recent_uploads: recentScans?.length || 0,
        processing_queue: 0, // Would calculate from pending scans
        storage_used: 0, // Would calculate from file sizes
        unique_clients: uniqueClientCount
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const filterScans = () => {
    let filtered = scans

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(scan =>
        scan.client_info.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scan.client_info.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scan.client_info.client_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scan.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(scan => scan.processing_status === filterStatus)
    }

    // Source filter
    if (filterSource !== 'all') {
      filtered = filtered.filter(scan => scan.metadata.upload_source === filterSource)
    }

    setFilteredScans(filtered)
  }

  const handleScanSelect = (scanId: string, selected: boolean) => {
    if (selected) {
      setSelectedScans([...selectedScans, scanId])
    } else {
      setSelectedScans(selectedScans.filter(id => id !== scanId))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedScans.length === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedScans.length} scan(s)?`)) return

    try {
      const { error } = await supabase
        .from('scans')
        .delete()
        .in('id', selectedScans)

      if (error) throw error

      await fetchScans()
      setSelectedScans([])
    } catch (error) {
      console.error('Error deleting scans:', error)
      alert('Error deleting scans. Please try again.')
    }
  }

  const handleViewScan = (scan: ScanData) => {
    setSelectedScan(scan)
    setViewMode('viewer')
  }

  const handleCompareScan = (scan: ScanData) => {
    if (comparisonScans.find(s => s.id === scan.id)) {
      setComparisonScans(comparisonScans.filter(s => s.id !== scan.id))
    } else if (comparisonScans.length < 4) {
      setComparisonScans([...comparisonScans, scan])
    }
  }

  const handleStartComparison = () => {
    if (comparisonScans.length >= 2) {
      setViewMode('comparison')
    }
  }

  const exportScans = async () => {
    try {
      const csvContent = [
        // Headers
        [
          'Scan ID', 'Client Code', 'Client Name', 'Scan Date', 'File Name',
          'File Type', 'Processing Status', 'Automation Status', 'Upload Source',
          'Path IDs Count', 'Quality Score', 'Created At'
        ].join(','),
        // Data rows
        ...filteredScans.map(scan => [
          scan.id,
          scan.client_info.client_code,
          `${scan.client_info.first_name} ${scan.client_info.last_name}`,
          formatSADate(scan.scan_date),
          scan.file_name,
          scan.file_type,
          scan.processing_status,
          scan.automation_status,
          scan.metadata.upload_source,
          scan.path_ids.length,
          scan.metadata.quality_score || 'N/A',
          formatSADate(scan.created_at)
        ].map(field => `"${field}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scan-data-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting scans:', error)
      alert('Error exporting data. Please try again.')
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Access Restriction Notice for Clients */}
      {profile?.role === 'client' && (
        <Card variant="minimal\" className="border-blue-200 bg-blue-50">
          <CardContent>
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900">Your Scan Data</h3>
                <p className="text-sm text-blue-800 mt-1">
                  You can view your personal scan results here. Scan uploads and management are handled by our wellness team.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card variant="sage" hover>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {profile?.role === 'client' ? 'Your Scans' : 'Total Scans'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_scans || 0}</p>
              </div>
              <div className="p-3 bg-wellness-sage-100 rounded-lg">
                <Activity className="w-6 h-6 text-wellness-sage-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {canManageScans && (
          <>
            <Card variant="eucalyptus" hover>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Automation Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.automated_success_rate || 0}%</p>
                  </div>
                  <div className="p-3 bg-wellness-eucalyptus-100 rounded-lg">
                    <Zap className="w-6 h-6 text-wellness-eucalyptus-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="rose" hover>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Recent Uploads</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.recent_uploads || 0}</p>
                    <p className="text-xs text-gray-500">Last 7 days</p>
                  </div>
                  <div className="p-3 bg-wellness-rose-100 rounded-lg">
                    <Upload className="w-6 h-6 text-wellness-rose-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card hover>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {profile?.role === 'client' ? 'Your Records' : 'Unique Clients'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {profile?.role === 'client' ? scans.length : stats?.unique_clients || 0}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Admin/Staff Only */}
      {canManageScans && (
        <Card>
          <CardHeader
            title="Quick Actions"
            description="Common scan management tasks"
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="primary"
                icon={Upload}
                onClick={() => setViewMode('upload')}
                className="h-20 flex-col"
              >
                <span className="mt-2">Upload Scans</span>
              </Button>
              
              <Button
                variant="outline"
                icon={Cloud}
                onClick={() => setViewMode('settings')}
                className="h-20 flex-col"
              >
                <span className="mt-2">Dropbox Sync</span>
              </Button>
              
              <Button
                variant="outline"
                icon={BarChart3}
                onClick={handleStartComparison}
                disabled={comparisonScans.length < 2}
                className="h-20 flex-col"
              >
                <span className="mt-2">Compare Scans</span>
              </Button>
              
              <Button
                variant="outline"
                icon={Download}
                onClick={exportScans}
                className="h-20 flex-col"
              >
                <span className="mt-2">Export Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Quick Actions */}
      {profile?.role === 'client' && (
        <Card>
          <CardHeader
            title="Your Scan Data"
            description="View and analyze your wellness scans"
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                icon={BarChart3}
                onClick={handleStartComparison}
                disabled={comparisonScans.length < 2}
                className="h-20 flex-col"
              >
                <span className="mt-2">Compare Your Scans</span>
              </Button>
              
              <Button
                variant="outline"
                icon={Download}
                onClick={exportScans}
                className="h-20 flex-col"
              >
                <span className="mt-2">Export Your Data</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Scans */}
      <Card>
        <CardHeader
          title={profile?.role === 'client' ? 'Your Scans' : 'Recent Scans'}
          description={profile?.role === 'client' ? 'Your wellness scan history' : 'Latest scan uploads and processing status'}
          action={
            <div className="flex items-center space-x-2">
              {comparisonScans.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartComparison}
                  disabled={comparisonScans.length < 2}
                >
                  Compare ({comparisonScans.length})
                </Button>
              )}
              {canManageScans && selectedScans.length > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={handleBulkDelete}
                >
                  Delete ({selectedScans.length})
                </Button>
              )}
            </div>
          }
        />
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder={profile?.role === 'client' ? 'Search your scans...' : 'Search scans by client name, code, or filename...'}
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
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
              
              {canManageScans && (
                <select
                  className="wellness-input"
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value as any)}
                >
                  <option value="all">All Sources</option>
                  <option value="manual">Manual Upload</option>
                  <option value="dropbox">Dropbox</option>
                  <option value="api">API</option>
                </select>
              )}
            </div>
          </div>

          {/* Scan List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-wellness-sage-600 animate-spin" />
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No scans found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all' || filterSource !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : profile?.role === 'client' 
                    ? 'No scans have been uploaded for your account yet.'
                    : 'Upload your first scan to get started.'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && filterSource === 'all' && canManageScans && (
                <Button
                  variant="primary"
                  icon={Upload}
                  onClick={() => setViewMode('upload')}
                >
                  Upload First Scan
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredScans.slice(0, 10).map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {canManageScans && (
                      <input
                        type="checkbox"
                        checked={selectedScans.includes(scan.id)}
                        onChange={(e) => handleScanSelect(scan.id, e.target.checked)}
                        className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          {profile?.role === 'client' ? 'Your Scan' : `${scan.client_info.first_name} ${scan.client_info.last_name}`}
                        </h4>
                        {profile?.role !== 'client' && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {scan.client_info.client_code}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${
                          scan.processing_status === 'completed' ? 'bg-green-100 text-green-700' :
                          scan.processing_status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {scan.processing_status}
                        </span>
                        {canManageScans && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            scan.automation_status === 'automated' ? 'bg-blue-100 text-blue-700' :
                            scan.automation_status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {scan.automation_status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>{scan.file_name}</span>
                        <span>{scan.file_type}</span>
                        <span>{formatSADate(scan.scan_date)}</span>
                        <span>{scan.path_ids.length} Path IDs</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={comparisonScans.find(s => s.id === scan.id) ? CheckCircle : BarChart3}
                      onClick={() => handleCompareScan(scan)}
                      className={comparisonScans.find(s => s.id === scan.id) ? 'text-green-600' : ''}
                      disabled={!comparisonScans.find(s => s.id === scan.id) && comparisonScans.length >= 4}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => handleViewScan(scan)}
                    />
                  </div>
                </div>
              ))}
              
              {filteredScans.length > 10 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600">
                    Showing 10 of {filteredScans.length} scans
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (viewMode) {
      case 'upload':
        // Only allow admin/staff to access upload
        if (!canManageScans) {
          return (
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                  <p className="text-gray-600">Only administrators and staff can upload scans.</p>
                  <Button
                    variant="outline"
                    onClick={() => setViewMode('overview')}
                    className="mt-4"
                  >
                    Back to Overview
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        }
        return (
          <ScanUploader
            onUploadComplete={() => {
              fetchScans()
              setViewMode('overview')
            }}
            onCancel={() => setViewMode('overview')}
          />
        )
      
      case 'viewer':
        return selectedScan ? (
          <ScanViewer
            scan={selectedScan}
            onClose={() => {
              setSelectedScan(null)
              setViewMode('overview')
            }}
          />
        ) : null
      
      case 'comparison':
        return (
          <ScanComparison
            scans={comparisonScans}
            onClose={() => {
              setComparisonScans([])
              setViewMode('overview')
            }}
          />
        )
      
      case 'settings':
        // Only allow admin to access Dropbox settings
        if (!isAdmin) {
          return (
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Access Required</h3>
                  <p className="text-gray-600">Only administrators can configure Dropbox integration.</p>
                  <Button
                    variant="outline"
                    onClick={() => setViewMode('overview')}
                    className="mt-4"
                  >
                    Back to Overview
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        }
        return (
          <DropboxIntegration
            onClose={() => setViewMode('overview')}
          />
        )
      
      default:
        return renderOverview()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {profile?.role === 'client' ? 'My Scan Data' : 'Scan Data Management'}
          </h1>
          <p className="text-gray-600 mt-1">
            {profile?.role === 'client' 
              ? 'View and analyze your wellness scan results'
              : 'Comprehensive scan import, processing, and analysis system'
            }
          </p>
        </div>
        
        {viewMode === 'overview' && canManageScans && (
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              icon={Settings}
              onClick={() => setViewMode('settings')}
            >
              Settings
            </Button>
            <Button
              variant="primary"
              icon={Upload}
              onClick={() => setViewMode('upload')}
            >
              Upload Scans
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  )
}