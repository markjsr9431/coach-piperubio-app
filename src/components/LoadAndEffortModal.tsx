import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { db } from '../firebaseConfig'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

interface LoadAndEffortModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
}

interface ImplementEntry {
  id: string
  implement: string
  load: string
}

interface DailyRecord {
  id: string
  date: number
  implementos: Array<{ implement: string, load: string }>
}

const LoadAndEffortModal = ({ isOpen, onClose, clientId }: LoadAndEffortModalProps) => {
  const { theme } = useTheme()
  const [saving, setSaving] = useState(false)
  const [hasRecordToday, setHasRecordToday] = useState(false)
  const [loading, setLoading] = useState(true)
  const [implementos, setImplementos] = useState<ImplementEntry[]>([])

  const implementOptions = [
    'Mancuerna',
    'Barra',
    'Kettlebell',
    'Máquina',
    'Peso Corporal',
    'Bandas de Resistencia',
    'Otro'
  ]

  // Verificar si ya existe un registro para hoy
  useEffect(() => {
    if (!isOpen || !clientId) return

    const checkTodayRecord = async () => {
      setLoading(true)
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayTimestamp = today.getTime()

        const recordsRef = doc(db, 'clients', clientId, 'dailyRecords', 'load_effort')
        const recordsDoc = await getDoc(recordsRef)

        if (recordsDoc.exists()) {
          const data = recordsDoc.data()
          const records: DailyRecord[] = data.records || []
          
          // Verificar si hay un registro para hoy
          const todayRecord = records.find(record => {
            const recordDate = new Date(record.date)
            recordDate.setHours(0, 0, 0, 0)
            return recordDate.getTime() === todayTimestamp
          })

          setHasRecordToday(!!todayRecord)
        } else {
          setHasRecordToday(false)
        }
      } catch (error) {
        console.error('Error checking today record:', error)
        setHasRecordToday(false)
      } finally {
        setLoading(false)
      }
    }

    checkTodayRecord()
  }, [isOpen, clientId])

  const handleAddImplement = () => {
    const newImplement: ImplementEntry = {
      id: Date.now().toString(),
      implement: '',
      load: ''
    }
    setImplementos(prev => [...prev, newImplement])
  }

  const handleRemoveImplement = (id: string) => {
    setImplementos(prev => prev.filter(imp => imp.id !== id))
  }

  const handleImplementChange = (id: string, field: 'implement' | 'load', value: string) => {
    setImplementos(prev => prev.map(imp => 
      imp.id === id ? { ...imp, [field]: value } : imp
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (hasRecordToday) {
      return
    }

    // Validar que al menos un implemento tenga ambos campos completos
    const validImplementos = implementos.filter(imp => imp.implement && imp.load)
    if (validImplementos.length === 0) {
      alert('Por favor agrega al menos un implemento con su carga')
      return
    }

    setSaving(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTimestamp = today.getTime()

      const recordsRef = doc(db, 'clients', clientId, 'dailyRecords', 'load_effort')
      const recordsDoc = await getDoc(recordsRef)

      const existingRecords: DailyRecord[] = recordsDoc.exists() 
        ? (recordsDoc.data().records || [])
        : []

      const newRecord: DailyRecord = {
        id: Date.now().toString(),
        date: todayTimestamp,
        implementos: validImplementos.map(imp => ({
          implement: imp.implement,
          load: imp.load
        }))
      }

      const updatedRecords = [...existingRecords, newRecord]

      await setDoc(recordsRef, {
        records: updatedRecords,
        lastUpdated: serverTimestamp()
      }, { merge: true })

      // Resetear formulario
      setImplementos([])
      setHasRecordToday(true)
      alert('Registro guardado exitosamente')
    } catch (error) {
      console.error('Error saving record:', error)
      alert('Error al guardar el registro. Por favor intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`${
            theme === 'dark' ? 'bg-slate-800' : 'bg-white'
          } rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
          }`}>
            <h2 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Registro de Carga y Esfuerzo
            </h2>
            <button
              onClick={onClose}
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

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : hasRecordToday ? (
              <div className={`text-center py-12 rounded-xl ${
                theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
              }`}>
                <div className={`text-6xl mb-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                  ✓
                </div>
                <p className={`text-xl font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Registro del día completado
                </p>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                }`}>
                  Ya has registrado tu carga y esfuerzo para hoy. Solo puedes registrar uno por día.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Sección: Registro de Carga */}
                <div className={`rounded-xl p-6 ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Registro de Carga
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddImplement}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                        theme === 'dark'
                          ? 'bg-primary-600 hover:bg-primary-700 text-white'
                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                      }`}
                    >
                      + Agregar Implemento
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {implementos.length === 0 ? (
                      <p className={`text-sm text-center py-4 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                      }`}>
                        Haz clic en "+ Agregar Implemento" para comenzar
                      </p>
                    ) : (
                      implementos.map((imp, index) => (
                        <div key={imp.id} className={`p-4 rounded-lg border ${
                          theme === 'dark' ? 'bg-slate-800/50 border-slate-600' : 'bg-white border-gray-300'
                        }`}>
                          <div className="flex items-start justify-between mb-3">
                            <span className={`text-sm font-semibold ${
                              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                            }`}>
                              Implemento {index + 1}
                            </span>
                            {implementos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveImplement(imp.id)}
                                className={`p-1 rounded transition-colors ${
                                  theme === 'dark'
                                    ? 'hover:bg-slate-700 text-red-400'
                                    : 'hover:bg-gray-100 text-red-600'
                                }`}
                                aria-label="Eliminar implemento"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            {/* Tipo de Implemento */}
                            <div>
                              <label className={`block text-xs font-semibold mb-1.5 ${
                                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                              }`}>
                                Tipo de Implemento <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={imp.implement}
                                onChange={(e) => handleImplementChange(imp.id, 'implement', e.target.value)}
                                required
                                className={`w-full px-3 py-2 rounded-lg border transition-colors text-sm ${
                                  theme === 'dark'
                                    ? 'bg-slate-800 border-slate-600 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                                    : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                                }`}
                              >
                                <option value="">Selecciona un implemento</option>
                                {implementOptions.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </div>

                            {/* Carga en Kg */}
                            <div>
                              <label className={`block text-xs font-semibold mb-1.5 ${
                                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                              }`}>
                                Carga (Kg) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                value={imp.load}
                                onChange={(e) => handleImplementChange(imp.id, 'load', e.target.value)}
                                required
                                min="0"
                                step="0.1"
                                placeholder="Ej: 50.5"
                                className={`w-full px-3 py-2 rounded-lg border transition-colors text-sm ${
                                  theme === 'dark'
                                    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || implementos.filter(imp => imp.implement && imp.load).length === 0}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      saving || implementos.filter(imp => imp.implement && imp.load).length === 0
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {saving ? 'Guardando...' : 'Guardar Registro'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default LoadAndEffortModal

