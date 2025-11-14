import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import TopBanner from '../components/TopBanner'
import RMAndPRSection from '../components/RMAndPRSection'

const RMAndPRPage = () => {
  const { clientId } = useParams<{ clientId: string }>()
  const { theme } = useTheme()
  const { user } = useAuth()
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'

  if (!clientId) {
    return null
  }

  return (
    <div className={`min-h-screen ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'
    }`}>
      <TopBanner />
      
      {/* Contenido Principal */}
      <div className="pt-8 pb-12 px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0 }}
          className="max-w-7xl mx-auto"
        >
          <div className="text-center mb-12">
            <h1 className={`text-4xl sm:text-5xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Repetición Máxima (RM) y Récords Personales (PR)
            </h1>
            <p className={`text-lg sm:text-xl ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Registro detallado de RM y PR del cliente
            </p>
          </div>

          <div className={`rounded-xl shadow-lg p-6 ${
            theme === 'dark' 
              ? 'bg-slate-800/80 border border-slate-700' 
              : 'bg-white border border-gray-200'
          }`}>
            <RMAndPRSection clientId={clientId} isCoach={isCoach} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default RMAndPRPage

