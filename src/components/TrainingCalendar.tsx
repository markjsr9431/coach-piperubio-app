import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { useTheme } from '../contexts/ThemeContext'
import { db } from '../firebaseConfig'
import { doc, getDoc, collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'

interface TrainingCalendarProps {
  clientId: string
}

type ValuePiece = Date | null
type Value = ValuePiece | [ValuePiece, ValuePiece]

interface DayRecord {
  date: string // ISO date string (YYYY-MM-DD)
  hasWorkout: boolean
  hasFeedback: boolean
  hasLoadEffort: boolean
}

const TrainingCalendar = ({ clientId }: TrainingCalendarProps) => {
  const { theme } = useTheme()
  const [value, setValue] = useState<Value>(new Date())
  const [records, setRecords] = useState<Map<string, DayRecord>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [dayFeedback, setDayFeedback] = useState<any>(null)
  const [dayLoadEffort, setDayLoadEffort] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!clientId) {
        setLoading(false)
        return
      }

      try {
        const recordsMap = new Map<string, DayRecord>()

        // 1. Cargar entrenamientos desde progress/summary
        try {
          const progressRef = doc(db, 'clients', clientId, 'progress', 'summary')
          const progressDoc = await getDoc(progressRef)
          if (progressDoc.exists()) {
            const progressData = progressDoc.data()
            const dailyProgress = progressData.dailyProgress || {}
            
            Object.keys(dailyProgress).forEach((dateKey) => {
              if (dailyProgress[dateKey] === true) {
                const existing = recordsMap.get(dateKey) || {
                  date: dateKey,
                  hasWorkout: false,
                  hasFeedback: false,
                  hasLoadEffort: false
                }
                existing.hasWorkout = true
                recordsMap.set(dateKey, existing)
              }
            })
          }
        } catch (error) {
          console.error('Error loading workout progress:', error)
        }

        // 2. Cargar feedback diario desde Firestore
        try {
          const feedbackRef = collection(db, 'dailyFeedback')
          const feedbackQuery = query(
            feedbackRef,
            where('clientId', '==', clientId),
            orderBy('date', 'asc')
          )
          const feedbackSnapshot = await getDocs(feedbackQuery)
          
          feedbackSnapshot.forEach((feedbackDoc) => {
            const feedbackData = feedbackDoc.data()
            let dateKey: string
            
            // Extraer fecha del feedback
            if (feedbackData.date) {
              if (feedbackData.date.toDate) {
                const feedbackDate = feedbackData.date.toDate()
                dateKey = feedbackDate.toISOString().split('T')[0]
              } else if (feedbackData.date instanceof Timestamp) {
                const feedbackDate = feedbackData.date.toDate()
                dateKey = feedbackDate.toISOString().split('T')[0]
              } else {
                const feedbackDate = new Date(feedbackData.date)
                dateKey = feedbackDate.toISOString().split('T')[0]
              }
            } else {
              return // Si no hay fecha, saltar este documento
            }
            
            const existing = recordsMap.get(dateKey) || {
              date: dateKey,
              hasWorkout: false,
              hasFeedback: false,
              hasLoadEffort: false
            }
            // Marcar como feedback Y como entrenamiento
            existing.hasFeedback = true
            existing.hasWorkout = true
            recordsMap.set(dateKey, existing)
          })
        } catch (error) {
          console.error('Error loading feedback data:', error)
        }

        // 3. Cargar registros de carga/esfuerzo
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
                hasWorkout: false,
                hasFeedback: false,
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
    
    const classes: string[] = []
    
    // Determinar qué tipo de registro tiene
    const recordCount = [
      dayRecord.hasWorkout,
      dayRecord.hasFeedback,
      dayRecord.hasLoadEffort
    ].filter(Boolean).length
    
    if (recordCount === 1) {
      if (dayRecord.hasWorkout) classes.push('has-workout')
      if (dayRecord.hasFeedback) classes.push('has-feedback')
      if (dayRecord.hasLoadEffort) classes.push('has-load-effort')
    } else if (recordCount > 1) {
      classes.push('has-multiple')
    }
    
    return classes.join(' ')
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
          const dayRecord = records.get(dateKey)
          
          if (!dayRecord) return
          
          setSelectedDate(date)
          
          // Cargar feedback del día si existe
          try {
            const dayStart = new Date(date)
            dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(date)
            dayEnd.setHours(23, 59, 59, 999)
            
            const dayStartTimestamp = Timestamp.fromDate(dayStart)
            const dayEndTimestamp = Timestamp.fromDate(dayEnd)
            
            // Cargar feedback diario
            const feedbackRef = collection(db, 'dailyFeedback')
            const feedbackQuery = query(
              feedbackRef,
              where('clientId', '==', clientId),
              where('date', '>=', dayStartTimestamp),
              where('date', '<=', dayEndTimestamp)
            )
            const feedbackSnapshot = await getDocs(feedbackQuery)
            
            if (!feedbackSnapshot.empty) {
              const feedbackDoc = feedbackSnapshot.docs[0]
              setDayFeedback({
                id: feedbackDoc.id,
                ...feedbackDoc.data()
              })
            } else {
              setDayFeedback(null)
            }
            
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
                  setDayLoadEffort(dayRecord)
                } else {
                  setDayLoadEffort(null)
                }
              } else {
                setDayLoadEffort(null)
              }
            } catch (error) {
              console.error('Error loading load/effort record:', error)
              setDayLoadEffort(null)
            }
            
            setShowFeedbackModal(true)
          } catch (error) {
            console.error('Error loading day feedback:', error)
            setDayFeedback(null)
            setDayLoadEffort(null)
            setShowFeedbackModal(true)
          }
        }}
        tileContent={({ date, view }) => {
          if (view !== 'month') return null
          const dateKey = date.toISOString().split('T')[0]
          const dayRecord = records.get(dateKey)
          
          if (!dayRecord) return null
          
          return (
            <div className="flex justify-center items-center gap-0.5 mt-1">
              {dayRecord.hasWorkout && (
                <div 
                  className="w-1.5 h-1.5 rounded-full bg-blue-500"
                  title="Entrenamiento"
                />
              )}
              {dayRecord.hasFeedback && (
                <div 
                  className="w-1.5 h-1.5 rounded-full bg-green-500"
                  title="Encuesta"
                />
              )}
              {dayRecord.hasLoadEffort && (
                <div 
                  className="w-1.5 h-1.5 rounded-full bg-orange-500"
                  title="Carga/Esfuerzo"
                />
              )}
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
            <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
            <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>
              Entrenamiento
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></div>
            <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>
              Encuesta
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0"></div>
            <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>
              Carga/Esfuerzo
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
        
        .react-calendar__tile.has-workout {
          background: ${theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)'};
        }
        
        .react-calendar__tile.has-feedback {
          background: ${theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.15)'};
        }
        
        .react-calendar__tile.has-load-effort {
          background: ${theme === 'dark' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.15)'};
        }
        
        .react-calendar__tile.has-multiple {
          background: ${theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.15)'};
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
      
      {/* Modal de Detalles del Día */}
      <AnimatePresence>
        {showFeedbackModal && selectedDate && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowFeedbackModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl shadow-2xl ${
                theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
              } p-6`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {selectedDate.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </h3>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-slate-700 text-slate-300' 
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {(() => {
                  const dateKey = selectedDate.toISOString().split('T')[0]
                  const dayRecord = records.get(dateKey)
                  
                  return (
                    <>
                      {dayRecord?.hasWorkout && (
                        <div className={`p-4 rounded-lg ${
                          theme === 'dark' ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-blue-50 border border-blue-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className={`font-semibold ${
                              theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                            }`}>
                              Entrenamiento completado
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {dayLoadEffort ? (
                        <div className={`p-4 rounded-lg ${
                          theme === 'dark' ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-orange-50 border border-orange-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className={`font-semibold ${
                              theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                            }`}>
                              Registro de Carga/Esfuerzo
                            </span>
                          </div>
                          <div className="space-y-3">
                            {dayLoadEffort.implementos && dayLoadEffort.implementos.length > 0 && (
                              <div>
                                <span className={`text-sm font-medium ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                }`}>
                                  Implementos utilizados:
                                </span>
                                <div className="mt-2 space-y-2">
                                  {dayLoadEffort.implementos.map((impl: any, index: number) => (
                                    <div key={index} className={`p-2 rounded ${
                                      theme === 'dark' ? 'bg-slate-700/50' : 'bg-white'
                                    }`}>
                                      <div className={`font-semibold ${
                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                      }`}>
                                        {impl.implement || 'Implemento'}
                                      </div>
                                      {impl.load && (
                                        <div className={`text-sm ${
                                          theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                                        }`}>
                                          Carga: {impl.load}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {dayLoadEffort.date && (
                              <div className={`text-xs ${
                                theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                              }`}>
                                {(() => {
                                  let recordDate: Date
                                  if (typeof dayLoadEffort.date === 'number') {
                                    recordDate = new Date(dayLoadEffort.date)
                                  } else if (dayLoadEffort.date.toDate) {
                                    recordDate = dayLoadEffort.date.toDate()
                                  } else {
                                    recordDate = new Date(dayLoadEffort.date)
                                  }
                                  return recordDate.toLocaleString('es-ES', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : dayRecord?.hasLoadEffort ? (
                        <div className={`p-4 rounded-lg ${
                          theme === 'dark' ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-orange-50 border border-orange-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className={`font-semibold ${
                              theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                            }`}>
                              Registro de Carga/Esfuerzo (sin detalles disponibles)
                            </span>
                          </div>
                        </div>
                      ) : null}
                      
                      {dayFeedback ? (
                        <div className={`p-4 rounded-lg ${
                          theme === 'dark' ? 'bg-green-500/20 border border-green-500/50' : 'bg-green-50 border border-green-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className={`font-semibold ${
                              theme === 'dark' ? 'text-green-300' : 'text-green-700'
                            }`}>
                              Retroalimentación del Día
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className={`text-sm font-medium ${
                                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                              }`}>
                                Sensación de Esfuerzo (RPE):{' '}
                              </span>
                              <span className={`font-bold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                                {dayFeedback.rpe}/10
                              </span>
                            </div>
                            <div>
                              <span className={`text-sm font-medium ${
                                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                              }`}>
                                Estado de Ánimo: {' '}
                              </span>
                              <span className="text-2xl">
                                {dayFeedback.mood === 1 ? '😢' : 
                                 dayFeedback.mood === 2 ? '😕' : 
                                 dayFeedback.mood === 3 ? '😐' : 
                                 dayFeedback.mood === 4 ? '🙂' : 
                                 dayFeedback.mood === 5 ? '😄' : '😐'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : dayRecord?.hasFeedback ? (
                        <div className={`p-4 rounded-lg ${
                          theme === 'dark' ? 'bg-green-500/20 border border-green-500/50' : 'bg-green-50 border border-green-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className={`font-semibold ${
                              theme === 'dark' ? 'text-green-300' : 'text-green-700'
                            }`}>
                              Encuesta registrada (sin detalles disponibles)
                            </span>
                          </div>
                        </div>
                      ) : null}
                      
                      {!dayRecord && (
                        <div className={`text-center py-4 ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          No hay actividad registrada para este día
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default TrainingCalendar

