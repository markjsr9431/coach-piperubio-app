import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebaseConfig'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import TopBanner from '../components/TopBanner'

interface ProgressData {
  dayIndex: number
  date: Date
  progress: number
  workoutDuration?: number
  completedExercises: number
  totalExercises: number
}

const ProgressChartsPage = () => {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { user } = useAuth()
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'
  
  const [progressData, setProgressData] = useState<ProgressData[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'completed' | 'time' | 'progress'>('all')

  useEffect(() => {
    if (!clientId || !isCoach) {
      navigate('/home')
      return
    }

    const loadProgress = async () => {
      try {
        setLoading(true)
        const progressArray: ProgressData[] = []

        // Cargar todos los documentos de progreso
        for (let i = 1; i <= 30; i++) {
          try {
            const progressRef = doc(db, 'clients', clientId, 'progress', `day-${i}`)
            const progressDoc = await getDoc(progressRef)
            
            if (progressDoc.exists()) {
              const data = progressDoc.data()
              const completedAt = data.completedAt?.toDate 
                ? data.completedAt.toDate() 
                : data.completedAt 
                ? new Date(data.completedAt) 
                : null
              
              if (completedAt) {
                progressArray.push({
                  dayIndex: i,
                  date: completedAt,
                  progress: data.progress || 0,
                  workoutDuration: data.workoutDuration || undefined,
                  completedExercises: data.completedExercises || 0,
                  totalExercises: data.totalExercises || 0
                })
              }
            }
          } catch (error) {
            // Continuar si hay error en un día específico
          }
        }

        // Ordenar por fecha
        progressArray.sort((a, b) => a.date.getTime() - b.date.getTime())
        setProgressData(progressArray)
      } catch (error) {
        console.error('Error loading progress:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [clientId, isCoach, navigate])

  const filteredData = progressData.filter(item => {
    // Filtro por fecha
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom)
      fromDate.setHours(0, 0, 0, 0)
      if (item.date < fromDate) return false
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999)
      if (item.date > toDate) return false
    }
    
    // Filtro por tipo
    if (filterType === 'completed') {
      return item.progress === 100
    } else if (filterType === 'time') {
      return item.workoutDuration !== undefined
    } else if (filterType === 'progress') {
      return item.progress > 0 && item.progress < 100
    }
    
    return true
  })

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seg`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (remainingSeconds === 0) {
      return `${minutes} min`
    }
    return `${minutes} min ${remainingSeconds} seg`
  }

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${
        theme === 'dark' 
          ? 'from-slate-900 via-slate-800 to-slate-900' 
          : 'from-gray-50 via-gray-100 to-gray-200'
      }`}>
        <TopBanner />
        <div className="h-40 sm:h-48"></div>
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
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
      <div className="h-40 sm:h-48"></div>

      <div className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(`/client/${clientId}/profile`)}
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
            <h1 className={`text-4xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Gráficas de Progreso
            </h1>
            <p className={`text-lg ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Visualiza el progreso del cliente en tiempo real
            </p>
          </div>

          {/* Filtros */}
          <div className={`mb-6 p-6 rounded-xl ${
            theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/50'
          }`}>
            <h2 className={`text-lg font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Filtros
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Desde
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Hasta
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Tipo de Dato
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                >
                  <option value="all">Todos</option>
                  <option value="completed">Días Completados</option>
                  <option value="time">Tiempo de Entrenamiento</option>
                  <option value="progress">Progreso Parcial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de Datos */}
          <div className={`rounded-xl p-6 shadow-lg ${
            theme === 'dark' 
              ? 'bg-slate-800/80 border border-slate-700' 
              : 'bg-white border border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Datos de Progreso ({filteredData.length} registros)
            </h2>

            {filteredData.length === 0 ? (
              <div className={`text-center py-12 rounded-lg ${
                theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
              }`}>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  No hay datos de progreso para mostrar con los filtros seleccionados
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${
                      theme === 'dark' ? 'border-slate-700' : 'border-gray-300'
                    }`}>
                      <th className={`text-left py-3 px-4 font-semibold ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Día
                      </th>
                      <th className={`text-left py-3 px-4 font-semibold ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Fecha
                      </th>
                      <th className={`text-left py-3 px-4 font-semibold ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Progreso
                      </th>
                      <th className={`text-left py-3 px-4 font-semibold ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Tiempo
                      </th>
                      <th className={`text-left py-3 px-4 font-semibold ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Ejercicios
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => (
                      <tr
                        key={index}
                        className={`border-b ${
                          theme === 'dark' ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-gray-200 hover:bg-gray-50'
                        } transition-colors`}
                      >
                        <td className={`py-3 px-4 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          Día {item.dayIndex}
                        </td>
                        <td className={`py-3 px-4 ${
                          theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          {item.date.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-24 h-2 rounded-full overflow-hidden ${
                              theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'
                            }`}>
                              <div
                                className={`h-full transition-all ${
                                  item.progress === 100 
                                    ? 'bg-green-500' 
                                    : 'bg-primary-600'
                                }`}
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <span className={`text-sm font-semibold ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {Math.round(item.progress)}%
                            </span>
                          </div>
                        </td>
                        <td className={`py-3 px-4 ${
                          theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          {item.workoutDuration ? formatDuration(item.workoutDuration) : '-'}
                        </td>
                        <td className={`py-3 px-4 ${
                          theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          {item.completedExercises} / {item.totalExercises}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Gráfico de Barras Simple */}
            {filteredData.length > 0 && (
              <div className="mt-8">
                <h2 className={`text-xl font-bold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Progreso Visual
                </h2>
                <div className="space-y-2">
                  {filteredData.slice(-10).map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`w-16 text-sm font-semibold ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Día {item.dayIndex}
                      </div>
                      <div className="flex-1">
                        <div className={`w-full h-6 rounded-full overflow-hidden ${
                          theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'
                        }`}>
                          <div
                            className={`h-full transition-all ${
                              item.progress === 100 
                                ? 'bg-green-500' 
                                : 'bg-primary-600'
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className={`w-20 text-sm text-right ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {Math.round(item.progress)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ProgressChartsPage

