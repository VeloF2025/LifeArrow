import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'staff' | 'client'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-wellness-sage-50 via-white to-wellness-eucalyptus-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-wellness-sage-200 border-t-wellness-sage-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your wellness portal...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/unauthorized\" replace />
  }

  return <>{children}</>
}