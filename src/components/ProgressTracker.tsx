import { useTheme } from '../contexts/ThemeContext'

interface ProgressTrackerProps {
  dailyProgress: number // 0-100
  monthlyProgress: number // 0-100
  completedDays: number
  totalDays: number
  showDetails?: boolean
  createdAt?: any // Timestamp de creación del cliente
  lastLogin?: any // Timestamp del último login
}

const ProgressTracker = ({
  dailyProgress,
  monthlyProgress,
  completedDays,
  totalDays,
  showDetails = false,
  createdAt,
  lastLogin
}: ProgressTrackerProps) => {
  const { theme } = useTheme()

  // Determinar si el usuario es nuevo (creado hace menos de 2 semanas) o no ha iniciado sesión en 7 días
  const isNewUser = () => {
    if (!createdAt) return false
    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt)
    const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceCreation < 14 // 2 semanas
  }

  const hasNotLoggedInRecently = () => {
    if (!lastLogin) return true // Si no hay registro de login, considerar que no ha iniciado sesión
    const lastLoginDate = lastLogin.toDate ? lastLogin.toDate() : new Date(lastLogin)
    const daysSinceLastLogin = (Date.now() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceLastLogin >= 7
  }

  // Solo mostrar "Necesita más compromiso" si no es usuario nuevo Y no ha iniciado sesión recientemente
  const shouldShowLowCommitment = !isNewUser() && hasNotLoggedInRecently()

  return (
    <div className={`rounded-lg p-4 ${
      theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-100'
    }`}>
      {showDetails && (
        <div className="mb-4">
          <h3 className={`text-lg font-bold mb-3 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Progreso del Entrenamiento
          </h3>
        </div>
      )}
      
      {/* Progreso Mensual */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-semibold ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
          }`}>
            Progreso Mensual
          </span>
          <span className={`text-sm font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {completedDays} / {totalDays} días
          </span>
        </div>
        <div className={`w-full h-3 rounded-full overflow-hidden ${
          theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'
        }`}>
          <div
            className="h-full bg-gradient-to-r from-primary-600 to-primary-800 transition-all duration-500 rounded-full"
            style={{ width: `${monthlyProgress}%` }}
          />
        </div>
        <div className="text-right mt-1">
          <span className={`text-xs ${
            theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
          }`}>
            {Math.round(monthlyProgress)}%
          </span>
        </div>
      </div>

      {/* Progreso Diario */}
      {showDetails && dailyProgress > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm font-semibold ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Progreso del Día Actual
            </span>
            <span className={`text-sm font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {Math.round(dailyProgress)}%
            </span>
          </div>
          <div className={`w-full h-3 rounded-full overflow-hidden ${
            theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'
          }`}>
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-700 transition-all duration-500 rounded-full"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Indicador de responsabilidad */}
      {showDetails && (
        <div className={`mt-4 p-3 rounded-lg ${
          monthlyProgress >= 80
            ? 'bg-green-500/20 border border-green-500/50'
            : monthlyProgress >= 50
            ? 'bg-yellow-500/20 border border-yellow-500/50'
            : 'bg-red-500/20 border border-red-500/50'
        }`}>
          <div className="flex items-center gap-2">
            {monthlyProgress >= 80 ? (
              <>
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-green-300' : 'text-green-700'
                }`}>
                  Excelente compromiso
                </span>
              </>
            ) : monthlyProgress >= 50 ? (
              <>
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                }`}>
                  Buen progreso, sigue así
                </span>
              </>
            ) : shouldShowLowCommitment ? (
              <>
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-red-300' : 'text-red-700'
                }`}>
                  Necesita más compromiso
                </span>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProgressTracker

