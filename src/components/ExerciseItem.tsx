import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

interface ExerciseItemProps {
  exercise: {
    name: string
    sets: string
    video: string
  }
  isCompleted: boolean
  onToggle: () => void
  disabled?: boolean
}

const ExerciseItem = ({ exercise, isCompleted, onToggle, disabled = false }: ExerciseItemProps) => {
  const { theme } = useTheme()

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={disabled ? undefined : onToggle}
      className={`${
        theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-200/50'
      } rounded-lg p-4 border-2 transition-all ${
        isCompleted 
          ? 'border-green-500 bg-green-500/10' 
          : theme === 'dark' ? 'border-slate-600' : 'border-gray-300'
      } ${disabled ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onToggle()
        }
      }}
      aria-label={isCompleted ? 'Marcar como no completado' : 'Marcar como completado'}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Casilla de selección - Tamaño y forma fijos */}
            <div
              className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                disabled
                  ? 'opacity-50'
                  : ''
              } ${
                isCompleted
                  ? 'bg-green-500 border-green-500'
                  : theme === 'dark' 
                    ? 'border-slate-400 bg-transparent' 
                    : 'border-gray-400 bg-transparent'
              }`}
            >
              {isCompleted && (
                <svg 
                  className="w-4 h-4 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  style={{ minWidth: '16px', minHeight: '16px' }}
                >
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <h3 className={`text-lg font-semibold ${
              isCompleted 
                ? 'text-green-300 line-through' 
                : theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {exercise.name}
            </h3>
          </div>
          <p className={`ml-9 ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
          }`}>
            {exercise.sets}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default ExerciseItem

