import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
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

        // Cargar todos los documentos de progreso usando getDocs (más eficiente)
        const progressCollectionRef = collection(db, 'clients', clientId, 'progress')
        const progressSnapshot = await getDocs(progressCollectionRef)
        
        progressSnapshot.forEach((progressDoc) => {
          // Ignorar el documento 'summary'
          if (progressDoc.id === 'summary') return
          
          // Extraer el número del día del ID (formato: "day-1", "day-2", etc.)
          const dayMatch = progressDoc.id.match(/^day-(\d+)$/)
          if (!dayMatch) return
          
          const dayIndex = parseInt(dayMatch[1])
          if (dayIndex < 1 || dayIndex > 30) return
          
          const data = progressDoc.data()
          const completedAt = data.completedAt?.toDate 
            ? data.completedAt.toDate() 
            : data.completedAt 
            ? new Date(data.completedAt) 
            : null
          
          // Solo incluir días que realmente se entrenaron (con completedAt)
          if (completedAt) {
            progressArray.push({
              dayIndex,
              date: completedAt,
              progress: data.progress || 0,
              workoutDuration: data.workoutDuration || undefined,
              completedExercises: data.completedExercises || 0,
              totalExercises: data.totalExercises || 0
            })
          }
        })

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

  // Calcular estadísticas
  const calculateStats = () => {
    if (progressData.length === 0) {
      return {
        totalDays: 0,
        currentStreak: 0,
        bestStreak: 0,
        workoutDates: [] as Date[]
      }
    }

    const workoutDates = progressData.map(item => {
      const date = new Date(item.date)
      date.setHours(0, 0, 0, 0)
      return date
    })

    // Calcular racha actual (días seguidos desde la fecha más reciente)
    let currentStreak = 0
    if (workoutDates.length > 0) {
      const sortedDates = [...workoutDates].sort((a, b) => b.getTime() - a.getTime())
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      let checkDate = new Date(today)
      for (let i = 0; i < sortedDates.length; i++) {
        const workoutDate = sortedDates[i]
        if (workoutDate.getTime() === checkDate.getTime()) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else if (i === 0) {
          // Si el último entrenamiento no es hoy, no hay racha
          break
        } else {
          break
        }
      }
    }

    // Calcular mejor racha
    let bestStreak = 0
    if (workoutDates.length > 0) {
      const sortedDates = [...workoutDates].sort((a, b) => a.getTime() - b.getTime())
      let streak = 1
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1])
        const currDate = new Date(sortedDates[i])
        prevDate.setDate(prevDate.getDate() + 1)
        prevDate.setHours(0, 0, 0, 0)
        currDate.setHours(0, 0, 0, 0)
        
        if (prevDate.getTime() === currDate.getTime()) {
          streak++
        } else {
          bestStreak = Math.max(bestStreak, streak)
          streak = 1
        }
      }
      bestStreak = Math.max(bestStreak, streak)
    }

    return {
      totalDays: progressData.length,
      currentStreak,
      bestStreak,
      workoutDates: workoutDates.sort((a, b) => b.getTime() - a.getTime())
    }
  }

  const stats = calculateStats()

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
        <div className="max-w-6xl mx-auto">
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
            <h1 className={`text-2xl sm:text-4xl font-bold mb-2 ${
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

          {/* Estadísticas */}
          {progressData.length > 0 && (
            <div className={`mb-6 p-6 rounded-xl ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/50'
            }`}>
              <h2 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Estadísticas de Entrenamiento
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                }`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Total de Días Entrenados
                  </p>
                  <p className={`text-xl sm:text-2xl font-bold mt-1 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stats.totalDays}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                }`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Racha Actual
                  </p>
                  <p className={`text-xl sm:text-2xl font-bold mt-1 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stats.currentStreak} {stats.currentStreak === 1 ? 'día' : 'días'}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                }`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Mejor Racha
                  </p>
                  <p className={`text-xl sm:text-2xl font-bold mt-1 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stats.bestStreak} {stats.bestStreak === 1 ? 'día' : 'días'}
                  </p>
                </div>
              </div>
              {stats.workoutDates.length > 0 && (
                <div className="mt-4">
                  <p className={`text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Días que entrenó:
                  </p>
                  <div className={`flex flex-wrap gap-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {stats.workoutDates.slice(0, 10).map((date, index) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded text-xs ${
                          theme === 'dark' ? 'bg-slate-600' : 'bg-gray-200'
                        }`}
                      >
                        {date.toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    ))}
                    {stats.workoutDates.length > 10 && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        theme === 'dark' ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-700'
                      }`}>
                        +{stats.workoutDates.length - 10} más
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
            <h2 className={`text-lg sm:text-xl font-bold mb-3 sm:mb-4 ${
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
                <h2 className={`text-lg sm:text-xl font-bold mb-3 sm:mb-4 ${
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
        </div>
      </div>
    </div>
  )
}

export default ProgressChartsPage

