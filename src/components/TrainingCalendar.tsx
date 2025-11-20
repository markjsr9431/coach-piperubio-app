import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { useTheme } from '../contexts/ThemeContext'
import { db } from '../firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface TrainingCalendarProps {
  clientId: string
}

type ValuePiece = Date | null
type Value = ValuePiece | [ValuePiece, ValuePiece]

interface DayRecord {
  date: string // ISO date string (YYYY-MM-DD)
  hasLoadEffort: boolean
}

const TrainingCalendar = ({ clientId }: TrainingCalendarProps) => {
  const { theme } = useTheme()
  const [value, setValue] = useState<Value>(new Date())
  const [records, setRecords] = useState<Map<string, DayRecord>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDayData, setSelectedDayData] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!clientId) {
        setLoading(false)
        return
      }

      try {
        const recordsMap = new Map<string, DayRecord>()

        // Cargar registros de carga/esfuerzo
        try {
          const loadEffortRef = doc(db, 'clients', clientId, 'dailyRecords', 'load_effort')
          const loadEffortDoc = await getDoc(loadEffortRef)
          if (loadEffortDoc.exists()) {
            const loadEffortData = loadEffortDoc.data()
            const recordsArray = loadEffortData.records || []
            
            recordsArray.forEach((record: any) => {
              let recordDate: Date
              if (record.date) {
                if (typeof record.date === 'number') {
                  recordDate = new Date(record.date)
                } else if (record.date.toDate) {
                  recordDate = record.date.toDate()
                } else {
                  recordDate = new Date(record.date)
                }
              } else {
                return
              }
              
              const dateKey = recordDate.toISOString().split('T')[0]
              const existing = recordsMap.get(dateKey) || {
                date: dateKey,
                hasLoadEffort: false
              }
              existing.hasLoadEffort = true
              recordsMap.set(dateKey, existing)
            })
          }
        } catch (error) {
          console.error('Error loading load/effort records:', error)
        }

        setRecords(recordsMap)
      } catch (error) {
        console.error('Error loading calendar data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [clientId])

  // Función para determinar el tipo de día y su estilo
  const getDayClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return ''
    
    const dateKey = date.toISOString().split('T')[0]
    const dayRecord = records.get(dateKey)
    
    if (!dayRecord) return ''
    
    // Solo aplicar color si hay registro de carga
    if (dayRecord.hasLoadEffort) {
      return 'has-load-effort'
    }
    
    return ''
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
    >
      <Calendar
        onChange={setValue}
        value={value}
        className={`w-full border-0 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}
        tileClassName={getDayClassName}
        onClickDay={async (date) => {
          const dateKey = date.toISOString().split('T')[0]
          setSelectedDate(date)
          
          // Cargar registro de carga/esfuerzo del día
          try {
            const loadEffortRef = doc(db, 'clients', clientId, 'dailyRecords', 'load_effort')
            const loadEffortDoc = await getDoc(loadEffortRef)
            
            if (loadEffortDoc.exists()) {
              const loadEffortData = loadEffortDoc.data()
              const recordsArray = loadEffortData.records || []
              
              // Buscar registro que coincida con la fecha seleccionada
              const dayRecord = recordsArray.find((record: any) => {
                if (!record.date) return false
                
                let recordDate: Date
                if (typeof record.date === 'number') {
                  recordDate = new Date(record.date)
                } else if (record.date.toDate) {
                  recordDate = record.date.toDate()
                } else {
                  recordDate = new Date(record.date)
                }
                
                const recordDateKey = recordDate.toISOString().split('T')[0]
                return recordDateKey === dateKey
              })
              
              if (dayRecord) {
                setSelectedDayData(dayRecord)
              } else {
                setSelectedDayData(null)
              }
            } else {
              setSelectedDayData(null)
            }
          } catch (error) {
            console.error('Error loading load/effort record:', error)
            setSelectedDayData(null)
          }
        }}
        tileContent={({ date, view }) => {
          if (view !== 'month') return null
          const dateKey = date.toISOString().split('T')[0]
          const dayRecord = records.get(dateKey)
          
          if (!dayRecord || !dayRecord.hasLoadEffort) return null
          
          return (
            <div className="flex justify-center items-center gap-0.5 mt-1">
              <div 
                className="w-1.5 h-1.5 rounded-full bg-orange-500"
                title="Carga/Implementos"
              />
            </div>
          )
        }}
      />
      
      {/* Leyenda */}
      <div className={`mt-4 p-3 sm:p-4 rounded-lg ${
        theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-50'
      }`}>
        <h4 className={`text-xs sm:text-sm font-semibold mb-2 sm:mb-3 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Leyenda
        </h4>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0"></div>
            <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>
              Día con Registro de Carga/Implementos
            </span>
          </div>
        </div>
      </div>
      
      <style>{`
        .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
        }
        
        .react-calendar__tile {
          position: relative;
          padding: 0.5rem;
          height: auto;
          min-height: 3rem;
        }
        
        .react-calendar__tile--now {
          background: ${theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'};
        }
        
        .react-calendar__tile--active {
          background: ${theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'};
        }
        
        .react-calendar__tile.has-load-effort {
          background: ${theme === 'dark' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.15)'};
        }
        
        .react-calendar__tile:hover {
          background: ${theme === 'dark' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.25)'};
        }
        
        .react-calendar__navigation button {
          color: ${theme === 'dark' ? '#fff' : '#111827'};
        }
        
        .react-calendar__navigation button:hover {
          background: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
        }
        
        .react-calendar__month-view__weekdays {
          color: ${theme === 'dark' ? '#94a3b8' : '#6b7280'};
        }
        
        .react-calendar__month-view__days__day {
          color: ${theme === 'dark' ? '#e2e8f0' : '#374151'};
        }
        
        .react-calendar__month-view__days__day--neighboringMonth {
          color: ${theme === 'dark' ? '#475569' : '#9ca3af'};
        }
      `}</style>
      
      {/* Gráfico de Barras de Carga del Día Seleccionado */}
      {selectedDate && selectedDayData && selectedDayData.implementos && selectedDayData.implementos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-6 p-4 rounded-xl shadow-lg ${
            theme === 'dark' ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Carga de Implementos - {selectedDate.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </h3>
            <button
              onClick={() => {
                setSelectedDate(null)
                setSelectedDayData(null)
              }}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-slate-700 text-slate-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div style={{ height: '300px', position: 'relative' }}>
            <Bar
              data={{
                labels: selectedDayData.implementos.map((impl: any, index: number) => 
                  impl.implement || `Implemento ${index + 1}`
                ),
                datasets: [
                  {
                    label: 'Carga (kg)',
                    data: selectedDayData.implementos.map((impl: any) => {
                      // Extraer el valor numérico de la carga si es un string
                      if (typeof impl.load === 'string') {
                        const match = impl.load.match(/(\d+\.?\d*)/)
                        return match ? parseFloat(match[1]) : 0
                      }
                      return impl.load || 0
                    }),
                    backgroundColor: theme === 'dark' 
                      ? 'rgba(249, 115, 22, 0.8)' 
                      : 'rgba(249, 115, 22, 0.6)',
                    borderColor: theme === 'dark' 
                      ? 'rgba(249, 115, 22, 1)' 
                      : 'rgba(249, 115, 22, 1)',
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
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
                  }
                },
                scales: {
                  x: {
                    ticks: {
                      color: theme === 'dark' ? '#94a3b8' : '#64748b',
                      font: {
                        size: 11
                      }
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
                    },
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </motion.div>
      )}
      
      {/* Mensaje cuando no hay datos */}
      {selectedDate && (!selectedDayData || !selectedDayData.implementos || selectedDayData.implementos.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-6 p-4 rounded-xl shadow-lg ${
            theme === 'dark' ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-lg font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {selectedDate.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </h3>
            <button
              onClick={() => {
                setSelectedDate(null)
                setSelectedDayData(null)
              }}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-slate-700 text-slate-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className={`text-center py-4 ${
            theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
          }`}>
            <p className="font-medium">No hay registro de carga para esta fecha</p>
            <p className="text-xs mt-1 opacity-75">El cliente aún no ha registrado implementos para este día</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default TrainingCalendar

