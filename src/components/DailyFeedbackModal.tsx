import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { db } from '../firebaseConfig'
import { collection, addDoc, getDocs, query, where, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore'

interface DailyFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
}

const DailyFeedbackModal = ({ isOpen, onClose, clientId }: DailyFeedbackModalProps) => {
  const { theme } = useTheme()
  const [rpe, setRpe] = useState(5)
  const [mood, setMood] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingFeedbackId, setExistingFeedbackId] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  const moodOptions = [
    { value: 1, emoji: '😢', label: 'Muy mal' },
    { value: 2, emoji: '😕', label: 'Mal' },
    { value: 3, emoji: '😐', label: 'Regular' },
    { value: 4, emoji: '😊', label: 'Bien' },
    { value: 5, emoji: '😄', label: 'Muy bien' }
  ]

  // Cargar feedback existente del día actual cuando se abre el modal
  useEffect(() => {
    if (!isOpen || !clientId) {
      setExistingFeedbackId(null)
      setIsSaved(false)
      setRpe(5)
      setMood(null)
      return
    }

    const loadTodayFeedback = async () => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayTimestamp = Timestamp.fromDate(today)

        const feedbackRef = collection(db, 'dailyFeedback')
        const q = query(
          feedbackRef,
          where('clientId', '==', clientId),
          where('date', '==', todayTimestamp)
        )
        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
          const feedbackDoc = snapshot.docs[0]
          const data = feedbackDoc.data()
          setExistingFeedbackId(feedbackDoc.id)
          setRpe(data.rpe || 5)
          setMood(data.mood || null)
          setIsSaved(true) // Ya está guardado, no editable
        } else {
          setExistingFeedbackId(null)
          setIsSaved(false)
        }
      } catch (error) {
        console.error('Error loading today feedback:', error)
        setExistingFeedbackId(null)
        setIsSaved(false)
      }
    }

    loadTodayFeedback()
  }, [isOpen, clientId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mood === null) {
      setError('Por favor selecciona tu estado de ánimo')
      return
    }

    if (rpe < 1 || rpe > 10) {
      setError('El RPE debe estar entre 1 y 10')
      return
    }

    setSaving(true)
    try {
      // Crear timestamp del día de hoy (inicio del día, sin horas)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTimestamp = Timestamp.fromDate(today)

      if (existingFeedbackId && !isSaved) {
        // Actualizar feedback existente (solo si aún no se ha guardado definitivamente)
        const feedbackRef = doc(db, 'dailyFeedback', existingFeedbackId)
        await updateDoc(feedbackRef, {
          rpe,
          mood,
          updatedAt: serverTimestamp()
        })
      } else if (!existingFeedbackId) {
        // Crear nuevo feedback
        await addDoc(collection(db, 'dailyFeedback'), {
          clientId,
          rpe,
          mood,
          date: todayTimestamp,
          createdAt: serverTimestamp()
        })
      }

      // Marcar como guardado
      setIsSaved(true)
      
      // Cerrar modal
      onClose()
      
      // Mostrar mensaje de éxito
      alert('Feedback guardado exitosamente')
    } catch (error: any) {
      console.error('Error saving feedback:', error)
      setError('Error al guardar el feedback. Por favor intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      setRpe(5)
      setMood(null)
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md rounded-xl shadow-2xl ${
            theme === 'dark' 
              ? 'bg-slate-800 border border-slate-700' 
              : 'bg-white border border-gray-200'
          }`}
        >
          {/* Header */}
          <div className={`p-4 sm:p-6 border-b ${
            theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-xl sm:text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Feedback Diario
              </h2>
              <button
                onClick={handleClose}
                disabled={saving}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-slate-700 text-slate-300'
                    : 'hover:bg-gray-100 text-gray-600'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className={`text-sm mt-2 ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
            }`}>
              Comparte cómo te sientes hoy
            </p>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {/* RPE - Sensación de Esfuerzo */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                Sensación de Esfuerzo (RPE) <span className="text-red-500">*</span>
              </label>
              
              {/* Slider */}
              <div className="mb-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rpe}
                  onChange={(e) => setRpe(Number(e.target.value))}
                  disabled={isSaved}
                  className={`w-full h-2 bg-gray-200 rounded-lg appearance-none accent-primary-600 ${
                    isSaved ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                  style={{
                    background: `linear-gradient(to right, ${
                      theme === 'dark' ? '#3b82f6' : '#2563eb'
                    } 0%, ${
                      theme === 'dark' ? '#3b82f6' : '#2563eb'
                    } ${((rpe - 1) / 9) * 100}%, ${
                      theme === 'dark' ? '#475569' : '#e5e7eb'
                    } ${((rpe - 1) / 9) * 100}%, ${
                      theme === 'dark' ? '#475569' : '#e5e7eb'
                    } 100%)`
                  }}
                />
              </div>

              {/* Valor actual */}
              <div className="flex items-center justify-between">
                <span className={`text-xs ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  Muy fácil
                </span>
                <div className={`text-2xl font-bold px-4 py-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-primary-600/20 text-primary-400' 
                    : 'bg-primary-100 text-primary-700'
                }`}>
                  {rpe}
                </div>
                <span className={`text-xs ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  Muy difícil
                </span>
              </div>
            </div>

            {/* Estado de Ánimo */}
            <div>
              <label className={`block text-sm font-semibold mb-3 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                Estado de Ánimo <span className="text-red-500">*</span>
              </label>
              
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {moodOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !isSaved && setMood(option.value)}
                    disabled={isSaved}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg transition-all min-h-[60px] sm:min-h-[80px] ${
                      mood === option.value
                        ? theme === 'dark'
                          ? 'bg-primary-600 text-white scale-105'
                          : 'bg-primary-600 text-white scale-105'
                        : theme === 'dark'
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    } ${isSaved ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="text-2xl sm:text-3xl mb-1">{option.emoji}</span>
                    <span className="text-[10px] sm:text-xs font-medium text-center">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className={`p-3 rounded-lg text-sm ${
                theme === 'dark'
                  ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={saving || mood === null || isSaved}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  saving || mood === null || isSaved
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
              >
                {saving ? 'Guardando...' : isSaved ? 'Ya guardado' : 'Guardar Feedback'}
              </button>
            </div>
            {isSaved && (
              <p className={`text-sm text-center mt-2 ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
              }`}>
                El feedback de hoy ya ha sido guardado y no se puede editar.
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DailyFeedbackModal

