import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

export interface DailyFeedbackData {
  comment: string
  effort: number | null
  weightUsed: string[]
  weightDetails: string
  weightAmounts: { [key: string]: string } // Mapea implemento -> peso usado
  feeling: string | null
}

interface DailyFeedbackProps {
  day?: string
  dayIndex: number
  clientId?: string
  onFeedbackChange?: (feedback: DailyFeedbackData) => void
  onSubmit?: () => void
}

const DailyFeedback = ({ dayIndex, clientId, onFeedbackChange, onSubmit }: DailyFeedbackProps) => {
  const { theme } = useTheme()
  const [feedback, setFeedback] = useState<DailyFeedbackData>({
    comment: '',
    effort: null,
    weightUsed: [],
    weightDetails: '',
    weightAmounts: {},
    feeling: null
  })
  const [submitted, setSubmitted] = useState(false)

  const feelings = [
    { emoji: '😃', label: 'Excelente', value: 'excelente' },
    { emoji: '🙂', label: 'Bien', value: 'bien' },
    { emoji: '😐', label: 'Normal', value: 'normal' },
    { emoji: '😫', label: 'Cansado', value: 'cansado' },
    { emoji: '😞', label: 'Difícil', value: 'dificil' }
  ]

  const quickWeightOptions = ['Mancuerna', 'Barra', 'Discos']

  // Cargar retroalimentación guardada al montar
  useEffect(() => {
    const loadFeedback = () => {
      const storageKey = clientId 
        ? `feedback_${clientId}_day_${dayIndex + 1}`
        : `feedback_day_${dayIndex + 1}`
      
      const saved = localStorage.getItem(storageKey)
      const submittedKey = clientId 
        ? `feedback_submitted_${clientId}_day_${dayIndex + 1}`
        : `feedback_submitted_day_${dayIndex + 1}`
      const isSubmitted = localStorage.getItem(submittedKey) === 'true'
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Migrar datos antiguos (weightUsed como string) a nuevo formato (array)
          if (typeof parsed.weightUsed === 'string') {
            parsed.weightUsed = parsed.weightUsed ? [parsed.weightUsed] : []
            parsed.weightDetails = parsed.weightDetails || ''
          }
          // Asegurar que weightAmounts existe
          if (!parsed.weightAmounts) {
            parsed.weightAmounts = {}
          }
          setFeedback(parsed)
          if (onFeedbackChange) {
            onFeedbackChange(parsed)
          }
        } catch (error) {
          console.error('Error loading feedback:', error)
        }
      }
      
      setSubmitted(isSubmitted)
    }

    loadFeedback()
  }, [dayIndex, clientId, onFeedbackChange])

  // Guardar retroalimentación en localStorage cuando cambia
  useEffect(() => {
    const saveFeedback = () => {
      const storageKey = clientId 
        ? `feedback_${clientId}_day_${dayIndex + 1}`
        : `feedback_day_${dayIndex + 1}`
      
      localStorage.setItem(storageKey, JSON.stringify(feedback))
      
      if (onFeedbackChange) {
        onFeedbackChange(feedback)
      }
    }

    // Debounce para no guardar en cada tecla
    const timeoutId = setTimeout(saveFeedback, 500)
    return () => clearTimeout(timeoutId)
  }, [feedback, dayIndex, clientId, onFeedbackChange])

  const handleCommentChange = (value: string) => {
    setFeedback(prev => ({ ...prev, comment: value }))
  }

  const handleEffortChange = (value: number) => {
    setFeedback(prev => ({ ...prev, effort: value }))
  }

  const handleQuickWeightClick = (option: string) => {
    setFeedback(prev => {
      const currentWeights = prev.weightUsed || []
      const currentAmounts = prev.weightAmounts || {}
      // Si ya está seleccionado, deseleccionar
      if (currentWeights.includes(option)) {
        const newWeights = currentWeights.filter(w => w !== option)
        const newAmounts = { ...currentAmounts }
        delete newAmounts[option]
        return { ...prev, weightUsed: newWeights, weightAmounts: newAmounts }
      }
      // Añadir a la lista
      return { ...prev, weightUsed: [...currentWeights, option] }
    })
  }

  const handleWeightAmountChange = (implement: string, amount: string) => {
    setFeedback(prev => ({
      ...prev,
      weightAmounts: {
        ...prev.weightAmounts,
        [implement]: amount
      }
    }))
  }

  const handleFeelingChange = (value: string) => {
    setFeedback(prev => ({ ...prev, feeling: value }))
  }

  const getEffortColor = (effort: number | null) => {
    if (!effort) return 'bg-gray-500'
    if (effort <= 3) return 'bg-green-500'
    if (effort <= 7) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getEffortColorHex = (effort: number | null) => {
    if (!effort) return '#6b7280'
    if (effort <= 3) return '#10b981' // green-500
    if (effort <= 7) return '#eab308' // yellow-500
    return '#ef4444' // red-500
  }

  const getEffortLabel = (effort: number | null) => {
    if (!effort) return ''
    if (effort <= 3) return 'Suave'
    if (effort <= 7) return 'Moderado'
    return 'Intenso'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-8 rounded-xl p-6 shadow-lg ${
        theme === 'dark' 
          ? 'bg-slate-800/50 backdrop-blur-sm' 
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <h2 className={`text-2xl font-bold mb-6 ${
        theme === 'dark' ? 'text-white' : 'text-gray-900'
      }`}>
        Retroalimentación del Día
      </h2>

      <div className="space-y-6">
        {/* Comentarios u Observaciones */}
        <div>
          <label className={`block text-sm font-semibold mb-2 ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
          }`}>
            Comentarios u observaciones del día
          </label>
          <textarea
            value={feedback.comment}
            onChange={(e) => handleCommentChange(e.target.value)}
            placeholder="Ej: me sentí con poca energía en la última ronda…"
            rows={4}
            disabled={submitted}
            className={`w-full px-4 py-3 rounded-lg border transition-colors resize-none ${
              submitted
                ? 'opacity-50 cursor-not-allowed'
                : ''
            } ${
              theme === 'dark'
                ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
            }`}
          />
        </div>

        {/* Calificación de Esfuerzo */}
        <div>
          <label className={`block text-sm font-semibold mb-3 ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
          }`}>
            ¿Qué tan exigente fue la rutina?
          </label>
          
          {/* Display del valor seleccionado */}
          {feedback.effort !== null && (
            <div className="mb-3 flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg font-bold text-white ${getEffortColor(feedback.effort)}`}>
                {feedback.effort}
              </div>
              <span className={`text-sm font-medium ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                {getEffortLabel(feedback.effort)}
              </span>
            </div>
          )}

          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min="1"
              max="10"
              value={feedback.effort || 5}
              onChange={(e) => handleEffortChange(parseInt(e.target.value))}
              disabled={submitted}
              className={`w-full h-3 rounded-lg appearance-none slider-custom ${
                submitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              style={{
                background: feedback.effort !== null
                  ? `linear-gradient(to right, ${getEffortColorHex(feedback.effort)} 0%, ${getEffortColorHex(feedback.effort)} ${((feedback.effort - 1) / 9) * 100}%, ${theme === 'dark' ? '#475569' : '#e5e7eb'} ${((feedback.effort - 1) / 9) * 100}%, ${theme === 'dark' ? '#475569' : '#e5e7eb'} 100%)`
                  : theme === 'dark' ? '#475569' : '#e5e7eb'
              }}
            />
            <style>{`
              .slider-custom::-webkit-slider-thumb {
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${feedback.effort !== null ? getEffortColorHex(feedback.effort) : '#6b7280'};
                cursor: pointer;
                border: 2px solid ${theme === 'dark' ? '#1e293b' : '#ffffff'};
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
              }
              .slider-custom::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${feedback.effort !== null ? getEffortColorHex(feedback.effort) : '#6b7280'};
                cursor: pointer;
                border: 2px solid ${theme === 'dark' ? '#1e293b' : '#ffffff'};
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
              }
            `}</style>
            <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-slate-400">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          {/* Botones rápidos */}
          <div className="flex gap-2 mt-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleEffortChange(num)}
                disabled={submitted}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                  submitted ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  feedback.effort === num
                    ? `${getEffortColor(num)} text-white scale-105`
                    : theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Peso Utilizado */}
        <div>
          <label className={`block text-sm font-semibold mb-2 ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
          }`}>
            ¿Qué peso utilizaste hoy?
          </label>
          
          {/* Botones rápidos */}
          <div className="flex flex-wrap gap-2 mb-3">
            {quickWeightOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleQuickWeightClick(option)}
                disabled={submitted}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  submitted ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  feedback.weightUsed.includes(option)
                    ? 'bg-primary-600 text-white'
                    : theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {option}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleQuickWeightClick('Otro')}
              disabled={submitted}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                submitted ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                feedback.weightUsed.includes('Otro')
                  ? 'bg-primary-600 text-white'
                  : theme === 'dark'
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Otro
            </button>
          </div>

          {/* Campos de peso específico para cada implemento seleccionado */}
          {feedback.weightUsed.filter(w => w !== 'Otro').length > 0 && (
            <div className="mb-3 space-y-2">
              {feedback.weightUsed.filter(w => w !== 'Otro').map((implement) => (
                <div key={implement} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <label className={`text-sm font-medium sm:min-w-[120px] w-full sm:w-auto ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {implement} (kg):
                  </label>
                  <input
                    type="text"
                    value={feedback.weightAmounts[implement] || ''}
                    onChange={(e) => handleWeightAmountChange(implement, e.target.value)}
                    placeholder="Ej: 10, 15, 20"
                    disabled={submitted}
                    className={`w-full sm:flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      submitted ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      theme === 'dark'
                        ? 'bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                    }`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Mostrar selección actual */}
          {feedback.weightUsed.length > 0 && (
            <div className={`p-3 rounded-lg mb-3 ${
              theme === 'dark' ? 'bg-slate-700/30' : 'bg-gray-100'
            }`}>
              <p className={`text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                Seleccionado:
              </p>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
              }`}>
                {feedback.weightUsed.filter(w => w !== 'Otro').map(implement => {
                  const amount = feedback.weightAmounts[implement]
                  return amount ? `${implement} (${amount}kg)` : implement
                }).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Selector de Sentimiento */}
        <div>
          <label className={`block text-sm font-semibold mb-3 ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
          }`}>
            ¿Cómo te sentiste con la rutina de hoy?
          </label>
          <div className="grid grid-cols-5 gap-2">
            {feelings.map((feeling) => (
              <button
                key={feeling.value}
                type="button"
                onClick={() => handleFeelingChange(feeling.value)}
                disabled={submitted}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
                  submitted ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  feedback.feeling === feeling.value
                    ? 'bg-primary-600 text-white scale-105'
                    : theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="text-3xl">{feeling.emoji}</span>
                <span className="text-xs font-medium">{feeling.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botón de Enviar */}
        {onSubmit && (
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            {submitted ? (
              <div className={`w-full px-6 py-3 rounded-lg font-semibold text-center ${
                theme === 'dark' 
                  ? 'bg-green-600/20 text-green-300 border border-green-500/30' 
                  : 'bg-green-50 text-green-700 border border-green-300'
              }`}>
                ✓ Retroalimentación enviada
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const storageKey = clientId 
                    ? `feedback_submitted_${clientId}_day_${dayIndex + 1}`
                    : `feedback_submitted_day_${dayIndex + 1}`
                  localStorage.setItem(storageKey, 'true')
                  setSubmitted(true)
                  onSubmit()
                }}
                className="w-full px-6 py-3 rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                Enviar Retroalimentación
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default DailyFeedback

