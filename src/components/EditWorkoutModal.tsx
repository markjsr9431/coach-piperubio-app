import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebaseConfig'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { Workout, Exercise } from '../data/workouts'
import { ExerciseData } from '../data/exercises'
import ExerciseSelector from './ExerciseSelector'

// Componente para editar un ejercicio individual
interface EditExerciseFormProps {
  exercise: Exercise
  onSave: (updates: { name?: string; sets?: string; video?: string }) => void
  onCancel: () => void
}

const EditExerciseForm = ({ exercise, onSave, onCancel }: EditExerciseFormProps) => {
  const { theme } = useTheme()
  const [name, setName] = useState(exercise.name)
  const [sets, setSets] = useState(exercise.sets)
  const [video, setVideo] = useState(exercise.video || '')

  const handleSave = () => {
    onSave({ name, sets, video })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={`block text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
          Nombre del Ejercicio
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border text-sm ${
            theme === 'dark'
              ? 'bg-slate-700 border-slate-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-primary-500`}
        />
      </div>
      <div>
        <label className={`block text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
          Series y Repeticiones
        </label>
        <input
          type="text"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          placeholder="3x12 o 1 min"
          className={`w-full px-3 py-2 rounded-lg border text-sm ${
            theme === 'dark'
              ? 'bg-slate-700 border-slate-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-primary-500`}
        />
      </div>
      <div>
        <label className={`block text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
          URL del Video de YouTube
        </label>
        <input
          type="url"
          value={video}
          onChange={(e) => setVideo(e.target.value)}
          placeholder="https://www.youtube.com/shorts/..."
          className={`w-full px-3 py-2 rounded-lg border text-sm ${
            theme === 'dark'
              ? 'bg-slate-700 border-slate-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          } focus:outline-none focus:ring-2 focus:ring-primary-500`}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
            theme === 'dark'
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          }`}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

interface EditWorkoutModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  dayIndex: number
  initialWorkout: Workout
  onSave: () => void
}

const EditWorkoutModal = ({
  isOpen,
  onClose,
  clientId,
  dayIndex,
  initialWorkout,
  onSave
}: EditWorkoutModalProps) => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [workout, setWorkout] = useState<Workout>(initialWorkout)
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null)
  const [editingExercise, setEditingExercise] = useState<{ sectionIndex: number; exerciseIndex: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addedExercisesCount, setAddedExercisesCount] = useState(0)

  const handleAddExercise = (sectionIndex: number) => {
    setSelectedSectionIndex(sectionIndex)
    setShowExerciseSelector(true)
  }

  const handleSelectExercise = (exercise: ExerciseData, sets: string, reps: string, video?: string) => {
    if (selectedSectionIndex !== null) {
      const newExercise: Exercise = {
        name: exercise.name,
        sets: `${sets}x${reps}`,
        video: video || exercise.video || ''
      }

      const updatedSections = [...workout.sections]
      updatedSections[selectedSectionIndex].exercises.push(newExercise)
      setWorkout({ ...workout, sections: updatedSections })
      setSelectedSectionIndex(null)
      setAddedExercisesCount(prev => prev + 1)
    }
  }

  const handleEditExercise = (sectionIndex: number, exerciseIndex: number) => {
    setEditingExercise({ sectionIndex, exerciseIndex })
  }

  const handleUpdateExercise = (sectionIndex: number, exerciseIndex: number, updates: { name?: string; sets?: string; video?: string }) => {
    const updatedSections = [...workout.sections]
    const exercise = updatedSections[sectionIndex].exercises[exerciseIndex]
    updatedSections[sectionIndex].exercises[exerciseIndex] = {
      ...exercise,
      ...updates
    }
    setWorkout({ ...workout, sections: updatedSections })
    setEditingExercise(null)
  }

  const handleDeleteExercise = (sectionIndex: number, exerciseIndex: number) => {
    const updatedSections = [...workout.sections]
    updatedSections[sectionIndex].exercises.splice(exerciseIndex, 1)
    setWorkout({ ...workout, sections: updatedSections })
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    // Verificar que el usuario esté autenticado
    if (!user) {
      setError('Debes estar autenticado para guardar cambios')
      setLoading(false)
      return
    }

    // Verificar que sea admin
    const userEmail = user.email?.toLowerCase()
    const isAdmin = userEmail === 'piperubiocoach@gmail.com' || userEmail === 'sebassennin@gmail.com'
    
    if (!isAdmin) {
      setError('Solo los administradores pueden editar entrenamientos')
      setLoading(false)
      return
    }

    try {
      const workoutRef = doc(db, 'clients', clientId, 'workouts', `day-${dayIndex + 1}`)
      await setDoc(workoutRef, {
        ...workout,
        dayIndex,
        updatedAt: serverTimestamp(),
        clientId,
        updatedBy: user.email
      }, { merge: true })

      onSave()
      onClose()
    } catch (err: any) {
      console.error('Error saving workout:', err)
      console.error('User email:', user.email)
      console.error('Is admin:', isAdmin)
      setError(err.message || 'Error al guardar el entrenamiento. Verifica que tengas permisos de administrador.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`w-full max-w-4xl rounded-2xl shadow-2xl ${
                theme === 'dark' ? 'bg-slate-800' : 'bg-white'
              } max-h-[90vh] flex flex-col`}>
                {/* Header */}
                <div className={`p-6 border-b ${
                  theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
                } flex items-center justify-between`}>
                  <div>
                    <h2 className={`text-2xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Editar Entrenamiento
                    </h2>
                    <p className={`text-sm mt-1 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                    }`}>
                      {workout.day}
                    </p>
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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-6">
                    {workout.sections.map((section, sectionIndex) => (
                      <div
                        key={sectionIndex}
                        className={`rounded-lg border ${
                          theme === 'dark' ? 'border-slate-700 bg-slate-700/50' : 'border-gray-200 bg-gray-50'
                        } p-4`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className={`text-xl font-bold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {section.name}
                          </h3>
                          <button
                            onClick={() => handleAddExercise(sectionIndex)}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar Ejercicio
                          </button>
                        </div>

                        <div className="space-y-2">
                          {section.exercises.map((exercise, exerciseIndex) => (
                            <div
                              key={exerciseIndex}
                              className={`flex items-center justify-between p-3 rounded-lg ${
                                theme === 'dark' ? 'bg-slate-600/50' : 'bg-white'
                              }`}
                            >
                              <div className="flex-1">
                                {editingExercise?.sectionIndex === sectionIndex && editingExercise?.exerciseIndex === exerciseIndex ? (
                                  <EditExerciseForm
                                    exercise={exercise}
                                    onSave={(updates) => handleUpdateExercise(sectionIndex, exerciseIndex, updates)}
                                    onCancel={() => setEditingExercise(null)}
                                  />
                                ) : (
                                  <>
                                    <div className="flex items-center gap-3">
                                      <h4 className={`font-semibold ${
                                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                                      }`}>
                                        {exercise.name}
                                      </h4>
                                      <span className={`text-sm px-2 py-1 rounded ${
                                        theme === 'dark' ? 'bg-primary-500/20 text-primary-300' : 'bg-primary-100 text-primary-700'
                                      }`}>
                                        {exercise.sets}
                                      </span>
                                    </div>
                                    {exercise.video && (
                                      <a
                                        href={exercise.video}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary-600 hover:text-primary-700 text-xs flex items-center gap-1 mt-1"
                                      >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                        Ver video
                                      </a>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {!(editingExercise?.sectionIndex === sectionIndex && editingExercise?.exerciseIndex === exerciseIndex) && (
                                  <button
                                    onClick={() => handleEditExercise(sectionIndex, exerciseIndex)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      theme === 'dark'
                                        ? 'hover:bg-blue-500/20 text-blue-400'
                                        : 'hover:bg-blue-50 text-blue-600'
                                    }`}
                                    title="Editar ejercicio"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteExercise(sectionIndex, exerciseIndex)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    theme === 'dark'
                                      ? 'hover:bg-red-500/20 text-red-400'
                                      : 'hover:bg-red-50 text-red-600'
                                  }`}
                                  title="Eliminar ejercicio"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t ${
                  theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
                } flex items-center justify-end gap-3`}>
                  <button
                    onClick={onClose}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Exercise Selector */}
      {showExerciseSelector && selectedSectionIndex !== null && (
        <ExerciseSelector
          onSelect={(exercise, sets, reps, video) => {
            handleSelectExercise(exercise, sets, reps, video)
            // No cerrar el modal, permitir agregar más ejercicios
            // El contador se actualiza en handleSelectExercise
          }}
          onClose={() => {
            setShowExerciseSelector(false)
            setSelectedSectionIndex(null)
            setAddedExercisesCount(0)
          }}
          addedExercisesCount={addedExercisesCount}
          currentSectionExercises={selectedSectionIndex !== null ? workout.sections[selectedSectionIndex].exercises.length + addedExercisesCount : 0}
        />
      )}
    </>
  )
}

export default EditWorkoutModal

