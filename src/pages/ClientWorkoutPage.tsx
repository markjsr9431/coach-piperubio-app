import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { workouts, Workout } from '../data/workouts'
import { db } from '../firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
import TopBanner from '../components/TopBanner'
import EditWorkoutModal from '../components/EditWorkoutModal'

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
      } catch (error) {
        console.error('Error loading workouts:', error)
        setClientWorkouts(workouts)
      } finally {
        setLoadingWorkouts(false)
      }
    }

    loadWorkouts()
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
      <div className="h-40 sm:h-48"></div>

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
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          >
            {clientWorkouts.map((workout, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="relative bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-shadow"
              >
                <div
                  onClick={() => handleDayClick(index)}
                  className="cursor-pointer"
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">
                      {index + 1}
                    </div>
                    <div className="text-white font-semibold text-lg">
                      {workout.day.split(' - ')[1]}
                    </div>
                    <div className="text-primary-100 text-sm mt-2">
                      {workout.sections.reduce((acc, section) => acc + section.exercises.length, 0)} {t('exercise.count')}
                    </div>
                  </div>
                </div>
                {isCoach && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditWorkout(index)
                    }}
                    className="absolute top-2 right-2 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    title="Editar entrenamiento"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </motion.div>
            ))}
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
              className="fixed bottom-6 right-6 z-50 max-w-sm w-full sm:w-96"
            >
              <div className="bg-red-600/95 backdrop-blur-md text-white rounded-xl shadow-2xl border-2 border-red-500/50 p-5 relative overflow-hidden">
                
                {/* Botón de cerrar */}
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="absolute top-3 right-3 text-white hover:text-red-200 transition-colors z-10 bg-red-700/70 hover:bg-red-700 rounded-full p-1.5 shadow-lg"
                  aria-label="Cerrar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Contenido */}
                <div className="flex items-start gap-3 pr-6">
                  {/* Icono de advertencia */}
                  <div className="flex-shrink-0 mt-1">
                    <svg 
                      className="w-6 h-6 sm:w-7 sm:h-7" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2.5} 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  {/* Texto */}
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-bold uppercase leading-tight mb-1">
                      {t('alert.title')}
                    </p>
                    <p className="text-xs sm:text-sm font-bold uppercase leading-tight mb-1">
                      {t('alert.text1')}
                    </p>
                    <p className="text-xs sm:text-sm font-bold uppercase leading-tight mb-1">
                      {t('alert.text2')}
                    </p>
                    <p className="text-xs sm:text-sm font-bold uppercase leading-tight">
                      {t('alert.text3')}
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
    </div>
  )
}

export default ClientWorkoutPage

