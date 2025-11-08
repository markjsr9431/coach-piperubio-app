import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { TimerProvider } from './contexts/TimerContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import WorkoutPage from './pages/WorkoutPage'
import LoginPage from './pages/Login'

// Componente para proteger rutas que requieren autenticación
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/workout/:day" 
        element={
          <ProtectedRoute>
            <WorkoutPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TimerProvider>
            <Router>
              <AppRoutes />
            </Router>
          </TimerProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App

