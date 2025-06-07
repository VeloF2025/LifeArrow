import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/auth/AuthProvider'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ClientOnboarding } from './pages/ClientOnboarding'
import { ClientManagement } from './pages/ClientManagement'
import { ClientProfile } from './pages/ClientProfile'
import { Settings } from './pages/Settings'
import { ScanDataManagement } from './pages/ScanDataManagement'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <ClientOnboarding />
            </ProtectedRoute>
          } />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/clients"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <ClientManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <ProtectedRoute requiredRole="client">
                <Layout>
                  <ClientProfile />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/scans"
            element={
              <ProtectedRoute>
                <Layout>
                  <ScanDataManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking System</h2>
                    <p className="text-gray-600">Coming soon...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/passport"
            element={
              <ProtectedRoute requiredRole="client">
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Wellness Passport</h2>
                    <p className="text-gray-600">Your digital wellness journey documentation</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/dashboard\" replace />} />
          
          <Route
            path="/unauthorized"
            element={
              <div className="min-h-screen bg-gradient-to-br from-wellness-sage-50 via-white to-wellness-eucalyptus-50 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Unauthorized</h1>
                  <p className="text-gray-600 mb-8">You don't have permission to access this page.</p>
                  <button
                    onClick={() => window.history.back()}
                    className="wellness-button wellness-button-primary"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App