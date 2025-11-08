import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { exerciseCategories, searchExercises, ExerciseData } from '../data/exercises'

interface ExerciseSelectorProps {
  onSelect: (exercise: ExerciseData, sets: string, reps: string, video?: string) => void
  onClose: () => void
  addedExercisesCount?: number
  currentSectionExercises?: number
}

const ExerciseSelector = ({ onSelect, onClose, addedExercisesCount = 0, currentSectionExercises = 0 }: ExerciseSelectorProps) => {
  const { theme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedExercise, setSelectedExercise] = useState<ExerciseData | null>(null)
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('12')
  const [customVideo, setCustomVideo] = useState('')

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  const filteredExercises = useMemo(() => {
    return searchExercises(searchQuery, selectedCategory || undefined)
  }, [searchQuery, selectedCategory])

  const handleSelectExercise = (exercise: ExerciseData) => {
    setSelectedExercise(exercise)
  }

  const handleConfirm = () => {
    if (selectedExercise) {
      const videoToUse = customVideo.trim() || selectedExercise.video || ''
      onSelect(selectedExercise, sets, reps, videoToUse)
      // Reset form
      setSelectedExercise(null)
      setCustomVideo('')
      setSets('3')
      setReps('12')
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ 
        overflow: 'hidden',
        touchAction: 'none'
      }}
    >
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        data-modal-content
        className={`relative w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl ${
          theme === 'dark' ? 'bg-slate-800' : 'bg-white'
        } overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b ${
          theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
        } flex items-center justify-between`}>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Seleccionar Ejercicio
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                <span className="font-semibold">Ejercicios en sección:</span> {currentSectionExercises}
              </div>
              {addedExercisesCount > 0 && (
                <div className={`text-sm px-3 py-1 rounded-full ${
                  theme === 'dark' ? 'bg-primary-500/20 text-primary-300' : 'bg-primary-100 text-primary-700'
                }`}>
                  <span className="font-semibold">Agregados en esta sesión:</span> {addedExercisesCount}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filters */}
        <div className={`p-4 border-b ${
          theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
        } space-y-4`}>
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ejercicio..."
              className={`w-full px-4 py-3 pl-12 rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            <svg
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-400'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Category Filter - Múltiples filas */}
          <div 
            className="flex flex-wrap gap-2"
          >
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                selectedCategory === ''
                  ? 'bg-primary-600 text-white'
                  : theme === 'dark'
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            {exerciseCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-hidden">
          <div 
            className="h-full overflow-y-auto p-4"
            data-scrollable
            style={{ 
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              overscrollBehavior: 'contain'
            }}
            onWheel={(e) => {
              // Permitir scroll vertical normal
              e.stopPropagation()
            }}
            onTouchMove={(e) => {
              // Permitir scroll táctil
              e.stopPropagation()
            }}
          >
            {filteredExercises.length === 0 ? (
              <div className={`text-center py-12 ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
              }`}>
                <p>No se encontraron ejercicios</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredExercises.map((exercise) => (
                  <motion.div
                    key={exercise.id}
                    onClick={() => handleSelectExercise(exercise)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedExercise?.id === exercise.id
                        ? 'border-primary-500 bg-primary-500/10'
                        : theme === 'dark'
                        ? 'border-slate-700 bg-slate-700/50 hover:border-slate-600'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-sm mb-0.5 truncate ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {exercise.name}
                        </h3>
                        <p className={`text-xs mb-1 ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          {exercise.category}
                        </p>
                        {exercise.description && (
                          <p className={`text-xs line-clamp-2 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                          }`}>
                            {exercise.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Exercise Details and Sets/Reps */}
        {selectedExercise && (
          <div className={`p-4 border-t ${
            theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="space-y-4">
              <div>
                <h3 className={`font-bold text-lg mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {selectedExercise.name}
                </h3>
                {selectedExercise.video && (
                  <a
                    href={selectedExercise.video}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-2 mb-3"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Ver video original
                  </a>
                )}
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  URL del Video de YouTube (opcional - sobrescribe el video por defecto)
                </label>
                <input
                  type="url"
                  value={customVideo}
                  onChange={(e) => setCustomVideo(e.target.value)}
                  placeholder="https://www.youtube.com/shorts/... o deja vacío para usar el video por defecto"
                  className={`w-full px-4 py-2 rounded-lg border text-sm ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Series
                  </label>
                  <input
                    type="number"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    min="1"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Repeticiones
                  </label>
                  <input
                    type="text"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    placeholder="12 o 1 min"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-gradient-to-r from-primary-600 to-primary-800 text-white px-6 py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-primary-900 transition-all"
                >
                  Agregar Ejercicio
                </button>
                <button
                  onClick={onClose}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default ExerciseSelector

