import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import TopBanner from '../components/TopBanner'
import AddClientModal from '../components/AddClientModal'
import { db } from '../firebaseConfig'
import { collection, onSnapshot, doc, deleteDoc, getDocs, getDoc } from 'firebase/firestore'
import { calculateTimeActive } from '../utils/timeUtils'
import ProgressTracker from '../components/ProgressTracker'

// Datos de ejemplo de clientes (esto se conectará con Firebase más adelante)
interface Client {
  id: string
  name: string
  email: string
  plan: string
  status: 'active' | 'inactive'
  lastWorkout?: string
  createdAt?: any
  progress?: {
    monthlyProgress: number
    completedDays: number
    totalDays: number
  }
}

const HomePage = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { t } = useLanguage()
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [clientData, setClientData] = useState<any>(null)
  
  // Verificar si es el coach específico
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'

  // Cargar datos según el tipo de usuario
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    // Si es el coach, cargar lista de clientes
    if (isCoach) {
      // Función para filtrar clientes (excluir admins)
      const isClient = (data: any): boolean => {
        // Si tiene role, debe ser 'client'
        if (data.role) {
          return data.role === 'client'
        }
        // Si no tiene role, asumir que es cliente (para compatibilidad con datos antiguos)
        // Excluir emails de admin conocidos
        const email = data.email?.toLowerCase() || ''
        const adminEmails = ['piperubiocoach@gmail.com', 'sebassennin@gmail.com']
        return !adminEmails.includes(email) && email !== ''
      }

      // Cargar una vez inicialmente para mostrar datos rápido
      const loadClients = async () => {
        try {
          const clientsRef = collection(db, 'clients')
          
          // Cargar todos los documentos y filtrar manualmente
          // Esto asegura que incluya clientes antiguos sin el campo 'role'
          const snapshot = await getDocs(clientsRef)
          
          // Cargar progreso para cada cliente
          const clientsWithProgress = await Promise.all(
            Array.from(snapshot.docs).map(async (docSnapshot) => {
              const data = docSnapshot.data()
              if (isClient(data)) {
                // Cargar progreso
                let progress = undefined
                try {
                  const progressRef = doc(db, 'clients', docSnapshot.id, 'progress', 'summary')
                  const progressDoc = await getDoc(progressRef)
                  if (progressDoc.exists()) {
                    const progressData = progressDoc.data()
                    progress = {
                      monthlyProgress: progressData.monthlyProgress || 0,
                      completedDays: progressData.completedDays || 0,
                      totalDays: progressData.totalDays || 30
                    }
                  }
                } catch (error) {
                  console.error(`Error loading progress for ${docSnapshot.id}:`, error)
                }

                const client: Client = {
                  id: docSnapshot.id,
                  name: data.name || '',
                  email: data.email || '',
                  plan: data.plan || 'Plan Mensual - Nivel 2',
                  status: data.status || 'active',
                  lastWorkout: data.lastWorkout || undefined,
                  createdAt: data.createdAt || undefined,
                  progress
                }
                return client
              }
              return null
            })
          )

          const validClients = clientsWithProgress.filter((c): c is Client => c !== null)
          console.log(`Cargados ${validClients.length} clientes:`, validClients.map(c => c.email))
          setClients(validClients)
          setLoading(false)
        } catch (error) {
          console.error('Error loading clients:', error)
          setLoading(false)
        }
      }

      // Cargar inicialmente
      loadClients()

      // Luego suscribirse para actualizaciones en tiempo real
      const clientsRef = collection(db, 'clients')
      const unsubscribe = onSnapshot(clientsRef, async (snapshot) => {
        // Cargar progreso para cada cliente
        const clientsWithProgress = await Promise.all(
          Array.from(snapshot.docs).map(async (docSnapshot) => {
            const data = docSnapshot.data()
            if (isClient(data)) {
              // Cargar progreso
              let progress = undefined
              try {
                const progressRef = doc(db, 'clients', docSnapshot.id, 'progress', 'summary')
                const progressDoc = await getDoc(progressRef)
                if (progressDoc.exists()) {
                  const progressData = progressDoc.data()
                  progress = {
                    monthlyProgress: progressData.monthlyProgress || 0,
                    completedDays: progressData.completedDays || 0,
                    totalDays: progressData.totalDays || 30
                  }
                }
              } catch (error) {
                console.error(`Error loading progress for ${docSnapshot.id}:`, error)
              }

              const client: Client = {
                id: docSnapshot.id,
                name: data.name || '',
                email: data.email || '',
                plan: data.plan || 'Plan Mensual - Nivel 2',
                status: data.status || 'active',
                lastWorkout: data.lastWorkout || undefined,
                createdAt: data.createdAt || undefined,
                progress
              }
              return client
            }
            return null
          })
        )

        const validClients = clientsWithProgress.filter((c): c is Client => c !== null)
        console.log(`Actualización en tiempo real: ${validClients.length} clientes:`, validClients.map(c => c.email))
        setClients(validClients)
      }, (error) => {
        console.error('Error in real-time subscription:', error)
      })

      return () => unsubscribe()
    } 
    // Si es un cliente, cargar sus datos
    else {
      const userEmail = user.email?.toLowerCase()
      if (!userEmail) {
        setLoading(false)
        return
      }

      // Buscar el documento del cliente por email de forma más eficiente
      // Usar una query con where si es posible, pero por ahora iteramos
      const clientsRef = collection(db, 'clients')
      const unsubscribe = onSnapshot(clientsRef, (snapshot) => {
        let found = false
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (data.email?.toLowerCase() === userEmail) {
            setClientData({
              id: doc.id,
              name: data.name || user.displayName || '',
              email: data.email || '',
              plan: data.plan || 'Plan Mensual - Nivel 2',
              status: data.status || 'active',
              createdAt: data.createdAt || undefined
            })
            found = true
            setLoading(false)
          }
        })
        // Si no se encontró el cliente, dejar de cargar
        if (!found) {
          setLoading(false)
        }
      }, (error) => {
        console.error('Error loading client data:', error)
        setLoading(false)
      })

      return () => unsubscribe()
    }
  }, [user, isCoach])

  const handleClientClick = (clientId: string) => {
    navigate(`/client/${clientId}/workouts`)
  }

  const handleAddClient = () => {
    setShowAddModal(true)
  }

  const handleClientAdded = () => {
    setShowAddModal(false)
    // Los clientes se actualizarán automáticamente gracias a onSnapshot
  }

  const handleDeleteClient = async (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation() // Evitar que se active el onClick de la tarjeta
    
    if (!window.confirm(t('dashboard.deleteConfirm'))) {
      return
    }

    try {
      // Eliminar de Firestore
      await deleteDoc(doc(db, 'clients', clientId))
      // Nota: No podemos eliminar el usuario de Auth desde el frontend sin Admin SDK
      // El usuario de Auth debe eliminarse manualmente desde Firebase Console si es necesario
      alert(t('dashboard.deleteSuccess'))
    } catch (error: any) {
      console.error('Error al eliminar cliente:', error)
      alert(error.message || t('dashboard.deleteError'))
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
      <div className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header de Bienvenida */}
          <div className="text-center mb-12">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-5xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              {isCoach ? t('dashboard.welcome') : t('dashboard.welcomeClient')}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`text-xl ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}
            >
              {isCoach 
                ? (user?.displayName || user?.email || 'Coach')
                : (clientData?.name || user?.displayName || user?.email || 'Cliente')
              }
            </motion.p>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={`text-lg mt-2 ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
              }`}
            >
              {isCoach ? t('dashboard.subtitle') : t('dashboard.clientSubtitle')}
            </motion.p>
          </div>

          {/* Botón para agregar cliente - Solo visible para el coach */}
          {isCoach && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8 flex justify-center"
            >
              <motion.button
                onClick={handleAddClient}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-primary-600 to-primary-800 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 flex items-center gap-3 font-semibold text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('dashboard.addClient')}
              </motion.button>
            </motion.div>
          )}

          {/* Contenido según el tipo de usuario */}
          {isCoach ? (
            /* Vista del Coach - Lista de Clientes */
            <div className="mb-8">
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className={`text-3xl font-bold mb-6 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                {t('dashboard.clients')} ({clients.length})
              </motion.h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <p className={`mt-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                  {t('dashboard.loadingClients')}
                </p>
              </div>
            ) : clients.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className={`text-center py-12 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/50'
                }`}
              >
                <p className={`text-xl ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  {t('dashboard.noClients')}
                </p>
                <p className={`text-sm mt-2 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  {t('dashboard.addFirstClient')}
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map((client, index) => (
                  <motion.div
                    key={client.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.7 + index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    className={`rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-200 relative ${
                      theme === 'dark' 
                        ? 'bg-slate-800/80 border border-slate-700' 
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {/* Botón de eliminar */}
                    <button
                      onClick={(e) => handleDeleteClient(e, client.id)}
                      className={`absolute top-4 right-4 p-2 rounded-lg transition-colors z-10 ${
                        theme === 'dark'
                          ? 'hover:bg-red-500/20 text-red-400'
                          : 'hover:bg-red-50 text-red-600'
                      }`}
                      title={t('dashboard.deleteClient')}
                      aria-label={t('dashboard.deleteClient')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {/* Barra de Progreso */}
                    {client.progress && (
                      <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                        <ProgressTracker
                          dailyProgress={0}
                          monthlyProgress={client.progress.monthlyProgress}
                          completedDays={client.progress.completedDays}
                          totalDays={client.progress.totalDays}
                          showDetails={false}
                        />
                      </div>
                    )}
                    
                    <div 
                      onClick={() => handleClientClick(client.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-4 pr-8">
                        <div>
                          <h3 className={`text-2xl font-bold mb-1 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {client.name}
                          </h3>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                          }`}>
                            {client.email}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          client.status === 'active'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                        }`}>
                          {client.status === 'active' ? t('dashboard.active') : t('dashboard.inactive')}
                        </span>
                      </div>
                    
                    <div className={`mb-4 p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                    }`}>
                      <p className={`text-sm font-semibold ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {client.plan}
                      </p>
                    </div>

                    {/* Tiempo activo en el plan */}
                    {client.createdAt && (
                      <div className={`mb-3 p-2 rounded-lg ${
                        theme === 'dark' ? 'bg-primary-500/20' : 'bg-primary-100'
                      }`}>
                        <p className={`text-xs font-semibold ${
                          theme === 'dark' ? 'text-primary-300' : 'text-primary-700'
                        }`}>
                          ⏱️ Tiempo activo: {calculateTimeActive(client.createdAt)}
                        </p>
                      </div>
                    )}

                    {client.lastWorkout && (
                      <p className={`text-xs ${
                        theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                      }`}>
                        {t('dashboard.lastWorkout')}: {new Date(client.lastWorkout).toLocaleDateString()}
                      </p>
                    )}

                      <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <p className={`text-sm font-semibold text-primary-400 ${
                          theme === 'dark' ? '' : 'text-primary-600'
                        }`}>
                          {t('dashboard.viewWorkouts')} →
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            </div>
          ) : (
            /* Vista del Cliente - Su Rutina/Entrenamiento */
            <div className="mb-8">
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className={`text-3xl font-bold mb-6 text-center ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                {t('dashboard.myRoutine')}
              </motion.h2>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  {t('dashboard.loadingRoutine') && (
                    <p className={`mt-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      {t('dashboard.loadingRoutine')}
                    </p>
                  )}
                </div>
              ) : clientData ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className={`max-w-2xl mx-auto rounded-xl p-6 shadow-lg ${
                    theme === 'dark' 
                      ? 'bg-slate-800/80 border border-slate-700' 
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className={`mb-4 p-4 rounded-lg ${
                    theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                  }`}>
                    <p className={`text-sm font-semibold mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      {t('dashboard.plan')}
                    </p>
                    <p className={`text-lg font-bold mb-3 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {clientData.plan}
                    </p>
                    
                    {/* Tiempo activo en el plan */}
                    {clientData.createdAt && (
                      <div className={`mt-3 p-3 rounded-lg ${
                        theme === 'dark' ? 'bg-primary-500/20' : 'bg-primary-100'
                      }`}>
                        <p className={`text-sm font-semibold ${
                          theme === 'dark' ? 'text-primary-300' : 'text-primary-700'
                        }`}>
                          ⏱️ Tiempo activo: {calculateTimeActive(clientData.createdAt)}
                        </p>
                      </div>
                    )}
                  </div>

                  <motion.button
                    onClick={() => navigate(`/client/${clientData.id}/workouts`)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-primary-600 to-primary-800 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 flex items-center justify-center gap-3 font-semibold text-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('dashboard.viewWorkouts')}
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className={`text-center py-12 rounded-xl ${
                    theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/50'
                  }`}
                >
                  <p className={`text-xl ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    {t('dashboard.noClientData')}
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal para agregar cliente */}
      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleClientAdded}
      />
    </div>
  )
}

export default HomePage
