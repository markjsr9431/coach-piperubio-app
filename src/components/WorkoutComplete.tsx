import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'

interface WorkoutCompleteProps {
  onClose: () => void
}

const WorkoutComplete = ({ onClose }: WorkoutCompleteProps) => {
  const { theme } = useTheme()
  const { t } = useLanguage()
  const [canClose, setCanClose] = useState(false)
  
  // Permitir cerrar después de 20 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanClose(true)
    }, 20000)
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={canClose ? onClose : undefined}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 50 }}
          transition={{ type: "spring", duration: 0.6 }}
          onClick={(e) => e.stopPropagation()}
          className={`${
            theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'
          } rounded-2xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden`}
        >
          {/* Botón de cerrar */}
          {canClose && (
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-slate-700 text-slate-300 hover:text-white'
                  : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {/* Efectos decorativos */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-primary-700/20"></div>
          
          {/* Contenido */}
          <div className="relative z-10 text-center">
            {/* Icono de check animado */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6 w-20 h-20 rounded-full bg-green-500 flex items-center justify-center"
            >
              <motion.svg
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </motion.svg>
            </motion.div>

            {/* Título principal */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className={`text-4xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              {t('workout.complete.title')}
            </motion.h2>

            {/* Subtítulo */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className={`text-lg mb-6 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}
            >
              {t('workout.complete.subtitle')}
            </motion.p>

            {/* Botón de cerrar */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={canClose ? onClose : undefined}
              disabled={!canClose}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                canClose
                  ? 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {canClose ? t('workout.complete.button') : 'Espera...'}
            </motion.button>
          </div>

          {/* Confeti/Estrellas decorativas */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0, rotate: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                rotate: [0, 180, 360],
                x: [0, Math.random() * 100 - 50],
                y: [0, Math.random() * 100 - 50],
              }}
              transition={{
                delay: 0.5 + i * 0.1,
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 2,
              }}
              className="absolute text-yellow-400 text-2xl"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
              }}
            >
              ⭐
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default WorkoutComplete










