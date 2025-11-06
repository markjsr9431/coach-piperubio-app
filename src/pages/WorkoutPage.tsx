import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useTimer } from '../contexts/TimerContext'
import { workouts } from '../data/workouts'
import ExerciseItem from '../components/ExerciseItem'
import VideoModal from '../components/VideoModal'
import TimerModal from '../components/TimerModal'
import TimerFloating from '../components/TimerFloating'
import WorkoutComplete from '../components/WorkoutComplete'
import ProgressBar from '../components/ProgressBar'
import TopBanner from '../components/TopBanner'

const WorkoutPage = () => {
  const { day } = useParams<{ day: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
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
  const workout = workouts[dayIndex]
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [showTimer, setShowTimer] = useState(false)
  const [isTimerMinimized, setIsTimerMinimized] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [lastCompletedCount, setLastCompletedCount] = useState(0)

  const totalExercises = workout?.sections.reduce((acc, section) => acc + section.exercises.length, 0) || 0
  const progress = totalExercises > 0 ? (completedExercises.size / totalExercises) * 100 : 0
  const isWorkoutComplete = totalExercises > 0 && completedExercises.size === totalExercises

  useEffect(() => {
    // Expand first section by default
    if (workout?.sections.length > 0) {
      setExpandedSections(new Set([workout.sections[0].name]))
    }
    // Reset completion state when day changes
    setShowComplete(false)
    setLastCompletedCount(0)
  }, [day])

  // Detectar cuando se completa el entrenamiento
  useEffect(() => {
    const currentCompletedCount = completedExercises.size
    
    // Si todos los ejercicios están completados y no se había mostrado antes para este estado
    if (isWorkoutComplete && totalExercises > 0) {
      // Solo mostrar si acabamos de completar todos (no si ya estaban todos completados)
      if (currentCompletedCount === totalExercises && lastCompletedCount < totalExercises) {
        // Pequeño delay para mejor UX
        setTimeout(() => {
          setShowComplete(true)
        }, 500)
      }
    }
    
    // Actualizar el último conteo
    setLastCompletedCount(currentCompletedCount)
    
    // Si el usuario desmarca un ejercicio (ya no está completo), ocultar la alerta si está visible
    if (!isWorkoutComplete && showComplete) {
      setShowComplete(false)
    }
  }, [isWorkoutComplete, completedExercises.size, totalExercises, lastCompletedCount, showComplete])

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
    setCompletedExercises(prev => {
      const newSet = new Set(prev)
      if (newSet.has(exerciseKey)) {
        newSet.delete(exerciseKey)
      } else {
        newSet.add(exerciseKey)
      }
      return newSet
    })
  }

  const handlePreviousDay = () => {
    if (dayIndex > 0) {
      navigate(`/workout/${dayIndex}`)
    }
  }

  const handleNextDay = () => {
    if (dayIndex < workouts.length - 1) {
      navigate(`/workout/${dayIndex + 2}`)
    }
  }

  if (!workout) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${
        theme === 'dark' 
          ? 'from-slate-900 via-slate-800 to-slate-900' 
          : 'from-gray-50 via-gray-100 to-gray-200'
      } flex items-center justify-center`}>
        <div className={`text-xl ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>Día no encontrado</div>
      </div>
    )
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Botón de volver al inicio - Solo visible en desktop, en móvil está en el banner */}
          <div className="hidden sm:flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className={`${
                theme === 'dark' ? 'text-white hover:text-primary-400' : 'text-gray-900 hover:text-primary-600'
              } transition-colors flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </button>
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
          
          {/* Botón de cronómetro móvil - Separado del banner con más espacio */}
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
                        return (
                          <ExerciseItem
                            key={exerciseKey}
                            exercise={exercise}
                            isCompleted={completedExercises.has(exerciseKey)}
                            onToggle={() => toggleExercise(exerciseKey)}
                            onWatchVideo={() => setSelectedVideo(exercise.video)}
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
            disabled={dayIndex === 0}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              dayIndex === 0
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            ← Día Anterior
          </button>
          <button
            onClick={handleNextDay}
            disabled={dayIndex === workouts.length - 1}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              dayIndex === workouts.length - 1
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            Día Siguiente →
          </button>
        </div>
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal
          videoUrl={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}

      {/* Timer Modal */}
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

      {/* Timer Flotante */}
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

      {/* Animación de Entrenamiento Finalizado */}
      {showComplete && (
        <WorkoutComplete onClose={() => setShowComplete(false)} />
      )}
    </div>
  )
}

export default WorkoutPage

