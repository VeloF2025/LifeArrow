import React, { useState, useEffect } from 'react'
import { 
  Cloud, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  X,
  Folder,
  File,
  Download,
  Upload,
  Zap,
  Clock,
  Database,
  Shield
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface DropboxIntegrationProps {
  onClose: () => void
}

interface DropboxConfig {
  enabled: boolean
  access_token?: string
  folder_path: string
  auto_process: boolean
  client_id_extraction: boolean
  webhook_url?: string
  last_sync?: string
  sync_status: 'connected' | 'disconnected' | 'error' | 'syncing'
}

interface MonitoredFolder {
  id: string
  path: string
  enabled: boolean
  file_count: number
  last_processed?: string
  processing_rules: {
    file_types: string[]
    auto_assign_clients: boolean
    quality_threshold: number
  }
}

interface SyncActivity {
  id: string
  timestamp: string
  action: 'file_detected' | 'file_processed' | 'client_assigned' | 'error'
  file_name: string
  status: 'success' | 'failed' | 'pending'
  details: string
}

export function DropboxIntegration({ onClose }: DropboxIntegrationProps) {
  const [config, setConfig] = useState<DropboxConfig>({
    enabled: false,
    folder_path: '/LifePath/Scans',
    auto_process: true,
    client_id_extraction: true,
    sync_status: 'disconnected'
  })
  
  const [monitoredFolders, setMonitoredFolders] = useState<MonitoredFolder[]>([
    {
      id: '1',
      path: '/LifePath/Scans/Incoming',
      enabled: true,
      file_count: 12,
      last_processed: '2024-01-15T10:30:00Z',
      processing_rules: {
        file_types: ['.xlsx', '.csv', '.pdf'],
        auto_assign_clients: true,
        quality_threshold: 80
      }
    },
    {
      id: '2',
      path: '/LifePath/Scans/Archive',
      enabled: false,
      file_count: 156,
      processing_rules: {
        file_types: ['.xlsx', '.csv'],
        auto_assign_clients: false,
        quality_threshold: 70
      }
    }
  ])
  
  const [recentActivity, setRecentActivity] = useState<SyncActivity[]>([
    {
      id: '1',
      timestamp: '2024-01-15T10:30:00Z',
      action: 'file_processed',
      file_name: 'client_scan_LA123456.xlsx',
      status: 'success',
      details: 'Automatically assigned to client LA123456, 24 Path IDs extracted'
    },
    {
      id: '2',
      timestamp: '2024-01-15T10:25:00Z',
      action: 'file_detected',
      file_name: 'scan_data_unknown.csv',
      status: 'failed',
      details: 'Client ID not found in A3 cell, manual assignment required'
    },
    {
      id: '3',
      timestamp: '2024-01-15T10:20:00Z',
      action: 'client_assigned',
      file_name: 'health_report_2024.pdf',
      status: 'success',
      details: 'Processed via OCR, assigned to client LA789012'
    }
  ])
  
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const connectDropbox = async () => {
    setConnecting(true)
    
    // Simulate OAuth flow
    try {
      // In a real implementation, this would open Dropbox OAuth
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setConfig(prev => ({
        ...prev,
        enabled: true,
        sync_status: 'connected',
        access_token: 'mock_token_' + Date.now(),
        last_sync: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Dropbox connection failed:', error)
      setConfig(prev => ({ ...prev, sync_status: 'error' }))
    } finally {
      setConnecting(false)
    }
  }

  const disconnectDropbox = () => {
    setConfig(prev => ({
      ...prev,
      enabled: false,
      sync_status: 'disconnected',
      access_token: undefined
    }))
  }

  const syncNow = async () => {
    setSyncing(true)
    
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      setConfig(prev => ({
        ...prev,
        last_sync: new Date().toISOString()
      }))
      
      // Add new activity
      const newActivity: SyncActivity = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action: 'file_processed',
        file_name: 'manual_sync_scan.xlsx',
        status: 'success',
        details: 'Manual sync completed, 3 new files processed'
      }
      
      setRecentActivity(prev => [newActivity, ...prev.slice(0, 9)])
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  const toggleFolder = (folderId: string) => {
    setMonitoredFolders(prev => prev.map(folder => 
      folder.id === folderId 
        ? { ...folder, enabled: !folder.enabled }
        : folder
    ))
  }

  const addFolder = () => {
    const newFolder: MonitoredFolder = {
      id: Date.now().toString(),
      path: '/LifePath/Scans/New_Folder',
      enabled: true,
      file_count: 0,
      processing_rules: {
        file_types: ['.xlsx', '.csv', '.pdf'],
        auto_assign_clients: true,
        quality_threshold: 80
      }
    }
    
    setMonitoredFolders(prev => [...prev, newFolder])
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'syncing':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Cloud className="w-5 h-5 text-gray-400" />
    }
  }

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'file_detected':
        return <File className="w-4 h-4 text-blue-600" />
      case 'file_processed':
        return <Zap className="w-4 h-4 text-green-600" />
      case 'client_assigned':
        return <Database className="w-4 h-4 text-purple-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dropbox Integration</h2>
          <p className="text-gray-600">Automated scan import and processing from cloud storage</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Connection Status */}
      <Card variant={config.sync_status === 'connected' ? 'sage' : 'default'}>
        <CardHeader
          title="Connection Status"
          description="Dropbox integration and sync configuration"
        />
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getStatusIcon(config.sync_status)}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {config.enabled ? 'Connected to Dropbox' : 'Not Connected'}
                </h3>
                <p className="text-sm text-gray-600">
                  {config.enabled 
                    ? `Monitoring ${monitoredFolders.filter(f => f.enabled).length} folders for new scans`
                    : 'Connect your Dropbox account to enable automated scan processing'
                  }
                </p>
                {config.last_sync && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last sync: {new Date(config.last_sync).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {config.enabled ? (
                <>
                  <Button
                    variant="outline"
                    icon={RefreshCw}
                    onClick={syncNow}
                    loading={syncing}
                    disabled={syncing}
                  >
                    Sync Now
                  </Button>
                  <Button
                    variant="outline"
                    onClick={disconnectDropbox}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  icon={Cloud}
                  onClick={connectDropbox}
                  loading={connecting}
                  disabled={connecting}
                >
                  Connect Dropbox
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          {/* Monitored Folders */}
          <Card>
            <CardHeader
              title="Monitored Folders"
              description="Configure which Dropbox folders to monitor for new scans"
              action={
                <Button
                  variant="outline"
                  icon={Folder}
                  onClick={addFolder}
                >
                  Add Folder
                </Button>
              }
            />
            <CardContent>
              <div className="space-y-4">
                {monitoredFolders.map((folder) => (
                  <div key={folder.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={folder.enabled}
                        onChange={() => toggleFolder(folder.id)}
                        className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                      />
                      <Folder className={`w-5 h-5 ${folder.enabled ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{folder.path}</h4>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>{folder.file_count} files</span>
                          <span>Types: {folder.processing_rules.file_types.join(', ')}</span>
                          <span>Quality: {folder.processing_rules.quality_threshold}%+</span>
                          {folder.last_processed && (
                            <span>Last: {new Date(folder.last_processed).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        folder.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {folder.enabled ? 'Active' : 'Inactive'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Settings}
                      >
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Processing Settings */}
          <Card>
            <CardHeader
              title="Processing Settings"
              description="Configure how scans are automatically processed"
            />
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.auto_process}
                        onChange={(e) => setConfig(prev => ({ ...prev, auto_process: e.target.checked }))}
                        className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Auto-process new files</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      
                      Automatically process files as soon as they're detected
                    </p>
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.client_id_extraction}
                        onChange={(e) => setConfig(prev => ({ ...prev, client_id_extraction: e.target.checked }))}
                        className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Extract Client ID from A3</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically extract client ID from cell A3 for assignment
                    </p>
                  </div>
                </div>

                <div>
                  <Input
                    label="Default Folder Path"
                    value={config.folder_path}
                    onChange={(e) => setConfig(prev => ({ ...prev, folder_path: e.target.value }))}
                    placeholder="/LifePath/Scans"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Advanced Settings</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced
                  </Button>
                </div>

                {showAdvanced && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <Input
                      label="Webhook URL"
                      value={config.webhook_url || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
                      placeholder="https://your-app.com/webhooks/dropbox"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Supported File Types
                        </label>
                        <div className="space-y-2">
                          {['.xlsx', '.xls', '.csv', '.pdf', '.txt', '.json'].map((type) => (
                            <label key={type} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                defaultChecked={['.xlsx', '.csv', '.pdf'].includes(type)}
                                className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                              />
                              <span className="text-sm text-gray-700">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Processing Options
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                            />
                            <span className="text-sm text-gray-700">Virus scanning</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                            />
                            <span className="text-sm text-gray-700">Duplicate detection</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="rounded border-gray-300 text-wellness-sage-600 focus:ring-wellness-sage-500"
                            />
                            <span className="text-sm text-gray-700">Quality validation</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader
              title="Recent Activity"
              description="Latest sync and processing activity"
            />
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {activity.file_name}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          activity.status === 'success' ? 'bg-green-100 text-green-700' :
                          activity.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {activity.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{activity.details}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Integration Benefits */}
      {!config.enabled && (
        <Card>
          <CardHeader
            title="Dropbox Integration Benefits"
            description="Streamline your scan management workflow"
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <Zap className="w-6 h-6 text-wellness-sage-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Automated Processing</h3>
                  <p className="text-xs text-gray-600">
                    Files are automatically processed as soon as they're uploaded to monitored folders
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Database className="w-6 h-6 text-wellness-eucalyptus-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Smart Client Assignment</h3>
                  <p className="text-xs text-gray-600">
                    Client IDs are automatically extracted from A3 cells and matched to your database
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Shield className="w-6 h-6 text-wellness-rose-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Secure & Reliable</h3>
                  <p className="text-xs text-gray-600">
                    Enterprise-grade security with automatic backup and version control
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}