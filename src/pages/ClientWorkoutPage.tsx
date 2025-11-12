import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { workouts, Workout } from '../data/workouts'
import { db } from '../firebaseConfig'
import { collection, getDocs, doc, deleteDoc, getDoc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore'
import TopBanner from '../components/TopBanner'
import EditWorkoutModal from '../components/EditWorkoutModal'
import ProgressTracker from '../components/ProgressTracker'
import RMAndPRModal from '../components/RMAndPRModal'

const ClientWorkoutPage = () => {
  const navigate = useNavigate()
  const { clientId } = useParams<{ clientId: string }>()
  const { theme } = useTheme()
  const { t } = useLanguage()
  const { user } = useAuth()
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'
  const [showInfoModal, setShowInfoModal] = useState(true)
  const [clientWorkouts, setClientWorkouts] = useState<Workout[]>(workouts)
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null)
  const [loadingWorkouts, setLoadingWorkouts] = useState(true)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [clientProgress, setClientProgress] = useState<{
    monthlyProgress: number
    completedDays: number
    totalDays: number
  } | null>(null)
  const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null)
  const [showRMAndPRModal, setShowRMAndPRModal] = useState(false)
  const [isWorkoutDaysCollapsed, setIsWorkoutDaysCollapsed] = useState(false)
  const [workoutDurations, setWorkoutDurations] = useState<{ [dayIndex: number]: number }>({})
  const [workoutDates, setWorkoutDates] = useState<{ [dayIndex: number]: Date }>({})

  // Calcular el día actual según la fecha
  useEffect(() => {
    if (isCoach) {
      // El coach ve todos los días
      setCurrentDayIndex(null)
      return
    }

    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    
    // Si es domingo, no hay entrenamiento
    if (dayOfWeek === 0) {
      setCurrentDayIndex(null)
      return
    }

    // Mapear día de la semana al nombre del día
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const currentDayName = dayNames[dayOfWeek - 1] // dayOfWeek - 1 porque Lunes = 1, entonces índice 0
    
    // Buscar todos los workouts que coincidan con el día actual
    // Primero buscar en clientWorkouts (si ya están cargados), luego en workouts estáticos
    const workoutsToSearch = clientWorkouts.length > 0 ? clientWorkouts : workouts
    
    const matchingWorkouts = workoutsToSearch
      .map((w, index) => {
        const dayPart = w.day.split(' - ')[1]?.replace(' (Opcional)', '').trim()
        return { index, dayPart, workout: w }
      })
      .filter(item => item.dayPart === currentDayName)
    
    if (matchingWorkouts.length > 0) {
      // Si hay múltiples workouts del mismo día, usar el primero
      // En el futuro se podría calcular cuál corresponde según la fecha de inicio del plan
      setCurrentDayIndex(matchingWorkouts[0].index)
    } else {
      setCurrentDayIndex(null)
    }
  }, [isCoach, clientWorkouts])

  // Cargar entrenamientos personalizados del cliente
  useEffect(() => {
    const loadWorkouts = async () => {
      if (!clientId) {
        setLoadingWorkouts(false)
        return
      }

      try {
        const workoutsRef = collection(db, 'clients', clientId, 'workouts')
        const snapshot = await getDocs(workoutsRef)
        
        const customWorkouts: { [key: number]: Workout } = {}
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (data.dayIndex !== undefined) {
            customWorkouts[data.dayIndex] = data as Workout
          }
        })

        // Combinar entrenamientos personalizados con los predeterminados
        const updatedWorkouts = workouts.map((workout, index) => {
          return customWorkouts[index] || workout
        })

        setClientWorkouts(updatedWorkouts)

        // Cargar tiempos de entrenamiento y fechas reales para cada día - Optimizado
        // Cargar todos los documentos de progreso en una sola consulta
        const durations: { [dayIndex: number]: number } = {}
        const dates: { [dayIndex: number]: Date } = {}
        
        try {
          const progressCollectionRef = collection(db, 'clients', clientId, 'progress')
          const progressSnapshot = await getDocs(progressCollectionRef)
          
          progressSnapshot.forEach((progressDoc) => {
            // Ignorar el documento 'summary'
            if (progressDoc.id === 'summary') return
            
            // Extraer el número del día del ID (formato: "day-1", "day-2", etc.)
            const dayMatch = progressDoc.id.match(/^day-(\d+)$/)
            if (!dayMatch) return
            
            const dayIndex = parseInt(dayMatch[1]) - 1 // Convertir a índice 0-based
            if (dayIndex < 0 || dayIndex >= 30) return
            
            const progressData = progressDoc.data()
            
            if (progressData.workoutDuration) {
              durations[dayIndex] = progressData.workoutDuration
            }
            
            // Obtener fecha real de completado
            if (progressData.completedAt) {
              const completedDate = progressData.completedAt?.toDate 
                ? progressData.completedAt.toDate() 
                : new Date(progressData.completedAt)
              dates[dayIndex] = completedDate
            }
          })
        } catch (error) {
          console.error('Error loading progress data:', error)
        }
        
        setWorkoutDurations(durations)
        setWorkoutDates(dates)
      } catch (error) {
        console.error('Error loading workouts:', error)
        setClientWorkouts(workouts)
      } finally {
        setLoadingWorkouts(false)
      }
    }

    loadWorkouts()
  }, [clientId])

  // Cargar progreso del cliente
  useEffect(() => {
    const loadProgress = async () => {
      if (!clientId) return

      try {
        const progressRef = doc(db, 'clients', clientId, 'progress', 'summary')
        const progressDoc = await getDoc(progressRef)
        if (progressDoc.exists()) {
          const progressData = progressDoc.data()
          setClientProgress({
            monthlyProgress: progressData.monthlyProgress || 0,
            completedDays: progressData.completedDays || 0,
            totalDays: progressData.totalDays || 30
          })
        }
      } catch (error) {
        console.error('Error loading progress:', error)
      }
    }

    loadProgress()
  }, [clientId])

  // Cerrar el banner automáticamente después de 10 segundos
  useEffect(() => {
    if (showInfoModal) {
      const timer = setTimeout(() => {
        setShowInfoModal(false)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [showInfoModal])

  const handleDayClick = (dayIndex: number) => {
    navigate(`/client/${clientId}/workout/${dayIndex + 1}`)
  }

  const handleEditWorkout = (dayIndex: number) => {
    setEditingDayIndex(dayIndex)
  }

  const handleWorkoutSaved = () => {
    // Recargar entrenamientos
    const loadWorkouts = async () => {
      if (!clientId) return
      try {
        const workoutsRef = collection(db, 'clients', clientId, 'workouts')
        const snapshot = await getDocs(workoutsRef)
        
        const customWorkouts: { [key: number]: Workout } = {}
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (data.dayIndex !== undefined) {
            customWorkouts[data.dayIndex] = data as Workout
          }
        })

        const updatedWorkouts = workouts.map((workout, index) => {
          return customWorkouts[index] || workout
        })

        setClientWorkouts(updatedWorkouts)
      } catch (error) {
        console.error('Error reloading workouts:', error)
      }
    }
    loadWorkouts()
  }

  const toggleDaySelection = (dayIndex: number) => {
    setSelectedDays(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dayIndex)) {
        newSet.delete(dayIndex)
      } else {
        newSet.add(dayIndex)
      }
      return newSet
    })
  }

  const handleDeleteSelectedDays = async () => {
    if (selectedDays.size === 0 || !clientId) return

    if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedDays.size} día(s) de entrenamiento?`)) {
      return
    }

    setDeleting(true)
    try {
      const deletePromises = Array.from(selectedDays).map(async (dayIndex) => {
        const workoutRef = doc(db, 'clients', clientId, 'workouts', `day-${dayIndex + 1}`)
        await deleteDoc(workoutRef)
      })

      await Promise.all(deletePromises)
      
      // Recargar entrenamientos
      handleWorkoutSaved()
      setSelectedDays(new Set())
      setSelectionMode(false)
    } catch (error) {
      console.error('Error deleting workouts:', error)
      alert('Error al eliminar los entrenamientos')
    } finally {
      setDeleting(false)
    }
  }

  const handleResetDay = async (dayIndex: number) => {
    if (!clientId) return

    if (!confirm(`¿Estás seguro de que quieres restablecer el día ${dayIndex + 1}? Esto eliminará el progreso completado.`)) {
      return
    }

    try {
      // Eliminar documento de progreso del día
      const progressRef = doc(db, 'clients', clientId, 'progress', `day-${dayIndex + 1}`)
      await deleteDoc(progressRef)
      
      // Eliminar datos de localStorage relacionados
      const feedbackKey = `feedback_${clientId}_day_${dayIndex + 1}`
      const feedbackSubmittedKey = `feedback_submitted_${clientId}_day_${dayIndex + 1}`
      localStorage.removeItem(feedbackKey)
      localStorage.removeItem(feedbackSubmittedKey)
      
      // Actualizar el documento summary para remover el día del dailyProgress
      const summaryRef = doc(db, 'clients', clientId, 'progress', 'summary')
      const summaryDoc = await getDoc(summaryRef)
      
      if (summaryDoc.exists()) {
        const summaryData = summaryDoc.data()
        const dailyProgress = summaryData.dailyProgress || {}
        
        // Remover el día del dailyProgress
        const today = new Date().toISOString().split('T')[0]
        // Buscar y eliminar cualquier entrada que corresponda a este día
        // Necesitamos buscar por fecha de completado, pero como no tenemos esa info aquí,
        // eliminaremos todas las entradas y recalcularemos
        const updatedDailyProgress: { [key: string]: boolean } = {}
        let hasChanges = false
        
        // Recalcular dailyProgress basado en los documentos de progreso existentes
        for (let i = 0; i < 30; i++) {
          if (i !== dayIndex) {
            try {
              const dayProgressRef = doc(db, 'clients', clientId, 'progress', `day-${i + 1}`)
              const dayProgressDoc = await getDoc(dayProgressRef)
              if (dayProgressDoc.exists()) {
                const dayData = dayProgressDoc.data()
                if (dayData.completedAt) {
                  const completedDate = dayData.completedAt?.toDate 
                    ? dayData.completedAt.toDate().toISOString().split('T')[0]
                    : new Date(dayData.completedAt).toISOString().split('T')[0]
                  updatedDailyProgress[completedDate] = true
                }
              }
            } catch (error) {
              // Continuar si hay error
            }
          }
        }
        
        // Calcular días completados
        const completedDays = Object.values(updatedDailyProgress).filter(Boolean).length
        const totalDays = 30
        const monthlyProgress = totalDays > 0 ? (completedDays / totalDays) * 100 : 0
        
        await updateDoc(summaryRef, {
          dailyProgress: updatedDailyProgress,
          completedDays,
          monthlyProgress,
          lastUpdated: serverTimestamp()
        })
      }
      
      // Actualizar estado local
      setWorkoutDurations(prev => {
        const updated = { ...prev }
        delete updated[dayIndex]
        return updated
      })
      
      alert('Día restablecido exitosamente')
    } catch (error) {
      console.error('Error resetting day:', error)
      alert('Error al restablecer el día')
    }
  }

  const formatWorkoutDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seg`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (remainingSeconds === 0) {
      return `${minutes} min`
    }
    return `${minutes} min ${remainingSeconds} seg`
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${
      theme === 'dark' 
        ? 'from-slate-900 via-slate-800 to-slate-900' 
        : 'from-gray-50 via-gray-100 to-gray-200'
    }`}>
      {/* Banner Superior Persistente */}
      <TopBanner />
      
      {/* Espacio para el banner fijo */}
      <div className="h-28 sm:h-32"></div>

      {/* Barra de Progreso del Cliente - Debajo del banner */}
      {!isCoach && clientProgress && (
        <div className="px-4 sm:px-6 lg:px-8 pb-6">
          <div className="max-w-4xl mx-auto">
            <ProgressTracker
              dailyProgress={0}
              monthlyProgress={clientProgress.monthlyProgress}
              completedDays={clientProgress.completedDays}
              totalDays={clientProgress.totalDays}
              showDetails={true}
            />
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="pt-8 pb-12 px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-7xl mx-auto"
        >
          <div className="text-center mb-12">
            <h1 className={`text-5xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{t('workout.month')}</h1>
            <p className={`text-xl ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>{t('workout.interactive')}</p>
            
            {/* Botones de gestión - Solo para coach */}
            {isCoach && (
              <div className="flex justify-center gap-4 mt-6 flex-wrap">
                <button
                  onClick={() => navigate(`/client/${clientId}/profile`)}
                  className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Información del Cliente
                </button>
                <button
                  onClick={() => setIsWorkoutDaysCollapsed(!isWorkoutDaysCollapsed)}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <svg 
                    className={`w-5 h-5 transition-transform ${isWorkoutDaysCollapsed ? '' : 'rotate-180'}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {isWorkoutDaysCollapsed ? 'Expandir Días' : 'Colapsar Días'}
                </button>
                {!selectionMode ? (
                  <button
                    onClick={() => setSelectionMode(true)}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Seleccionar Días
                  </button>
                ) : (
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setSelectionMode(false)
                        setSelectedDays(new Set())
                      }}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDeleteSelectedDays}
                      disabled={selectedDays.size === 0 || deleting}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {deleting ? 'Eliminando...' : `Eliminar (${selectedDays.size})`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        {loadingWorkouts ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className={`mt-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Cargando entrenamientos...
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={isCoach ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" : "w-full max-w-2xl mx-auto"}
          >
            {/* Para clientes, mostrar solo el día actual */}
            {!isCoach ? (
              currentDayIndex !== null ? (
                (() => {
                  const workout = clientWorkouts[currentDayIndex]
                  const dayName = workout.day.split(' - ')[1]?.split(' (')[0]
                  const isSaturday = dayName === 'Sábado'
                  
                  // Verificar si ya se envió retroalimentación para este día
                  const feedbackSubmittedKey = clientId 
                    ? `feedback_submitted_${clientId}_day_${currentDayIndex + 1}`
                    : `feedback_submitted_day_${currentDayIndex + 1}`
                  const isFeedbackSubmitted = localStorage.getItem(feedbackSubmittedKey) === 'true'
                  
                  return (
                    <div className="w-full">
                      {/* Título */}
                      <h2 className={`text-2xl font-bold mb-6 text-center ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Entreno del día
                      </h2>
                      
                      {/* Fichas cuadradas lado a lado */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl mx-auto">
                        {/* Ficha del entrenamiento */}
                        <motion.div
                          key={currentDayIndex}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover={!isFeedbackSubmitted ? { scale: 1.05, y: -5 } : {}}
                          whileTap={!isFeedbackSubmitted ? { scale: 0.95 } : {}}
                          className={`relative rounded-xl p-4 sm:p-6 shadow-lg transition-all bg-gradient-to-br from-primary-600 to-primary-800 aspect-square flex items-center justify-center w-full ${
                            isFeedbackSubmitted 
                              ? 'opacity-60 cursor-not-allowed' 
                              : 'hover:shadow-2xl cursor-pointer'
                          }`}
                        >
                          <div
                            onClick={() => !isFeedbackSubmitted && handleDayClick(currentDayIndex)}
                            className={isFeedbackSubmitted ? 'cursor-not-allowed' : 'cursor-pointer w-full h-full flex flex-col items-center justify-center'}
                          >
                            <div className="text-center">
                              <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                                {currentDayIndex + 1}
                              </div>
                              <div className="text-white font-semibold text-base sm:text-lg mb-1">
                                {workout.day.split(' - ')[1]?.replace(' (Opcional)', '')}
                              </div>
                              {isSaturday && (
                                <div className="text-yellow-300 text-xs sm:text-sm font-semibold mb-1">
                                  (Opcional)
                                </div>
                              )}
                              <div className="text-primary-100 text-xs sm:text-sm mt-2">
                                {workout.sections.reduce((acc, section) => acc + section.exercises.length, 0)} {t('exercise.count')}
                              </div>
                              {isFeedbackSubmitted && (
                                <div className="text-green-300 text-xs font-semibold mt-2">
                                  ✓ Retroalimentación enviada
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                        
                        {/* Ficha RM y PR */}
                        {clientId && (
                          <motion.div
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            className={`relative rounded-xl p-4 sm:p-6 shadow-lg transition-all aspect-square flex items-center justify-center cursor-pointer hover:shadow-2xl w-full ${
                              theme === 'dark'
                                ? 'bg-slate-700 hover:bg-slate-600'
                                : 'bg-white hover:bg-gray-100 border border-gray-300'
                            }`}
                            onClick={() => setShowRMAndPRModal(true)}
                          >
                            <div className="text-center">
                              <div className={`text-3xl sm:text-4xl font-bold mb-2 ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                                RM
                              </div>
                              <div className={`text-lg sm:text-xl font-semibold mb-1 ${
                                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                              }`}>
                                y
                              </div>
                              <div className={`text-3xl sm:text-4xl font-bold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                                PR
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className={`text-center py-12 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/50'
                } px-8`}>
                  <p className={`text-xl font-semibold ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Hoy es domingo - Día de descanso
                  </p>
                  <p className={`text-sm mt-2 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    No hay entrenamiento programado para hoy
                  </p>
                </div>
              )
            ) : (
              // Para el coach, mostrar todos los días
              !isWorkoutDaysCollapsed && clientWorkouts.map((workout, index) => {
              const isSelected = selectedDays.has(index)
              return (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  whileHover={!selectionMode ? { scale: 1.05, y: -5 } : {}}
                  whileTap={!selectionMode ? { scale: 0.95 } : {}}
                  className={`relative rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all ${
                    selectionMode
                      ? isSelected
                        ? 'bg-gradient-to-br from-green-600 to-green-800 ring-4 ring-green-400'
                        : 'bg-gradient-to-br from-primary-600 to-primary-800 opacity-70'
                      : 'bg-gradient-to-br from-primary-600 to-primary-800'
                  }`}
                >
                  {selectionMode ? (
                    <div
                      onClick={() => toggleDaySelection(index)}
                      className="cursor-pointer"
                    >
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          {isSelected && (
                            <svg className="w-8 h-8 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          <div className="text-3xl font-bold text-white">
                            {index + 1}
                          </div>
                        </div>
                        <div className="text-white font-semibold text-lg">
                          {workout.day.split(' - ')[1]}
                        </div>
                        {workoutDates[index] && (
                          <div className="text-primary-200 text-xs mt-1">
                            {workoutDates[index].toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        )}
                        <div className="text-primary-100 text-sm mt-2">
                          {workout.sections.reduce((acc, section) => acc + section.exercises.length, 0)} {t('exercise.count')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => handleDayClick(index)}
                        className="cursor-pointer"
                      >
                        <div className="text-center">
                          <div className="text-3xl font-bold text-white mb-2">
                            Día {index + 1}
                          </div>
                          {workoutDates[index] && (
                            <div className="text-primary-200 text-xs mb-1">
                              {workoutDates[index].toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                          )}
                          <div className="text-white font-semibold text-lg">
                            {workout.day.split(' - ')[1]}
                          </div>
                          <div className="text-primary-100 text-sm mt-2">
                            {workout.sections.reduce((acc, section) => acc + section.exercises.length, 0)} {t('exercise.count')}
                          </div>
                          {workoutDurations[index] && (
                            <div className="text-primary-200 text-xs mt-1 font-semibold">
                              ⏱️ {formatWorkoutDuration(workoutDurations[index])}
                            </div>
                          )}
                        </div>
                      </div>
                      {isCoach && (
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditWorkout(index)
                            }}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                            title="Editar entrenamiento"
                          >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {workoutDurations[index] && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleResetDay(index)
                              }}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                              title="Restablecer día"
                            >
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )
            }))}
          </motion.div>
        )}
        </motion.div>

        {/* Mensaje Publicitario Lateral - Inferior Derecha - Solo para clientes, no para el coach */}
        <AnimatePresence>
          {showInfoModal && !isCoach && (
            <motion.div
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.6 }}
              className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto z-50 max-w-sm sm:w-full"
            >
              <div className="bg-red-600/60 backdrop-blur-md text-white rounded-xl shadow-2xl border-2 border-red-500/30 p-4 relative overflow-hidden">
                
                {/* Botón de cerrar */}
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="absolute top-2 right-2 text-white hover:text-red-200 transition-colors z-10 bg-red-700/50 hover:bg-red-700/70 rounded-full p-1.5 shadow-lg"
                  aria-label="Cerrar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Contenido */}
                <div className="flex items-start gap-2 pr-6">
                  {/* Icono de advertencia */}
                  <div className="flex-shrink-0 mt-0.5">
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  {/* Texto optimizado */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-relaxed break-words">
                      <span className="hidden sm:inline">{t('alert.title')} {t('alert.text1')}</span>
                      <span className="sm:hidden">Dolor o molestia: revisa alternativas. Para peso, escríbeme.</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Workout Modal */}
      {editingDayIndex !== null && (
        <EditWorkoutModal
          isOpen={editingDayIndex !== null}
          onClose={() => setEditingDayIndex(null)}
          clientId={clientId || ''}
          dayIndex={editingDayIndex}
          initialWorkout={clientWorkouts[editingDayIndex]}
          onSave={handleWorkoutSaved}
        />
      )}

      {/* RM and PR Modal */}
      {clientId && (
        <RMAndPRModal
          isOpen={showRMAndPRModal}
          onClose={() => setShowRMAndPRModal(false)}
          clientId={clientId}
          isCoach={isCoach}
        />
      )}
    </div>
  )
}

export default ClientWorkoutPage

