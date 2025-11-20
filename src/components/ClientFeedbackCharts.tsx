import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { db } from '../firebaseConfig'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
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

  useEffect(() => {
    if (!clientId) return

    const loadFeedback = async () => {
      try {
        setLoading(true)
        const feedbackRef = collection(db, 'dailyFeedback')
        const q = query(
          feedbackRef,
          where('clientId', '==', clientId),
          orderBy('date', 'asc')
        )
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
  }, [clientId])

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
            const date = feedbackData[index]?.date
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

  // Datos para gráfica de RPE
  const rpeChartData = {
    labels: feedbackData.map(item => formatDate(item.date)),
    datasets: [
      {
        label: 'RPE (Sensación de Esfuerzo)',
        data: feedbackData.map(item => item.rpe),
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
    labels: feedbackData.map(item => formatDate(item.date)),
    datasets: [
      {
        label: 'Estado de Ánimo',
        data: feedbackData.map(item => item.mood),
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

