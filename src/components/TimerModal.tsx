import { motion, AnimatePresence } from 'framer-motion'
import { useTimer } from '../contexts/TimerContext'

interface TimerModalProps {
  onClose: () => void
  onMinimize?: () => void
  isMinimized?: boolean
}

const TimerModal = ({ onClose, onMinimize, isMinimized = false }: TimerModalProps) => {
  const {
    mode,
    setMode,
    isRunning,
    setIsRunning,
    time,
    setTime,
    rounds,
    setRounds,
    workTime,
    setWorkTime,
    restTime,
    setRestTime,
    currentRound,
    setCurrentRound,
    isWorkPhase,
    setIsWorkPhase,
    resetTimer,
  } = useTimer()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleReset = () => {
    resetTimer()
  }

  const handleStart = () => {
    const wasRunning = isRunning
    
    if (!isRunning && time === 0 && mode !== 'free') {
      setTime(0)
    }
    setIsRunning(!isRunning)
    
    // Minimizar cuando se inicia por primera vez (no cuando se pausa)
    if (!wasRunning && onMinimize) {
      // Pequeño delay para que el usuario vea que se inició
      setTimeout(() => {
        onMinimize?.()
      }, 300)
    }
  }

  // Si está minimizado, no renderizar el modal
  if (isMinimized) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative"
        >
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="text-white hover:text-primary-400 transition-colors bg-slate-900/50 rounded-full p-2"
                aria-label="Minimizar"
                title="Minimizar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white hover:text-primary-400 transition-colors bg-slate-900/50 rounded-full p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h2 className="text-2xl font-bold text-white mb-6">Cronómetro</h2>

          {/* Mode Selection */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('free'); handleReset() }}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                mode === 'free' ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              Libre
            </button>
            <button
              onClick={() => { setMode('tabata'); handleReset() }}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                mode === 'tabata' ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              Tabata
            </button>
            <button
              onClick={() => { setMode('emom'); handleReset() }}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                mode === 'emom' ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              EMOM
            </button>
          </div>

          {/* Tabata Settings */}
          {mode === 'tabata' && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tiempo de Trabajo (seg)
                </label>
                <input
                  type="number"
                  value={workTime}
                  onChange={(e) => setWorkTime(parseInt(e.target.value) || 20)}
                  disabled={isRunning}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tiempo de Descanso (seg)
                </label>
                <input
                  type="number"
                  value={restTime}
                  onChange={(e) => setRestTime(parseInt(e.target.value) || 10)}
                  disabled={isRunning}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rondas
                </label>
                <input
                  type="number"
                  value={rounds}
                  onChange={(e) => setRounds(parseInt(e.target.value) || 8)}
                  disabled={isRunning}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Timer Display */}
          <div className="text-center mb-6">
            <div className={`text-6xl font-bold mb-2 ${
              mode === 'tabata' && !isWorkPhase ? 'text-red-400' : 'text-white'
            }`}>
              {formatTime(time)}
            </div>
            {mode === 'tabata' && (
              <div className="text-lg text-slate-300">
                <div>Ronda {currentRound} / {rounds}</div>
                <div className={`font-semibold ${isWorkPhase ? 'text-green-400' : 'text-red-400'}`}>
                  {isWorkPhase ? 'TRABAJO' : 'DESCANSO'}
                </div>
              </div>
            )}
            {mode === 'emom' && (
              <div className="text-lg text-slate-300">
                Minuto {Math.floor(time / 60) + 1}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={handleStart}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              {isRunning ? 'Pausar' : 'Iniciar'}
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Reiniciar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default TimerModal

