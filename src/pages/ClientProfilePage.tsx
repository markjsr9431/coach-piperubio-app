import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import TopBanner from '../components/TopBanner'
import ClientInfoSection from '../components/ClientInfoSection'
import TrainingCalendar from '../components/TrainingCalendar'
import ClientFeedbackCharts from '../components/ClientFeedbackCharts'
import RMAndPRSection from '../components/RMAndPRSection'

const ClientProfilePage = () => {
  const navigate = useNavigate()
  const { clientId } = useParams<{ clientId: string }>()
  const { theme } = useTheme()
  const { user } = useAuth()
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'
  const [exportFunction, setExportFunction] = useState<(() => Promise<void>) | null>(null)
  const [activeTab, setActiveTab] = useState<'informacion' | 'analisis'>('informacion')

  if (!clientId) {
    return null
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">No tienes permisos para acceder a esta página</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${
      theme === 'dark' 
        ? 'from-slate-900 via-slate-800 to-slate-900' 
        : 'from-gray-50 via-gray-100 to-gray-200'
    }`}>
      <TopBanner />
      <div className="h-20 sm:h-24"></div>

      <div className="pt-6 pb-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/home')}
              className={`mb-4 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>
            <div className="flex items-center justify-between mb-2">
              <h1 className={`text-2xl sm:text-4xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Información del Cliente
              </h1>
              {exportFunction && (
                <button
                  onClick={exportFunction}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar información
                </button>
              )}
            </div>
            <p className={`text-lg ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Gestiona la información personal y la fotografía de perfil
            </p>
          </div>

          {/* Sistema de Pestañas */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 border-b border-slate-700/50 dark:border-gray-300/50">
              <button
                onClick={() => setActiveTab('informacion')}
                className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
                  activeTab === 'informacion'
                    ? theme === 'dark'
                      ? 'text-primary-400 border-primary-400'
                      : 'text-primary-600 border-primary-600'
                    : theme === 'dark'
                    ? 'text-slate-400 border-transparent hover:text-slate-300'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                Información General
              </button>
              <button
                onClick={() => setActiveTab('analisis')}
                className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
                  activeTab === 'analisis'
                    ? theme === 'dark'
                      ? 'text-primary-400 border-primary-400'
                      : 'text-primary-600 border-primary-600'
                    : theme === 'dark'
                    ? 'text-slate-400 border-transparent hover:text-slate-300'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                Análisis de Rendimiento
              </button>
            </div>
          </div>

          {/* Contenido de Pestañas */}
          {activeTab === 'informacion' && (
            <div className="space-y-6">
              {/* Componente compartido de información del cliente */}
              {clientId && (
                <ClientInfoSection
                  clientId={clientId}
                  showSaveButtons={true}
                  onExportReady={(exportFn) => setExportFunction(() => exportFn)}
                />
              )}
              
              {/* Calendario de Actividad */}
              {clientId && isCoach && (
                <div className={`p-4 rounded-xl shadow-lg ${
                  theme === 'dark' 
                    ? 'bg-slate-800/80 border border-slate-700' 
                    : 'bg-white border border-gray-200'
                }`}>
                  <h2 className={`text-lg sm:text-xl font-bold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Calendario de Actividad
                  </h2>
                  <TrainingCalendar clientId={clientId} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'analisis' && (
            <div className="space-y-6">
              {/* Gráficas de Feedback */}
              {isCoach && clientId && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`p-6 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700' 
                      : 'bg-white/50 border-gray-200'
                  }`}
                >
                  <div className="mb-6">
                    <h2 className={`text-xl font-bold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Análisis de Feedback
                    </h2>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                    }`}>
                      Evolución de Sensación de Esfuerzo (RPE) y Estado de Ánimo
                    </p>
                  </div>
                  <ClientFeedbackCharts clientId={clientId} />
                </motion.div>
              )}

              {/* RM y PR */}
              {isCoach && clientId && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`p-6 rounded-xl border ${
                    theme === 'dark' 
                      ? 'bg-slate-800/50 border-slate-700' 
                      : 'bg-white/50 border-gray-200'
                  }`}
                >
                  <h2 className={`text-xl font-bold mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Repetición Máxima (RM) y Récords Personales (PR)
                  </h2>
                  <RMAndPRSection clientId={clientId} isCoach={isCoach} />
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default ClientProfilePage

