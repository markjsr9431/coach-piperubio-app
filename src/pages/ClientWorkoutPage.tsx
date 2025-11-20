import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'
import TopBanner from '../components/TopBanner'
import ProgressTracker from '../components/ProgressTracker'
import RMAndPRModal from '../components/RMAndPRModal'
import ClientInfoSection from '../components/ClientInfoSection'

const ClientWorkoutPage = () => {
  const { clientId } = useParams<{ clientId: string }>()
  const { theme } = useTheme()
  const { t } = useLanguage()
  const { user } = useAuth()
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'
  const [showInfoModal, setShowInfoModal] = useState(true)
  const [clientProgress, setClientProgress] = useState<{
    monthlyProgress: number
    completedDays: number
    totalDays: number
  } | null>(null)
  const [showRMAndPRModal, setShowRMAndPRModal] = useState(false)


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




  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.1
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0 }}
          className="max-w-7xl mx-auto"
        >
          <div className="text-center mb-12">
            <h1 className={`text-5xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>{t('workout.month')}</h1>
            <p className={`text-xl ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>{t('workout.interactive')}</p>
            
            {/* Información del Cliente - Integrada directamente - Solo para coach */}
            {isCoach && clientId && (
              <div className="mt-8">
                <ClientInfoSection
                  clientId={clientId}
                  showSaveButtons={false} // No save buttons on this page
                />
              </div>
            )}
          </div>

          {/* Contenido para clientes */}
          {!isCoach && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="w-full max-w-2xl mx-auto"
            >
              {/* Botones de Contacto del Coach - Solo para clientes */}
              <div className={`mb-6 rounded-xl shadow-lg p-4 sm:p-6 ${
                theme === 'dark' 
                  ? 'bg-slate-800/80 border border-slate-700' 
                  : 'bg-white border border-gray-200'
              }`}>
                <h3 className={`text-lg sm:text-xl font-bold mb-4 text-center ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Contactar al Coach
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {/* WhatsApp */}
                  <a
                    href="https://wa.me/573127064758"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg transition-all hover:scale-105 ${
                      theme === 'dark' 
                        ? 'bg-green-600/20 hover:bg-green-600/30 border border-green-500/50' 
                        : 'bg-green-50 hover:bg-green-100 border border-green-200'
                    }`}
                  >
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span className={`text-xs font-semibold ${
                      theme === 'dark' ? 'text-green-300' : 'text-green-700'
                    }`}>
                      WhatsApp
                    </span>
                  </a>

                  {/* Llamada */}
                  <a
                    href="tel:+573127064758"
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg transition-all hover:scale-105 ${
                      theme === 'dark' 
                        ? 'bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50' 
                        : 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className={`text-xs font-semibold ${
                      theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      Llamar
                    </span>
                  </a>

                  {/* Instagram */}
                  <a
                    href="https://www.instagram.com/coach.piperubio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg transition-all hover:scale-105 ${
                      theme === 'dark' 
                        ? 'bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/50' 
                        : 'bg-pink-50 hover:bg-pink-100 border border-pink-200'
                    }`}
                  >
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.98-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.98-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span className={`text-xs font-semibold ${
                      theme === 'dark' ? 'text-pink-300' : 'text-pink-700'
                    }`}>
                      Instagram
                    </span>
                  </a>

                  {/* YouTube */}
                  <a
                    href="https://www.youtube.com/@Coachpiperubio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg transition-all hover:scale-105 ${
                      theme === 'dark' 
                        ? 'bg-red-600/20 hover:bg-red-600/30 border border-red-500/50' 
                        : 'bg-red-50 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <span className={`text-xs font-semibold ${
                      theme === 'dark' ? 'text-red-300' : 'text-red-700'
                    }`}>
                      YouTube
                    </span>
                  </a>

                  {/* TikTok */}
                  <a
                    href="https://www.tiktok.com/@coach.piperubio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg transition-all hover:scale-105 ${
                      theme === 'dark' 
                        ? 'bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/50' 
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-gray-900 dark:text-gray-100" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.18 6.18 0 0 0-1-.05A6.27 6.27 0 0 0 5 20.1a6.27 6.27 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    <span className={`text-xs font-semibold ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      TikTok
                    </span>
                  </a>
                </div>
              </div>
              
              {/* Ficha RM y PR */}
              {clientId && (
                <motion.div
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className={`relative rounded-xl p-1 sm:p-3 shadow-lg transition-all min-h-[120px] sm:aspect-square flex items-center justify-center cursor-pointer hover:shadow-2xl w-full max-w-md mx-auto ${
                    theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600'
                      : 'bg-white hover:bg-gray-100 border border-gray-300'
                  }`}
                  onClick={() => setShowRMAndPRModal(true)}
                >
                  <div className="text-center px-2">
                    <div className={`text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      RM
                    </div>
                    <div className={`text-base sm:text-xl font-semibold mb-0.5 sm:mb-1 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      y
                    </div>
                    <div className={`text-2xl sm:text-4xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      PR
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

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

