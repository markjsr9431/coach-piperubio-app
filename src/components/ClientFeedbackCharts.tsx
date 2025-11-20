import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { db } from '../firebaseConfig'
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface ClientFeedbackChartsProps {
  clientId: string
}

interface FeedbackData {
  date: Date
  rpe: number
  mood: number
}

const ClientFeedbackCharts = ({ clientId }: ClientFeedbackChartsProps) => {
  const { theme } = useTheme()
  const [feedbackData, setFeedbackData] = useState<FeedbackData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '1year' | 'all'>('3months')
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')

  useEffect(() => {
    if (!clientId) return

    const loadFeedback = async () => {
      try {
        setLoading(true)
        const feedbackRef = collection(db, 'dailyFeedback')
        
        // Calcular fecha de inicio basada en timeRange
        let startDate: Date | null = null
        if (timeRange !== 'all') {
          const now = new Date()
          switch (timeRange) {
            case '3months':
              startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
              break
            case '6months':
              startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
              break
            case '1year':
              startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
              break
          }
        }
        
        // Construir query con filtro de fecha si aplica
        let q
        if (startDate) {
          const startTimestamp = Timestamp.fromDate(startDate)
          q = query(
            feedbackRef,
            where('clientId', '==', clientId),
            where('date', '>=', startTimestamp),
            orderBy('date', 'asc')
          )
        } else {
          q = query(
            feedbackRef,
            where('clientId', '==', clientId),
            orderBy('date', 'asc')
          )
        }
        
        const snapshot = await getDocs(q)
        
        const feedbackList: FeedbackData[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          const date = data.date?.toDate 
            ? data.date.toDate() 
            : data.date 
            ? new Date(data.date) 
            : null
          
          if (date && data.rpe && data.mood) {
            feedbackList.push({
              date,
              rpe: data.rpe || 0,
              mood: data.mood || 0
            })
          }
        })

        setFeedbackData(feedbackList)
      } catch (error) {
        console.error('Error loading feedback data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFeedback()
  }, [clientId, timeRange])

  // Formatear fecha para el eje X
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  }

  // Configuración común para las gráficas
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: theme === 'dark' ? '#e2e8f0' : '#1e293b',
        bodyColor: theme === 'dark' ? '#e2e8f0' : '#1e293b',
        borderColor: theme === 'dark' ? '#475569' : '#cbd5e1',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex
            const date = processedData[index]?.date
            return date ? date.toLocaleDateString('es-ES', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric' 
            }) : ''
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: theme === 'dark' ? '#94a3b8' : '#64748b',
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 45
        },
        grid: {
          color: theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)'
        }
      },
      y: {
        ticks: {
          color: theme === 'dark' ? '#94a3b8' : '#64748b',
          font: {
            size: 11
          }
        },
        grid: {
          color: theme === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)'
        }
      }
    }
  }

  // Procesar datos según groupBy
  const processData = (data: FeedbackData[]): FeedbackData[] => {
    if (groupBy === 'day') {
      return data
    }
    
    // Agrupar por semana o mes
    const grouped = new Map<string, { rpe: number[], mood: number[], date: Date }>()
    
    data.forEach(item => {
      let key: string
      if (groupBy === 'week') {
        const weekStart = new Date(item.date)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else { // month
        key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, { rpe: [], mood: [], date: item.date })
      }
      
      const group = grouped.get(key)!
      group.rpe.push(item.rpe)
      group.mood.push(item.mood)
    })
    
    // Calcular promedios
    return Array.from(grouped.values()).map(group => ({
      date: group.date,
      rpe: Math.round((group.rpe.reduce((a, b) => a + b, 0) / group.rpe.length) * 10) / 10,
      mood: Math.round((group.mood.reduce((a, b) => a + b, 0) / group.mood.length) * 10) / 10
    })).sort((a, b) => a.date.getTime() - b.date.getTime())
  }
  
  const processedData = processData(feedbackData)

  // Datos para gráfica de RPE
  const rpeChartData = {
    labels: processedData.map(item => formatDate(item.date)),
    datasets: [
      {
        label: 'RPE (Sensación de Esfuerzo)',
        data: processedData.map(item => item.rpe),
        borderColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
        backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
        pointBorderColor: theme === 'dark' ? '#1e40af' : '#1e3a8a'
      }
    ]
  }

  // Datos para gráfica de Ánimo
  const moodChartData = {
    labels: processedData.map(item => formatDate(item.date)),
    datasets: [
      {
        label: 'Estado de Ánimo',
        data: processedData.map(item => item.mood),
        borderColor: theme === 'dark' ? '#10b981' : '#059669',
        backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(5, 150, 105, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: theme === 'dark' ? '#10b981' : '#059669',
        pointBorderColor: theme === 'dark' ? '#047857' : '#047857'
      }
    ]
  }

  // Opciones específicas para RPE (escala 1-10)
  const rpeChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        min: 1,
        max: 10,
        ticks: {
          ...chartOptions.scales.y.ticks,
          stepSize: 1
        }
      }
    },
    plugins: {
      ...chartOptions.plugins,
      title: {
        display: true,
        text: 'Evolución de Sensación de Esfuerzo (RPE)',
        color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      }
    }
  }

  // Opciones específicas para Mood (escala 1-5)
  const moodChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        min: 1,
        max: 5,
        ticks: {
          ...chartOptions.scales.y.ticks,
          stepSize: 1
        }
      }
    },
    plugins: {
      ...chartOptions.plugins,
      title: {
        display: true,
        text: 'Evolución de Estado de Ánimo',
        color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      }
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${
        theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
      }`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p>Cargando datos de feedback...</p>
        </div>
      </div>
    )
  }

  if (feedbackData.length === 0) {
    return (
      <div className={`text-center py-12 rounded-lg ${
        theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
      }`}>
        <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
          No hay datos de feedback registrados aún
        </p>
        <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
          Los datos de RPE y Estado de Ánimo aparecerán aquí una vez que el cliente comience a registrar su feedback diario
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Filtros */}
      <div className={`p-4 rounded-lg flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${
        theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-white/50 border border-gray-200'
      }`}>
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Filtro de Rango de Tiempo */}
          <div className="flex items-center gap-2">
            <label className={`text-sm font-semibold whitespace-nowrap ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Rango de Tiempo:
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
              }`}
            >
              <option value="3months">Últimos 3 Meses</option>
              <option value="6months">Últimos 6 Meses</option>
              <option value="1year">Todo el Año</option>
              <option value="all">Todo el Historial</option>
            </select>
          </div>
          
          {/* Filtro de Agrupación */}
          <div className="flex items-center gap-2">
            <label className={`text-sm font-semibold whitespace-nowrap ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Agrupación:
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
              }`}
            >
              <option value="day">Ver por Día</option>
              <option value="week">Ver Promedio Semanal</option>
              <option value="month">Ver Promedio Mensual</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Gráfica de RPE */}
      <div className={`p-4 rounded-lg ${
        theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-white/50 border border-gray-200'
      }`}>
        <div style={{ height: '300px', position: 'relative' }}>
          <Line data={rpeChartData} options={rpeChartOptions} />
        </div>
      </div>

      {/* Gráfica de Estado de Ánimo */}
      <div className={`p-4 rounded-lg ${
        theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-white/50 border border-gray-200'
      }`}>
        <div style={{ height: '300px', position: 'relative' }}>
          <Line data={moodChartData} options={moodChartOptions} />
        </div>
      </div>
    </div>
  )
}

export default ClientFeedbackCharts

