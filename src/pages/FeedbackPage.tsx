import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import TopBanner from '../components/TopBanner'

const FeedbackPage = () => {
  const { clientId } = useParams<{ clientId: string }>()
  const { theme } = useTheme()
  const [feedbackList, setFeedbackList] = useState<Array<{day: number, data: any}>>([])
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [selectedFeedbackDay, setSelectedFeedbackDay] = useState<{day: number, data: any} | null>(null)

  // Cargar retroalimentación desde localStorage
  useEffect(() => {
    if (!clientId) return

    const loadFeedback = () => {
      const feedbacks: Array<{day: number, data: any}> = []
      // Buscar retroalimentación de los últimos 30 días
      for (let day = 1; day <= 30; day++) {
        const storageKey = `feedback_${clientId}_day_${day}`
        const submittedKey = `feedback_submitted_${clientId}_day_${day}`
        const saved = localStorage.getItem(storageKey)
        const isSubmitted = localStorage.getItem(submittedKey) === 'true'
        
        // Incluir días que tienen feedback enviado, incluso si no hay datos guardados
        if (isSubmitted || saved) {
          try {
            let parsed = {}
            if (saved) {
              parsed = JSON.parse(saved)
            }
            // Si está enviado pero no hay datos, crear un objeto vacío con el día
            feedbacks.push({ day, data: parsed })
          } catch (error) {
            console.error(`Error loading feedback for day ${day}:`, error)
            // Si hay error pero está enviado, incluir de todas formas
            if (isSubmitted) {
              feedbacks.push({ day, data: {} })
            }
          }
        }
      }
      // Ordenar por día descendente
      feedbacks.sort((a, b) => b.day - a.day)
      setFeedbackList(feedbacks)
    }

    loadFeedback()
  }, [clientId])

  return (
    <div className={`min-h-screen ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'
    }`}>
      <TopBanner />
      
      {/* Contenido Principal */}
      <div className="pt-8 pb-12 px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0 }}
          className="max-w-7xl mx-auto"
        >
          <div className="text-center mb-12">
            <h1 className={`text-4xl sm:text-5xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Retroalimentación del Cliente
            </h1>
            <p className={`text-lg sm:text-xl ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Días con retroalimentación enviada
            </p>
          </div>

          {feedbackList.length === 0 ? (
            <div className={`text-center py-16 rounded-xl ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/50'
            }`}>
              <p className={`text-xl ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
              }`}>
                No hay retroalimentación registrada aún
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {feedbackList.map(({ day, data }) => (
                <motion.button
                  key={day}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: day * 0.02 }}
                  onClick={() => {
                    setSelectedFeedbackDay({ day, data })
                    setShowFeedbackModal(true)
                  }}
                  className={`p-4 rounded-lg border transition-all hover:scale-105 ${
                    theme === 'dark'
                      ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-600 hover:border-slate-500'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  <span className={`font-bold text-lg ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    DÍA {day}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal de Detalles de Retroalimentación */}
      <AnimatePresence>
        {showFeedbackModal && selectedFeedbackDay && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`w-full max-w-2xl rounded-2xl shadow-2xl backdrop-blur-sm ${
                theme === 'dark' ? 'bg-slate-800/90 border border-slate-700/50' : 'bg-white/90 border border-gray-200/50'
              } p-6 max-h-[90vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Retroalimentación - Día {selectedFeedbackDay.day}
                </h3>
                <button
                  onClick={() => {
                    setShowFeedbackModal(false)
                    setSelectedFeedbackDay(null)
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-slate-700 text-slate-400' 
                      : 'hover:bg-gray-100 text-gray-500'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {selectedFeedbackDay.data.comment && (
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      Comentario:
                    </p>
                    <p className={`text-sm p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-slate-700/50 text-slate-200' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedFeedbackDay.data.comment}
                    </p>
                  </div>
                )}
                
                {selectedFeedbackDay.data.effort !== null && selectedFeedbackDay.data.effort !== undefined && (
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      Esfuerzo: {selectedFeedbackDay.data.effort}/10
                    </p>
                    <div className={`w-full rounded-full h-3 ${
                      theme === 'dark' ? 'bg-slate-600' : 'bg-gray-300'
                    }`}>
                      <div
                        className={`h-3 rounded-full ${
                          selectedFeedbackDay.data.effort <= 3 ? 'bg-red-500' :
                          selectedFeedbackDay.data.effort <= 6 ? 'bg-yellow-500' :
                          selectedFeedbackDay.data.effort <= 8 ? 'bg-green-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${(selectedFeedbackDay.data.effort / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {selectedFeedbackDay.data.weightUsed && selectedFeedbackDay.data.weightUsed.length > 0 && (
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      Peso utilizado:
                    </p>
                    <p className={`text-sm p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-slate-700/50 text-slate-200' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedFeedbackDay.data.weightUsed.filter((w: string) => w !== 'Otro').map((implement: string) => {
                        const amount = selectedFeedbackDay.data.weightAmounts?.[implement]
                        return amount ? `${implement} (${amount}kg)` : implement
                      }).join(', ')}
                      {selectedFeedbackDay.data.weightUsed.includes('Otro') && selectedFeedbackDay.data.weightDetails && (
                        <span>, {selectedFeedbackDay.data.weightDetails}</span>
                      )}
                    </p>
                  </div>
                )}
                
                {selectedFeedbackDay.data.feeling && (
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      Sentimiento:
                    </p>
                    <p className={`text-sm p-3 rounded-lg capitalize ${
                      theme === 'dark' ? 'bg-slate-700/50 text-slate-200' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedFeedbackDay.data.feeling}
                    </p>
                  </div>
                )}

                {!selectedFeedbackDay.data.comment && 
                 selectedFeedbackDay.data.effort === null && 
                 (!selectedFeedbackDay.data.weightUsed || selectedFeedbackDay.data.weightUsed.length === 0) &&
                 !selectedFeedbackDay.data.feeling && (
                  <p className={`text-center py-8 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    No hay información detallada para este día
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FeedbackPage

