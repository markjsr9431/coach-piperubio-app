import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { useTheme } from '../contexts/ThemeContext'
import { db } from '../firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [dayLoadEffort, setDayLoadEffort] = useState<any>(null)

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
                setDayLoadEffort(dayRecord)
              } else {
                setDayLoadEffort(null)
              }
            } else {
              setDayLoadEffort(null)
            }
            
            setShowLoadModal(true)
          } catch (error) {
            console.error('Error loading load/effort record:', error)
            setDayLoadEffort(null)
            setShowLoadModal(true)
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
      
      {/* Modal de Detalles de Carga */}
      <AnimatePresence>
        {showLoadModal && selectedDate && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowLoadModal(false)}
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
                  onClick={() => setShowLoadModal(false)}
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
                {dayLoadEffort ? (
                  <div className={`p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-orange-50 border border-orange-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className={`font-semibold text-lg ${
                        theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                      }`}>
                        Registro de Carga/Implementos
                      </span>
                    </div>
                    {dayLoadEffort.implementos && dayLoadEffort.implementos.length > 0 ? (
                      <div className="space-y-3">
                        <div>
                          <span className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                          }`}>
                            Implementos utilizados:
                          </span>
                          <div className="mt-3 space-y-2">
                            {dayLoadEffort.implementos.map((impl: any, index: number) => (
                              <div key={index} className={`p-3 rounded-lg border ${
                                theme === 'dark' ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-gray-200'
                              }`}>
                                <div className={`font-semibold text-base mb-1 ${
                                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {impl.implement || 'Implemento'}
                                </div>
                                {impl.load && (
                                  <div className={`text-sm ${
                                    theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                                  }`}>
                                    <span className="font-medium">Carga:</span> {impl.load}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        {dayLoadEffort.date && (
                          <div className={`text-xs pt-2 border-t ${
                            theme === 'dark' ? 'text-slate-400 border-slate-600' : 'text-gray-500 border-gray-300'
                          }`}>
                            <span className="font-medium">Registrado el:</span>{' '}
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
                    ) : (
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                      }`}>
                        No hay implementos registrados para este día
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`text-center py-8 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    <div className="mb-2">
                      <svg className="w-12 h-12 mx-auto text-orange-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="font-medium">No hay registro de carga para esta fecha</p>
                    <p className="text-xs mt-1 opacity-75">El cliente aún no ha registrado implementos para este día</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default TrainingCalendar

