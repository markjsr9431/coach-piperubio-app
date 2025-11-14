import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebaseConfig'
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { Workout, Exercise, Section } from '../data/workouts'
import { ExerciseData } from '../data/exercises'
import ExerciseSelector from '../components/ExerciseSelector'
import TopBanner from '../components/TopBanner'

interface Client {
  id: string
  name: string
  email: string
  createdAt?: any
  clientCategory?: 'new' | 'old'
}

const CreateWorkoutPage = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { user } = useAuth()
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'

  const [workoutName, setWorkoutName] = useState('')
  const [sections, setSections] = useState<Section[]>([
    { name: 'Calentamiento', exercises: [] },
    { name: 'Fase Central', exercises: [] },
    { name: 'Prevención de lesiones', exercises: [] },
    { name: 'Estiramiento', exercises: [] }
  ])
  const [showExerciseSelector, setShowExerciseSelector] = useState(false)
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null)
  const [editingExercise, setEditingExercise] = useState<{ sectionIndex: number; exerciseIndex: number } | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addedExercisesCount, setAddedExercisesCount] = useState(0)
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientModalType, setClientModalType] = useState<'new' | 'old' | null>(null)

  // Cargar lista de clientes
  useEffect(() => {
    if (!isCoach) {
      navigate('/home')
      return
    }

    const loadClients = async () => {
      try {
        const clientsRef = collection(db, 'clients')
        const snapshot = await getDocs(clientsRef)
        const clientsList: Client[] = []
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          // Filtrar solo clientes (excluir admins)
          const email = data.email?.toLowerCase() || ''
          const adminEmails = ['piperubiocoach@gmail.com', 'sebassennin@gmail.com']
          if (!adminEmails.includes(email) && email !== '' && (!data.role || data.role === 'client')) {
            clientsList.push({
              id: doc.id,
              name: data.name || '',
              email: data.email || '',
              createdAt: data.createdAt,
              clientCategory: data.clientCategory
            })
          }
        })
        
        setClients(clientsList)
      } catch (error) {
        console.error('Error loading clients:', error)
      }
    }

    loadClients()
  }, [isCoach, navigate])

  const handleAddSection = () => {
    setSections([...sections, { name: 'Nueva Sección', exercises: [] }])
  }

  const handleDeleteSection = (sectionIndex: number) => {
    if (sections.length <= 1) {
      alert('Debe haber al menos una sección')
      return
    }
    setSections(sections.filter((_, index) => index !== sectionIndex))
  }

  const handleSectionNameChange = (sectionIndex: number, newName: string) => {
    const updatedSections = [...sections]
    updatedSections[sectionIndex].name = newName
    setSections(updatedSections)
  }

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

      const updatedSections = [...sections]
      updatedSections[selectedSectionIndex].exercises.push(newExercise)
      setSections(updatedSections)
      setAddedExercisesCount(prev => prev + 1)
    }
  }

  const handleEditExercise = (sectionIndex: number, exerciseIndex: number) => {
    setEditingExercise({ sectionIndex, exerciseIndex })
  }

  const handleUpdateExercise = (sectionIndex: number, exerciseIndex: number, updates: { name?: string; sets?: string; video?: string }) => {
    const updatedSections = [...sections]
    const exercise = updatedSections[sectionIndex].exercises[exerciseIndex]
    updatedSections[sectionIndex].exercises[exerciseIndex] = {
      ...exercise,
      ...updates
    }
    setSections(updatedSections)
    setEditingExercise(null)
  }

  const handleDeleteExercise = (sectionIndex: number, exerciseIndex: number) => {
    const updatedSections = [...sections]
    updatedSections[sectionIndex].exercises = updatedSections[sectionIndex].exercises.filter((_, index) => index !== exerciseIndex)
    setSections(updatedSections)
  }

  const handleToggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  // Separar clientes en nuevos y antiguos (misma lógica que HomePage)
  const getNewClients = () => {
    return clients.filter(client => {
      // Si tiene categoría manual, usar esa
      if (client.clientCategory === 'new') return true
      if (client.clientCategory === 'old') return false
      // Si no tiene categoría manual, usar criterio de 30 días
      if (!client.createdAt) return false
      const createdAt = client.createdAt.toDate ? client.createdAt.toDate() : new Date(client.createdAt)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return createdAt >= thirtyDaysAgo
    })
  }

  const getOldClients = () => {
    return clients.filter(client => {
      // Si tiene categoría manual, usar esa
      if (client.clientCategory === 'old') return true
      if (client.clientCategory === 'new') return false
      // Si no tiene categoría manual, usar criterio de 30 días
      if (!client.createdAt) return true
      const createdAt = client.createdAt.toDate ? client.createdAt.toDate() : new Date(client.createdAt)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return createdAt < thirtyDaysAgo
    })
  }

  const newClients = getNewClients()
  const oldClients = getOldClients()

  const handleSave = async () => {
    if (!workoutName.trim()) {
      setError('Por favor ingresa un nombre para el plan')
      return
    }

    if (sections.every(section => section.exercises.length === 0)) {
      setError('Por favor agrega al menos un ejercicio')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const workout: Workout = {
        day: workoutName,
        sections: sections.filter(section => section.exercises.length > 0)
      }

      // Si hay clientes seleccionados, guardar el plan para cada cliente
      if (selectedClients.size > 0) {
        const savePromises = Array.from(selectedClients).map(async (clientId) => {
          // Encontrar el próximo día disponible para este cliente
          const workoutsRef = collection(db, 'clients', clientId, 'workouts')
          const snapshot = await getDocs(workoutsRef)
          const existingDayIndexes = new Set<number>()
          snapshot.forEach((doc) => {
            const data = doc.data()
            if (data.dayIndex !== undefined) {
              existingDayIndexes.add(data.dayIndex)
            }
          })
          
          // Encontrar el primer día disponible
          let dayIndex = 0
          while (existingDayIndexes.has(dayIndex)) {
            dayIndex++
          }

          const workoutRef = doc(db, 'clients', clientId, 'workouts', `day-${dayIndex + 1}`)
          await setDoc(workoutRef, {
            ...workout,
            dayIndex,
            createdAt: serverTimestamp(),
            createdBy: user?.email || ''
          })
        })

        await Promise.all(savePromises)
        alert(`Plan "${workoutName}" creado y asignado a ${selectedClients.size} cliente(s)`)
      } else {
        // Guardar como plan general (opcional: crear una colección de planes generales)
        alert(`Plan "${workoutName}" creado. Nota: Debes asignarlo a clientes para que sea visible.`)
      }

      navigate('/home')
    } catch (err: any) {
      console.error('Error saving workout:', err)
      setError(err.message || 'Error al guardar el plan')
    } finally {
      setLoading(false)
    }
  }

  if (!isCoach) {
    return null
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${
      theme === 'dark' 
        ? 'from-slate-900 via-slate-800 to-slate-900' 
        : 'from-gray-50 via-gray-100 to-gray-200'
    }`}>
      <TopBanner />
      <div className="h-28 sm:h-32"></div>

      <div className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => navigate('/home')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                theme === 'dark'
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl shadow-2xl ${
              theme === 'dark' ? 'bg-slate-800' : 'bg-white'
            } p-6`}
          >
            <h1 className={`text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Crear Plan de Entrenamiento
            </h1>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Nombre del Plan */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Nombre del Plan
                </label>
                <input
                  type="text"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="Ej: Plan Semanal - Nivel 1"
                  className={`w-full px-4 py-3 rounded-lg border text-base ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>

              {/* Secciones */}
              {sections.map((section, sectionIndex) => (
                <div
                  key={sectionIndex}
                  className={`rounded-lg border ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-700/50' : 'border-gray-200 bg-gray-50'
                  } p-3 sm:p-4`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <input
                      type="text"
                      value={section.name}
                      onChange={(e) => handleSectionNameChange(sectionIndex, e.target.value)}
                      className={`text-lg sm:text-xl font-bold bg-transparent border-b-2 border-transparent focus:border-primary-500 focus:outline-none w-full sm:w-auto ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}
                    />
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAddExercise(sectionIndex)}
                        className="px-3 sm:px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1 sm:gap-2 whitespace-nowrap"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">Agregar Ejercicio</span>
                        <span className="sm:hidden">Agregar</span>
                      </button>
                      {sections.length > 1 && (
                        <button
                          onClick={() => handleDeleteSection(sectionIndex)}
                          className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                            theme === 'dark'
                              ? 'hover:bg-red-500/20 text-red-400'
                              : 'hover:bg-red-50 text-red-600'
                          }`}
                          title="Eliminar sección"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {section.exercises.map((exercise, exerciseIndex) => (
                      <div
                        key={exerciseIndex}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 rounded-lg ${
                          theme === 'dark' ? 'bg-slate-600/50' : 'bg-white'
                        }`}
                      >
                        <div className="flex-1">
                          {editingExercise?.sectionIndex === sectionIndex && editingExercise?.exerciseIndex === exerciseIndex ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={exercise.name}
                                onChange={(e) => handleUpdateExercise(sectionIndex, exerciseIndex, { name: e.target.value })}
                                className={`w-full px-2 py-1 rounded border text-sm ${
                                  theme === 'dark'
                                    ? 'bg-slate-700 border-slate-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              />
                              <input
                                type="text"
                                value={exercise.sets}
                                onChange={(e) => handleUpdateExercise(sectionIndex, exerciseIndex, { sets: e.target.value })}
                                placeholder="3x12"
                                className={`w-full px-2 py-1 rounded border text-sm ${
                                  theme === 'dark'
                                    ? 'bg-slate-700 border-slate-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              />
                              <input
                                type="url"
                                value={exercise.video}
                                onChange={(e) => handleUpdateExercise(sectionIndex, exerciseIndex, { video: e.target.value })}
                                placeholder="URL del video"
                                className={`w-full px-2 py-1 rounded border text-sm ${
                                  theme === 'dark'
                                    ? 'bg-slate-700 border-slate-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              />
                              <button
                                onClick={() => setEditingExercise(null)}
                                className="px-3 py-1 bg-primary-600 text-white rounded text-sm"
                              >
                                Guardar
                              </button>
                            </div>
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
                        {!(editingExercise?.sectionIndex === sectionIndex && editingExercise?.exerciseIndex === exerciseIndex) && (
                          <div className="flex items-center gap-2 flex-shrink-0">
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
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Botón Agregar Sección */}
              <button
                onClick={handleAddSection}
                className={`w-full py-3 rounded-lg border-2 border-dashed transition-colors ${
                  theme === 'dark'
                    ? 'border-slate-600 hover:border-slate-500 text-slate-300'
                    : 'border-gray-300 hover:border-gray-400 text-gray-600'
                } font-semibold flex items-center justify-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Sección
              </button>

              {/* Selector de Clientes - Desplegable */}
              <div className={`rounded-lg border ${
                theme === 'dark' ? 'border-slate-700 bg-slate-700/50' : 'border-gray-200 bg-gray-50'
              } p-4`}>
                <h3 className={`text-lg font-bold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Asignar a Clientes (Opcional)
                </h3>
                {selectedClients.size > 0 && (
                  <div className="mb-4">
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      {selectedClients.size} cliente(s) seleccionado(s)
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setClientModalType('new')
                      setShowClientModal(true)
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                      theme === 'dark'
                        ? 'border-slate-600 hover:border-slate-500 text-slate-300 hover:bg-slate-600'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-100'
                    } font-semibold`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevos ({newClients.length})
                  </button>
                  <button
                    onClick={() => {
                      setClientModalType('old')
                      setShowClientModal(true)
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                      theme === 'dark'
                        ? 'border-slate-600 hover:border-slate-500 text-slate-300 hover:bg-slate-600'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-100'
                    } font-semibold`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Antiguos ({oldClients.length})
                  </button>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => navigate('/home')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
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
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Guardando...' : 'Crear Plan'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Exercise Selector */}
      {showExerciseSelector && selectedSectionIndex !== null && (
        <ExerciseSelector
          onSelect={(exercise, sets, reps, video) => {
            handleSelectExercise(exercise, sets, reps, video)
            setShowExerciseSelector(false)
            setSelectedSectionIndex(null)
            setAddedExercisesCount(0)
          }}
          onClose={() => {
            setShowExerciseSelector(false)
            setSelectedSectionIndex(null)
            setAddedExercisesCount(0)
          }}
          addedExercisesCount={addedExercisesCount}
          currentSectionExercises={selectedSectionIndex !== null ? sections[selectedSectionIndex].exercises.length + addedExercisesCount : 0}
        />
      )}

      {/* Modal de Selección de Clientes */}
      {showClientModal && clientModalType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`w-full max-w-2xl rounded-2xl shadow-2xl backdrop-blur-sm ${
              theme === 'dark' ? 'bg-slate-800/90 border border-slate-700/50' : 'bg-white/90 border border-gray-200/50'
            } p-6 max-h-[80vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {clientModalType === 'new' ? 'Clientes Nuevos' : 'Clientes Antiguos'} 
                ({clientModalType === 'new' ? newClients.length : oldClients.length})
              </h3>
              <button
                onClick={() => {
                  setShowClientModal(false)
                  setClientModalType(null)
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

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(clientModalType === 'new' ? newClients : oldClients).map((client) => (
                <label
                  key={client.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    theme === 'dark' 
                      ? selectedClients.has(client.id)
                        ? 'bg-primary-600/20 border border-primary-500/50'
                        : 'hover:bg-slate-700 border border-slate-600'
                      : selectedClients.has(client.id)
                        ? 'bg-primary-100 border border-primary-300'
                        : 'hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedClients.has(client.id)}
                    onChange={() => handleToggleClient(client.id)}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <span className={`font-semibold block ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {client.name}
                    </span>
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                    }`}>
                      {client.email}
                    </span>
                  </div>
                </label>
              ))}
              {(clientModalType === 'new' ? newClients : oldClients).length === 0 && (
                <p className={`text-center py-8 text-sm ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  No hay {clientModalType === 'new' ? 'clientes nuevos' : 'clientes antiguos'} disponibles
                </p>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-slate-700/50">
              <button
                onClick={() => {
                  setShowClientModal(false)
                  setClientModalType(null)
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default CreateWorkoutPage

