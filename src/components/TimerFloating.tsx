import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

interface TimerFloatingProps {
  time: number
  mode: 'free' | 'tabata' | 'emom'
  isRunning: boolean
  isWorkPhase?: boolean
  currentRound?: number
  rounds?: number
  onMaximize: () => void
  onClose: () => void
  onToggle: () => void
}

const TimerFloating = ({
  time,
  mode,
  isRunning,
  isWorkPhase,
  currentRound,
  rounds,
  onMaximize,
  onClose,
  onToggle
}: TimerFloatingProps) => {
  const { theme } = useTheme()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={`fixed bottom-6 left-6 z-50 ${
        theme === 'dark' ? 'bg-slate-800' : 'bg-gray-700'
      } rounded-xl shadow-2xl border-2 ${
        mode === 'tabata' && !isWorkPhase 
          ? 'border-red-500' 
          : 'border-primary-500'
      } overflow-hidden`}
    >
      <div className="p-4 min-w-[200px]">
        {/* Header con botones */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onMaximize}
            className="text-white hover:text-primary-400 transition-colors"
            aria-label="Maximizar"
            title="Maximizar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 transition-colors"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tiempo */}
        <div 
          className={`text-3xl font-bold text-center mb-2 ${
            mode === 'tabata' && !isWorkPhase ? 'text-red-400' : 'text-white'
          }`}
        >
          {formatTime(time)}
        </div>

        {/* Info adicional para Tabata */}
        {mode === 'tabata' && (
          <div className="text-xs text-slate-300 text-center mb-2">
            <div>Ronda {currentRound} / {rounds}</div>
            <div className={`font-semibold ${isWorkPhase ? 'text-green-400' : 'text-red-400'}`}>
              {isWorkPhase ? 'TRABAJO' : 'DESCANSO'}
            </div>
          </div>
        )}

        {/* Info para EMOM */}
        {mode === 'emom' && (
          <div className="text-xs text-slate-300 text-center mb-2">
            Minuto {Math.floor(time / 60) + 1}
          </div>
        )}

        {/* Botón de pausar/reanudar */}
        <button
          onClick={onToggle}
          className={`w-full py-2 rounded-lg font-semibold transition-colors ${
            isRunning 
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {isRunning ? 'Pausar' : 'Reanudar'}
        </button>
      </div>
    </motion.div>
  )
}

export default TimerFloating




