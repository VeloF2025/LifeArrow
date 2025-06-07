import React from 'react'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Users, Activity, Calendar, TrendingUp, Heart, Zap } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ReactNode
  color?: 'sage' | 'eucalyptus' | 'rose'
}

function MetricCard({ title, value, change, changeType, icon, color = 'sage' }: MetricCardProps) {
  const colorClasses = {
    sage: 'bg-wellness-sage-50 text-wellness-sage-600',
    eucalyptus: 'bg-wellness-eucalyptus-50 text-wellness-eucalyptus-600',
    rose: 'bg-wellness-rose-50 text-wellness-rose-600',
  }

  const changeClasses = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  }

  return (
    <Card variant="default" hover>
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
            {change && changeType && (
              <p className={`text-sm ${changeClasses[changeType]}`}>
                {change}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardOverview() {
  const { profile } = useAuth()

  const getMetrics = () => {
    switch (profile?.role) {
      case 'admin':
        return [
          {
            title: 'Total Clients',
            value: '1,247',
            change: '+12% from last month',
            changeType: 'positive' as const,
            icon: <Users className="w-6 h-6" />,
            color: 'sage' as const,
          },
          {
            title: 'Scans This Month',
            value: '89',
            change: '+8% from last month',
            changeType: 'positive' as const,
            icon: <Activity className="w-6 h-6" />,
            color: 'eucalyptus' as const,
          },
          {
            title: 'Appointments',
            value: '156',
            change: '+23% from last month',
            changeType: 'positive' as const,
            icon: <Calendar className="w-6 h-6" />,
            color: 'rose' as const,
          },
          {
            title: 'Revenue (ZAR)',
            value: 'R 245,680',
            change: '+15% from last month',
            changeType: 'positive' as const,
            icon: <TrendingUp className="w-6 h-6" />,
            color: 'sage' as const,
          },
        ]
      
      case 'staff':
        return [
          {
            title: 'My Clients',
            value: '67',
            change: '+3 new this week',
            changeType: 'positive' as const,
            icon: <Users className="w-6 h-6" />,
            color: 'sage' as const,
          },
          {
            title: 'Scans Today',
            value: '8',
            change: '2 pending review',
            changeType: 'neutral' as const,
            icon: <Activity className="w-6 h-6" />,
            color: 'eucalyptus' as const,
          },
          {
            title: 'Today\'s Appointments',
            value: '12',
            change: '3 completed',
            changeType: 'positive' as const,
            icon: <Calendar className="w-6 h-6" />,
            color: 'rose' as const,
          },
        ]
      
      case 'client':
        return [
          {
            title: 'Wellness Score',
            value: '85',
            change: '+5 points this month',
            changeType: 'positive' as const,
            icon: <Heart className="w-6 h-6" />,
            color: 'sage' as const,
          },
          {
            title: 'Total Scans',
            value: '12',
            change: 'Last scan: 3 days ago',
            changeType: 'neutral' as const,
            icon: <Activity className="w-6 h-6" />,
            color: 'eucalyptus' as const,
          },
          {
            title: 'Cellular Health',
            value: 'Excellent',
            change: 'Improving trend',
            changeType: 'positive' as const,
            icon: <Zap className="w-6 h-6" />,
            color: 'rose' as const,
          },
        ]
      
      default:
        return []
    }
  }

  const metrics = getMetrics()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {profile?.first_name}!
        </h1>
        <p className="text-gray-600">
          {profile?.role === 'client' 
            ? 'Track your wellness journey and cellular health progress.'
            : 'Here\'s what\'s happening with your wellness management today.'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Welcome Message with Cellular Inspiration */}
      <Card variant="sage" className="pastel-gradient">
        <CardHeader
          title={profile?.role === 'client' ? 'Your Wellness Journey' : 'Life Arrow Wellness Portal'}
          description={
            profile?.role === 'client'
              ? 'Optimizing your cellular health through precision wellness tracking'
              : 'Empowering transformation through cutting-edge wellness technology'
          }
        />
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="cellular-animation">
              <Zap className="w-8 h-8 text-wellness-sage-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700">
                {profile?.role === 'client'
                  ? 'Your personalized wellness insights are ready. Continue your cellular optimization journey.'
                  : 'Monitor client progress, manage appointments, and deliver exceptional wellness outcomes.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}