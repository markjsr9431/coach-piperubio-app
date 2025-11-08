import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useTimer } from '../contexts/TimerContext'
import { useAuth } from '../contexts/AuthContext'
import { workouts, Workout } from '../data/workouts'
import { db } from '../firebaseConfig'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import ExerciseItem from '../components/ExerciseItem'
import VideoModal from '../components/VideoModal'
import TimerModal from '../components/TimerModal'
import TimerFloating from '../components/TimerFloating'
import WorkoutComplete from '../components/WorkoutComplete'
import ProgressBar from '../components/ProgressBar'
import TopBanner from '../components/TopBanner'

const WorkoutPage = () => {
  const { day, clientId } = useParams<{ day: string; clientId?: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { user } = useAuth()
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'
  const {
    mode,
    isRunning,
    time,
    currentRound,
    rounds,
    isWorkPhase,
    setIsRunning,
    resetTimer,
  } = useTimer()
  const dayIndex = day ? parseInt(day) - 1 : 0
  const [workout, setWorkout] = useState<Workout | null>(workouts[dayIndex] || null)
  const [loadingWorkout, setLoadingWorkout] = useState(!!clientId)
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [showTimer, setShowTimer] = useState(false)
  const [isTimerMinimized, setIsTimerMinimized] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [lastCompletedCount, setLastCompletedCount] = useState(0)
  const [hasShownComplete, setHasShownComplete] = useState(false)
  const [dayProgress, setDayProgress] = useState<{ progress: number; completedExercises: Set<string> } | null>(null)
  
  // Timer para tracking de tiempo de entrenamiento
  const workoutStartTime = useRef<Date | null>(null)
  const workoutTimerRef = useRef<NodeJS.Timeout | null>(null)

  const totalExercises = workout?.sections.reduce((acc, section) => acc + section.exercises.length, 0) || 0
  const progress = totalExercises > 0 ? (completedExercises.size / totalExercises) * 100 : 0
  const isWorkoutComplete = totalExercises > 0 && completedExercises.size === totalExercises
  const isDayCompleted = dayProgress?.progress === 100

  // Cargar entrenamiento personalizado si hay clientId
  useEffect(() => {
    const loadWorkout = async () => {
      if (clientId) {
        setLoadingWorkout(true)
        try {
          const workoutRef = doc(db, 'clients', clientId, 'workouts', `day-${dayIndex + 1}`)
          const workoutDoc = await getDoc(workoutRef)
          
          if (workoutDoc.exists()) {
            const data = workoutDoc.data()
            setWorkout(data as Workout)
          } else {
            // Si no hay entrenamiento personalizado, usar el predeterminado
            setWorkout(workouts[dayIndex] || null)
          }

          // Cargar progreso guardado del día
          const progressRef = doc(db, 'clients', clientId, 'progress', `day-${dayIndex + 1}`)
          const progressDoc = await getDoc(progressRef)
          
          // Obtener el workout cargado (puede ser personalizado o predeterminado)
          const loadedWorkout = workoutDoc.exists() 
            ? (workoutDoc.data() as Workout)
            : (workouts[dayIndex] || null)
          
          if (progressDoc.exists()) {
            const progressData = progressDoc.data()
            const savedProgress = progressData.progress || 0
            
            // Si el día está completo, cargar los ejercicios completados
            if (savedProgress === 100 && loadedWorkout) {
              // Reconstruir el set de ejercicios completados basado en el progreso guardado
              const completedSet = new Set<string>()
              loadedWorkout.sections.forEach((section) => {
                section.exercises.forEach((exercise, exerciseIndex) => {
                  const exerciseKey = `${section.name}-${exercise.name}-${exerciseIndex}`
                  // Si el progreso es 100%, todos los ejercicios están completados
                  completedSet.add(exerciseKey)
                })
              })
              setCompletedExercises(completedSet)
              setDayProgress({ progress: 100, completedExercises: completedSet })
              // Establecer lastCompletedCount al total para evitar que se muestre el modal al cargar un día ya completo
              setLastCompletedCount(completedSet.size)
              setHasShownComplete(true) // Marcar que ya se mostró (o no debe mostrarse porque ya estaba completo)
            } else {
              setDayProgress({ progress: savedProgress, completedExercises: new Set() })
              setLastCompletedCount(0)
            }
          } else {
            setDayProgress(null)
            setLastCompletedCount(0)
          }
        } catch (error) {
          console.error('Error loading workout:', error)
          setWorkout(workouts[dayIndex] || null)
          setDayProgress(null)
        } finally {
          setLoadingWorkout(false)
        }
      } else {
        setWorkout(workouts[dayIndex] || null)
        setLoadingWorkout(false)
        setDayProgress(null)
      }
    }

    loadWorkout()
  }, [clientId, dayIndex])

  useEffect(() => {
    // Expand first section by default
    if (workout && workout.sections && workout.sections.length > 0) {
      setExpandedSections(new Set([workout.sections[0].name]))
    }
    // Reset completion state when day changes
    setShowComplete(false)
    setHasShownComplete(false)
    // No resetear lastCompletedCount aquí, se establecerá cuando se cargue el progreso
    
    // Iniciar timer de entrenamiento cuando se carga la página (solo para clientes y si el día no está completo)
    if (!isCoach && clientId && workout && !isDayCompleted) {
      workoutStartTime.current = new Date()
    }
    
    return () => {
      if (workoutTimerRef.current) {
        clearInterval(workoutTimerRef.current)
      }
    }
  }, [day, workout, clientId, isCoach, isDayCompleted])

  // Guardar progreso en Firestore cuando cambia
  useEffect(() => {
    const saveProgress = async () => {
      if (!clientId || !workout) return

      try {
        const progressRef = doc(db, 'clients', clientId, 'progress', `day-${dayIndex + 1}`)
        const progress = totalExercises > 0 ? (completedExercises.size / totalExercises) * 100 : 0
        
        // Calcular tiempo de entrenamiento si se completó
        let workoutDuration = null
        if (progress === 100 && workoutStartTime.current) {
          const endTime = new Date()
          workoutDuration = Math.round((endTime.getTime() - workoutStartTime.current.getTime()) / 1000) // en segundos
        }
        
        await setDoc(progressRef, {
          dayIndex,
          progress,
          completedExercises: completedExercises.size,
          totalExercises,
          completedAt: progress === 100 ? serverTimestamp() : null,
          workoutDuration: workoutDuration,
          lastUpdated: serverTimestamp()
        }, { merge: true })

        // Actualizar resumen mensual
        const summaryRef = doc(db, 'clients', clientId, 'progress', 'summary')
        const summaryDoc = await getDoc(summaryRef)
        const currentData = summaryDoc.data() || {}
        
        const today = new Date().toISOString().split('T')[0]
        const dailyProgress = currentData.dailyProgress || {}
        dailyProgress[today] = progress === 100

        // Calcular días completados
        const completedDays = Object.values(dailyProgress).filter(Boolean).length
        
        // Calcular tiempo promedio de entrenamiento
        const allProgressRefs = await Promise.all(
          Array.from({ length: workouts.length }, async (_, i) => {
            try {
              const dayProgressRef = doc(db, 'clients', clientId, 'progress', `day-${i + 1}`)
              const dayProgressDoc = await getDoc(dayProgressRef)
              if (dayProgressDoc.exists()) {
                const dayData = dayProgressDoc.data()
                return dayData.workoutDuration || null
              }
            } catch (error) {
              // Ignorar errores de días sin progreso
            }
            return null
          })
        )
        
        const validDurations = allProgressRefs.filter((d): d is number => d !== null)
        const averageWorkoutTime = validDurations.length > 0
          ? Math.round(validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length)
          : null

        await setDoc(summaryRef, {
          totalDays: workouts.length,
          completedDays,
          monthlyProgress: (completedDays / workouts.length) * 100,
          dailyProgress,
          averageWorkoutTime,
          lastUpdated: serverTimestamp()
        }, { merge: true })

        // Actualizar estado local dayProgress cuando el progreso llega al 100%
        if (progress === 100) {
          setDayProgress(prev => {
            if (prev?.progress !== 100) {
              return { progress: 100, completedExercises: new Set(completedExercises) }
            }
            return prev
          })
        } else {
          setDayProgress(prev => {
            if (prev?.progress !== progress) {
              return { progress, completedExercises: new Set(completedExercises) }
            }
            return prev
          })
        }
      } catch (error) {
        console.error('Error saving progress:', error)
      }
    }

    // Debounce para no guardar en cada cambio
    const timeoutId = setTimeout(saveProgress, 1000)
    return () => clearTimeout(timeoutId)
  }, [clientId, dayIndex, completedExercises.size, totalExercises, workout])

  // Detectar cuando se completa el entrenamiento - Solo para clientes
  useEffect(() => {
    // Solo procesar si es un cliente (no el coach)
    if (isCoach) {
      return
    }

    const currentCompletedCount = completedExercises.size
    
    // Si todos los ejercicios están completados y no se ha mostrado el mensaje aún
    if (isWorkoutComplete && totalExercises > 0 && !hasShownComplete) {
      // Verificar que acabamos de completar todos (el conteo anterior era menor)
      if (currentCompletedCount === totalExercises && lastCompletedCount < totalExercises) {
        // Pequeño delay para mejor UX
        setTimeout(() => {
          setShowComplete(true)
          setHasShownComplete(true)
        }, 500)
      }
    }
    
    // Actualizar el último conteo
    if (currentCompletedCount !== lastCompletedCount) {
      setLastCompletedCount(currentCompletedCount)
    }
    
    // Si el usuario desmarca un ejercicio (ya no está completo), ocultar la alerta si está visible
    if (!isWorkoutComplete && showComplete) {
      setShowComplete(false)
      setHasShownComplete(false)
    }
  }, [isWorkoutComplete, completedExercises.size, totalExercises, lastCompletedCount, showComplete, hasShownComplete, isCoach])

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName)
      } else {
        newSet.add(sectionName)
      }
      return newSet
    })
  }

  const toggleExercise = (exerciseKey: string) => {
    // Si es cliente y el día está completo, no permitir cambios
    if (!isCoach && isDayCompleted) {
      return
    }
    
    // Si es cliente y el ejercicio ya está completado, no permitir desseleccionar
    if (!isCoach && completedExercises.has(exerciseKey)) {
      return
    }
    
    setCompletedExercises(prev => {
      const newSet = new Set(prev)
      if (newSet.has(exerciseKey)) {
        // Solo permitir desseleccionar si es el coach
        if (isCoach) {
          newSet.delete(exerciseKey)
        }
      } else {
        newSet.add(exerciseKey)
      }
      return newSet
    })
  }

  const handlePreviousDay = () => {
    if (dayIndex > 0) {
      if (clientId) {
        navigate(`/client/${clientId}/workout/${dayIndex}`)
      } else {
        navigate(`/workout/${dayIndex}`)
      }
    }
  }

  const handleNextDay = () => {
    if (dayIndex < workouts.length - 1) {
      if (clientId) {
        navigate(`/client/${clientId}/workout/${dayIndex + 2}`)
      } else {
        navigate(`/workout/${dayIndex + 2}`)
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
      
      {/* Espacio para el banner fijo - Ajustado para evitar superposición */}
      <div className="h-28 sm:h-32"></div>
      
      <div className="max-w-4xl mx-auto pt-6 pb-8 px-4 sm:px-6 lg:px-8">
        {loadingWorkout ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className={`mt-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Cargando entrenamiento...
            </p>
          </div>
        ) : !workout ? (
          <div className="text-center py-12">
            <p className={`text-xl ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
              Entrenamiento no encontrado
            </p>
          </div>
        ) : (
          <>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Botón de cronómetro - Solo visible para clientes, no para el coach */}
          {!isCoach && (
            <>
              <div className="hidden sm:flex items-center justify-end mb-4">
                <button
                  onClick={() => setShowTimer(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cronómetro
                </button>
              </div>
              
              <div className="sm:hidden flex justify-end mb-6 mt-2">
                <button
                  onClick={() => setShowTimer(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cronómetro
                </button>
              </div>
            </>
          )}

          <h1 className={`text-4xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>{workout.day}</h1>
          <ProgressBar progress={progress} />
        </motion.div>

        {/* Sections */}
        <div className="space-y-4">
          {workout.sections.map((section, sectionIndex) => (
            <motion.div
              key={section.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg"
            >
              <button
                onClick={() => toggleSection(section.name)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-700/50 transition-colors"
              >
                <h2 className="text-2xl font-bold text-white">{section.name}</h2>
                <motion.svg
                  animate={{ rotate: expandedSections.has(section.name) ? 180 : 0 }}
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              <AnimatePresence>
                {expandedSections.has(section.name) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-4 space-y-3">
                      {section.exercises.map((exercise, exerciseIndex) => {
                        const exerciseKey = `${section.name}-${exercise.name}-${exerciseIndex}`
                        const isCompleted = completedExercises.has(exerciseKey)
                        // Deshabilitar si es cliente y el día está completo, o si es cliente y el ejercicio ya está completado
                        const isDisabled = !isCoach && (isDayCompleted || isCompleted)
                        return (
                          <ExerciseItem
                            key={exerciseKey}
                            exercise={exercise}
                            isCompleted={isCompleted}
                            onToggle={() => toggleExercise(exerciseKey)}
                            disabled={isDisabled}
                          />
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8 gap-4">
          <button
            onClick={handlePreviousDay}
            disabled={dayIndex === 0 || (!isCoach && isDayCompleted)}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              dayIndex === 0 || (!isCoach && isDayCompleted)
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            ← Día Anterior
          </button>
          <button
            onClick={handleNextDay}
            disabled={dayIndex === workouts.length - 1 || (!isCoach && isDayCompleted)}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              dayIndex === workouts.length - 1 || (!isCoach && isDayCompleted)
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            Día Siguiente →
          </button>
        </div>
          </>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal
          videoUrl={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}

      {/* Timer Modal - Solo visible para clientes */}
      {!isCoach && (
        <AnimatePresence>
          {showTimer && !isTimerMinimized && (
            <TimerModal 
              onClose={() => {
                setShowTimer(false)
                setIsTimerMinimized(false)
                resetTimer()
              }} 
              onMinimize={() => {
                setIsTimerMinimized(true)
                setShowTimer(false)
              }}
              isMinimized={isTimerMinimized}
            />
          )}
        </AnimatePresence>
      )}

      {/* Timer Flotante - Solo visible para clientes */}
      {!isCoach && (
        <AnimatePresence>
          {isTimerMinimized && (
            <TimerFloating
              time={time}
              mode={mode}
              isRunning={isRunning}
              isWorkPhase={isWorkPhase}
              currentRound={currentRound}
              rounds={rounds}
              onMaximize={() => {
                setIsTimerMinimized(false)
                setShowTimer(true)
              }}
              onClose={() => {
                setIsTimerMinimized(false)
                setShowTimer(false)
                resetTimer()
              }}
              onToggle={() => setIsRunning(!isRunning)}
            />
          )}
        </AnimatePresence>
      )}

      {/* Animación de Entrenamiento Finalizado - Solo para clientes */}
      {showComplete && !isCoach && (
        <WorkoutComplete onClose={() => setShowComplete(false)} />
      )}
    </div>
  )
}

export default WorkoutPage

