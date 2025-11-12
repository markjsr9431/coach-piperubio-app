import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { ComparisonResult } from '../utils/rmprComparison'

interface RMPRComparisonAlertProps {
  isOpen: boolean
  type: 'RM' | 'PR'
  exercise: string
  value: string
  comparisons: ComparisonResult[]
  onConfirm: () => void
  onCancel: () => void
}

const RMPRComparisonAlert = ({
  isOpen,
  type,
  exercise,
  value,
  comparisons,
  onConfirm,
  onCancel
}: RMPRComparisonAlertProps) => {
  const { theme } = useTheme()

  if (!isOpen) return null

  const formatDate = (date: any) => {
    if (!date) return 'Fecha no disponible'
    if (date.toDate) {
      return date.toDate().toLocaleDateString('es-ES')
    }
    if (date instanceof Date) {
      return date.toLocaleDateString('es-ES')
    }
    if (typeof date === 'number') {
      return new Date(date).toLocaleDateString('es-ES')
    }
    return 'Fecha no disponible'
  }

  const getTitle = () => {
    if (type === 'RM') {
      return comparisons.length > 0 
        ? 'Otros clientes tienen un RM mayor o igual'
        : 'Confirmar registro de RM'
    } else {
      return comparisons.length > 0
        ? 'Otros clientes tienen un PR mejor o igual'
        : 'Confirmar registro de PR'
    }
  }

  const getMessage = () => {
    if (type === 'RM') {
      return comparisons.length > 0
        ? `Has registrado ${value} en ${exercise}, pero otros clientes tienen un RM mayor o igual:`
        : `¿Deseas guardar este RM: ${value} en ${exercise}?`
    } else {
      return comparisons.length > 0
        ? `Has registrado ${value} en ${exercise}, pero otros clientes tienen un PR mejor o igual (menor tiempo):`
        : `¿Deseas guardar este PR: ${value} en ${exercise}?`
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[70] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md rounded-2xl shadow-2xl ${
            theme === 'dark' ? 'bg-slate-800/90 border border-slate-700/50' : 'bg-white/90 border border-gray-200/50'
          } backdrop-blur-sm p-6`}
        >
          {/* Header */}
          <div className="mb-4">
            <h3 className={`text-xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {getTitle()}
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              {getMessage()}
            </p>
          </div>

          {/* Lista de comparaciones */}
          {comparisons.length > 0 && (
            <div className={`mb-4 max-h-60 overflow-y-auto rounded-lg ${
              theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
            } p-3`}>
              <div className="space-y-2">
                {comparisons.map((comparison, index) => (
                  <div
                    key={`${comparison.clientId}-${index}`}
                    className={`p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-slate-600/50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {comparison.clientName}
                        </p>
                        <p className={`text-xs mt-1 ${
                          theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                        }`}>
                          {type === 'RM' ? 'RM:' : 'PR:'} {comparison.value}
                        </p>
                        <p className={`text-xs mt-1 ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                        }`}>
                          {formatDate(comparison.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información adicional */}
          {comparisons.length > 0 && (
            <div className={`mb-4 p-3 rounded-lg ${
              theme === 'dark' 
                ? 'bg-blue-500/20 border border-blue-500/30' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-xs ${
                theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
              }`}>
                {type === 'RM' 
                  ? '💡 Puedes continuar guardando tu RM. Esta información es solo para tu referencia.'
                  : '💡 Puedes continuar guardando tu PR. Esta información es solo para tu referencia.'}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
            >
              Continuar Guardando
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default RMPRComparisonAlert

