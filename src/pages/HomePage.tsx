import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import TopBanner from '../components/TopBanner'
import AddClientModal from '../components/AddClientModal'
import ImportClientsModal from '../components/ImportClientsModal'
import RMAndPRModal from '../components/RMAndPRModal'
import LoadAndEffortModal from '../components/LoadAndEffortModal'
import CoachContactModal from '../components/CoachContactModal'
import { db } from '../firebaseConfig'
import { collection, onSnapshot, doc, deleteDoc, getDocs, getDoc, updateDoc } from 'firebase/firestore'
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
  lastLogin?: any
  subscriptionStartDate?: any
  subscriptionEndDate?: any
  profilePhoto?: string | null
  avatar?: string | null
  clientCategory?: 'new' | 'old'
  progress?: {
    monthlyProgress: number
    completedDays: number
    totalDays: number
    averageWorkoutTime?: number // en segundos
  }
}

const HomePage = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { t } = useLanguage()
  const { user } = useAuth()

  // Función helper para formatear nombres: mostrar solo primer nombre y primer apellido
  const formatClientName = (fullName: string): string => {
    if (!fullName) return ''
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length <= 2) return fullName
    // Asumir formato: primer nombre, segundo nombre (opcional), primer apellido, segundo apellido (opcional)
    // Si hay 3 partes: nombre, nombre, apellido -> mostrar primera y tercera
    if (parts.length === 3) {
      return `${parts[0]} ${parts[2]}`
    }
    // Para 4+ partes, primer nombre es parts[0], primer apellido es parts[2]
    return `${parts[0]} ${parts[2]}`
  }
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [clientData, setClientData] = useState<any>(null)
  const [showRMAndPRModal, setShowRMAndPRModal] = useState(false)
  const [showLoadAndEffortModal, setShowLoadAndEffortModal] = useState(false)
  const [showCoachContactModal, setShowCoachContactModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeCategory, setActiveCategory] = useState<'new' | 'old' | null>(null)
  const [isAllClientsCollapsed, setIsAllClientsCollapsed] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'subscription' | 'payment' | 'none'>('none')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Verificar si es el coach específico
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'
  
  // Función para filtrar clientes por nombre o apellido
  const filterClients = (clientsToFilter: Client[]): Client[] => {
    if (!searchTerm.trim()) {
      return clientsToFilter
    }
    const searchLower = searchTerm.toLowerCase().trim()
    return clientsToFilter.filter(client => {
      const fullName = client.name.toLowerCase()
      return fullName.includes(searchLower)
    })
  }

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
                      totalDays: progressData.totalDays || 30,
                      averageWorkoutTime: progressData.averageWorkoutTime || undefined
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
                lastLogin: data.lastLogin || undefined,
                subscriptionStartDate: data.subscriptionStartDate || data.createdAt || undefined,
                subscriptionEndDate: data.subscriptionEndDate || undefined,
                profilePhoto: data.profilePhoto || null,
                avatar: data.avatar || null,
                clientCategory: data.clientCategory || undefined,
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
                        totalDays: progressData.totalDays || 30,
                        averageWorkoutTime: progressData.averageWorkoutTime || undefined
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
                lastLogin: data.lastLogin || undefined,
                subscriptionStartDate: data.subscriptionStartDate || data.createdAt || undefined,
                subscriptionEndDate: data.subscriptionEndDate || undefined,
                profilePhoto: data.profilePhoto || null,
                avatar: data.avatar || null,
                clientCategory: data.clientCategory || undefined,
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

  // Función helper para verificar si un cliente está en línea
  const isClientOnline = (client: Client): boolean => {
    if (!client.lastLogin) return false
    
    try {
      let lastLoginDate: Date
      if (client.lastLogin.toDate) {
        lastLoginDate = client.lastLogin.toDate()
      } else if (client.lastLogin instanceof Date) {
        lastLoginDate = client.lastLogin
      } else if (typeof client.lastLogin === 'number') {
        lastLoginDate = new Date(client.lastLogin)
      } else {
        return false
      }
      
      const now = new Date()
      const diffMs = now.getTime() - lastLoginDate.getTime()
      const diffMinutes = diffMs / (1000 * 60)
      
      // Considerar en línea si lastLogin fue hace menos de 5 minutos
      return diffMinutes < 5
    } catch (error) {
      console.error('Error checking if client is online:', error)
      return false
    }
  }

  const handleClientClick = (clientId: string) => {
    navigate(`/client/${clientId}/profile`)
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

  const handleMoveClientCategory = async (e: React.MouseEvent, clientId: string, newCategory: 'new' | 'old') => {
    e.stopPropagation() // Evitar que se active el onClick de la tarjeta
    
    try {
      const clientRef = doc(db, 'clients', clientId)
      await updateDoc(clientRef, {
        clientCategory: newCategory,
        categoryUpdatedAt: new Date().toISOString()
      })
      // Actualizar el estado local inmediatamente para feedback visual
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId 
            ? { ...client, clientCategory: newCategory }
            : client
        )
      )
    } catch (error: any) {
      console.error('Error al cambiar categoría del cliente:', error)
      alert('Error al cambiar la categoría del cliente')
    }
  }

  const handlePlanChange = async (e: React.ChangeEvent<HTMLSelectElement>, clientId: string) => {
    e.stopPropagation() // Evitar que se active el onClick de la tarjeta
    const newPlan = e.target.value
    
    try {
      const clientRef = doc(db, 'clients', clientId)
      await updateDoc(clientRef, {
        plan: newPlan
      })
      // Actualizar el estado local inmediatamente para feedback visual
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId 
            ? { ...client, plan: newPlan }
            : client
        )
      )
    } catch (error: any) {
      console.error('Error al actualizar el plan:', error)
      alert('Error al actualizar el plan del cliente')
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
              className={`text-base sm:text-xl ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}
            >
              {isCoach 
                ? (user?.displayName || user?.email || 'Coach')
                : (clientData?.name || user?.displayName || user?.email || 'Cliente')
              }
            </motion.p>
            {isCoach && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className={`text-lg mt-2 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}
              >
                {t('dashboard.subtitle')}
              </motion.p>
            )}
          </div>

          {/* Fichas de Acceso Rápido - Solo visible para clientes */}
          {!isCoach && clientData?.id && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ficha 1: RM y PR */}
                <motion.button
                  onClick={() => setShowRMAndPRModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-6 rounded-xl shadow-lg transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80'
                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className={`p-4 rounded-full ${
                      theme === 'dark' ? 'bg-primary-600/20' : 'bg-primary-100'
                    }`}>
                      <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      RM y PR
                    </h3>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                    }`}>
                      Registra tus repeticiones máximas y récords personales
                    </p>
                  </div>
                </motion.button>

                {/* Ficha 2: Registro de Carga y Esfuerzo */}
                <motion.button
                  onClick={() => setShowLoadAndEffortModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-6 rounded-xl shadow-lg transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80'
                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className={`p-4 rounded-full ${
                      theme === 'dark' ? 'bg-orange-600/20' : 'bg-orange-100'
                    }`}>
                      <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Registro de Carga y Esfuerzo
                    </h3>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                    }`}>
                      Registra la carga utilizada y tu valoración de esfuerzo
                    </p>
                  </div>
                </motion.button>

                {/* Ficha 3: Contacto Coach */}
                <motion.button
                  onClick={() => setShowCoachContactModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-6 rounded-xl shadow-lg transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80'
                      : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className={`p-4 rounded-full ${
                      theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-100'
                    }`}>
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Contacto Coach
                    </h3>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                    }`}>
                      Contacta al coach a través de diferentes plataformas
                    </p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Botones de acción - Solo visible para el coach */}
          {isCoach && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8 flex justify-center gap-4 flex-wrap"
            >
              <motion.button
                onClick={handleAddClient}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-primary-600 to-primary-800 text-white px-4 py-2 sm:px-8 sm:py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 flex items-center gap-2 sm:gap-3 font-semibold text-sm sm:text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo cliente
              </motion.button>
              
              {/* Botón Importar Clientes */}
              <motion.button
                onClick={() => setShowImportModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-green-600 to-green-800 text-white px-4 py-2 sm:px-8 sm:py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 flex items-center gap-2 sm:gap-3 font-semibold text-sm sm:text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar Clientes
              </motion.button>
              
              <motion.button
                onClick={() => navigate('/exercises')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-green-600 to-green-800 text-white px-4 py-2 sm:px-8 sm:py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 flex items-center gap-2 sm:gap-3 font-semibold text-sm sm:text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Ejercicios
              </motion.button>
            </motion.div>
          )}

          {/* Contenido según el tipo de usuario */}
          {isCoach ? (
            /* Vista del Coach - Lista de Clientes */
            <div className="mb-8">
              {/* Campo de Búsqueda */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o apellido..."
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                    }`}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className={`text-3xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {t('dashboard.clients')} ({clients.length})
                </motion.h2>
                
                {/* Botones de modo de visualización */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-primary-600 text-white'
                        : theme === 'dark'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title="Vista en miniatura"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'list'
                        ? 'bg-primary-600 text-white'
                        : theme === 'dark'
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title="Vista en lista"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>

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
            ) : null}
            </div>
          ) : null}
          {/* Contenido del Coach - Lista de Clientes */}
          {isCoach && (() => {
              // Dividir clientes en nuevos y antiguos
              // Primero verificar si tienen categoría manual asignada
              const newClients = clients.filter(client => {
                // Si tiene categoría manual, usar esa
                if (client.clientCategory === 'new') return true
                if (client.clientCategory === 'old') return false
                // Si no tiene categoría manual, usar criterio de 30 días
                if (!client.createdAt) return false
                const createdAt = client.createdAt.toDate ? client.createdAt.toDate() : new Date(client.createdAt)
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                return createdAt >= thirtyDaysAgo
              })
              
              const oldClients = clients.filter(client => {
                // Si tiene categoría manual, usar esa
                if (client.clientCategory === 'old') return true
                if (client.clientCategory === 'new') return false
                // Si no tiene categoría manual, usar criterio de 30 días
                if (!client.createdAt) return true
                const createdAt = client.createdAt.toDate ? client.createdAt.toDate() : new Date(client.createdAt)
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                return createdAt < thirtyDaysAgo
              })
              
              // Ordenar clientes según el filtro seleccionado
              let sortedClients = [...clients]
              
              if (sortBy !== 'none') {
                sortedClients.sort((a, b) => {
                  let comparison = 0
                  
                  switch (sortBy) {
                    case 'name':
                      comparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
                      break
                    case 'subscription':
                      const aDate = a.subscriptionStartDate?.toDate 
                        ? a.subscriptionStartDate.toDate() 
                        : a.createdAt?.toDate 
                        ? a.createdAt.toDate() 
                        : a.subscriptionStartDate 
                        ? new Date(a.subscriptionStartDate) 
                        : a.createdAt 
                        ? new Date(a.createdAt) 
                        : new Date(0)
                      const bDate = b.subscriptionStartDate?.toDate 
                        ? b.subscriptionStartDate.toDate() 
                        : b.createdAt?.toDate 
                        ? b.createdAt.toDate() 
                        : b.subscriptionStartDate 
                        ? new Date(b.subscriptionStartDate) 
                        : b.createdAt 
                        ? new Date(b.createdAt) 
                        : new Date(0)
                      comparison = aDate.getTime() - bDate.getTime()
                      break
                    case 'payment':
                      // Por ahora, ordenar por fecha de suscripción (preparado para futuro control de pagos)
                      const aPayDate = a.subscriptionEndDate?.toDate 
                        ? a.subscriptionEndDate.toDate() 
                        : a.subscriptionEndDate 
                        ? new Date(a.subscriptionEndDate) 
                        : new Date(0)
                      const bPayDate = b.subscriptionEndDate?.toDate 
                        ? b.subscriptionEndDate.toDate() 
                        : b.subscriptionEndDate 
                        ? new Date(b.subscriptionEndDate) 
                        : new Date(0)
                      comparison = aPayDate.getTime() - bPayDate.getTime()
                      break
                  }
                  
                  return sortOrder === 'asc' ? comparison : -comparison
                })
              }
              
              const allClients = sortedClients
              
              // Aplicar filtro de búsqueda
              const filteredNewClients = filterClients(newClients)
              const filteredOldClients = filterClients(oldClients)
              const filteredAllClients = filterClients(allClients)

              return (
                <>
                  {/* Vista de fichas o listado según activeCategory */}
                  {activeCategory === null ? (
                    <>
                      {/* Fichas grandes clickeables */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto mb-8">
                        {/* Ficha Clientes Nuevos */}
                        <motion.div
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative rounded-xl p-3 sm:p-4 shadow-lg transition-all h-32 sm:h-40 flex items-center justify-center cursor-pointer hover:shadow-2xl w-full bg-gradient-to-br from-green-600 to-green-800`}
                          onClick={() => setActiveCategory('new')}
                        >
                          <div className="text-center">
                            <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                              {searchTerm ? filteredNewClients.length : newClients.length}
                            </div>
                            <div className="text-white font-semibold text-lg sm:text-xl mb-2">
                              Clientes Nuevos
                            </div>
                            <div className="text-green-100 text-sm sm:text-base mt-2">
                              Haz clic para ver el listado
                            </div>
                          </div>
                        </motion.div>

                        {/* Ficha Clientes Antiguos */}
                        <motion.div
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative rounded-xl p-3 sm:p-4 shadow-lg transition-all h-32 sm:h-40 flex items-center justify-center cursor-pointer hover:shadow-2xl w-full bg-gradient-to-br from-blue-600 to-blue-800`}
                          onClick={() => setActiveCategory('old')}
                        >
                          <div className="text-center">
                            <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                              {searchTerm ? filteredOldClients.length : oldClients.length}
                            </div>
                            <div className="text-white font-semibold text-lg sm:text-xl mb-2">
                              Clientes Antiguos
                            </div>
                            <div className="text-blue-100 text-sm sm:text-base mt-2">
                              Haz clic para ver el listado
                            </div>
                          </div>
                        </motion.div>

                        {/* Ficha Crear Plan de Entreno */}
                        <motion.div
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative rounded-xl p-3 sm:p-4 shadow-lg transition-all h-32 sm:h-40 flex items-center justify-center cursor-pointer hover:shadow-2xl w-full bg-gradient-to-br from-purple-600 to-purple-800`}
                          onClick={() => navigate('/create-workout')}
                        >
                          <div className="text-center">
                            <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                              <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                            <div className="text-white font-semibold text-lg sm:text-xl mb-2">
                              Crear Plan de Entreno
                            </div>
                            <div className="text-purple-100 text-sm sm:text-base mt-2">
                              Haz clic para crear
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Botón Volver */}
                      <div className="mb-6">
                        <button
                          onClick={() => setActiveCategory(null)}
                          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                            theme === 'dark'
                              ? 'bg-slate-700 hover:bg-slate-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Volver
                        </button>
                      </div>

                      {/* Listado de clientes según categoría activa */}
                      {activeCategory === 'new' && filteredNewClients.length > 0 && (
                        <div className="mb-8">
                          <motion.h3 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`text-2xl font-bold mb-4 ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            Clientes Nuevos ({filteredNewClients.length})
                          </motion.h3>
                      <div className={`${
                        viewMode === 'grid' 
                          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                          : 'space-y-3'
                      }`}>
                        {filteredNewClients.map((client, index) => (
                          <motion.div
                            key={client.id}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: 0.8 + index * 0.1 }}
                            whileHover={{ scale: viewMode === 'list' ? 1 : 1.02, y: viewMode === 'list' ? 0 : -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleClientClick(client.id)}
                            className={`rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 relative cursor-pointer ${
                              viewMode === 'list' 
                                ? 'p-3' 
                                : 'p-6'
                            } ${
                              theme === 'dark' 
                                ? 'bg-slate-800/80 border border-slate-700' 
                                : 'bg-white border border-gray-200'
                            }`}
                          >
                            {/* Barra de Progreso */}
                            {client.progress && (
                              <div className="mb-2">
                                <ProgressTracker
                                  dailyProgress={0}
                                  monthlyProgress={client.progress.monthlyProgress}
                                  completedDays={client.progress.completedDays}
                                  totalDays={client.progress.totalDays}
                                  showDetails={false}
                                  createdAt={client.createdAt}
                                  lastLogin={client.lastLogin}
                                />
                              </div>
                            )}
                            
                            <div>
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 
                                    className={`text-xl sm:text-2xl font-bold mb-2 line-clamp-2 ${
                                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    }`}
                                    title={client.name}
                                  >
                                    {formatClientName(client.name)}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    isClientOnline(client)
                                      ? theme === 'dark'
                                        ? 'bg-green-600/30 text-green-300 border border-green-500/70'
                                        : 'bg-green-100 text-green-700 border border-green-500'
                                      : client.status === 'active'
                                      ? theme === 'dark'
                                        ? 'bg-slate-600/30 text-slate-300 border border-slate-500/70'
                                        : 'bg-gray-200 text-gray-700 border border-gray-400'
                                      : theme === 'dark'
                                        ? 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                        : 'bg-gray-200 text-gray-600 border border-gray-400'
                                  }`}>
                                    {isClientOnline(client) ? t('dashboard.online') : (client.status === 'active' ? t('dashboard.disconnected') : t('dashboard.inactive'))}
                                  </span>
                                  {/* Dropdown de categoría y botón eliminar - Solo para coach */}
                                  <div className="flex items-center gap-2">
                                    {isCoach && (
                                      <select
                                        value={client.clientCategory === 'old' ? 'old' : client.clientCategory === 'new' ? 'new' : (newClients.includes(client) ? 'new' : 'old')}
                                        onChange={(e) => {
                                          const newCategory = e.target.value as 'new' | 'old'
                                          handleMoveClientCategory({ stopPropagation: () => {} } as any, client.id, newCategory)
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                          theme === 'dark'
                                            ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                                            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                                        }`}
                                        title="Cambiar categoría"
                                      >
                                        <option value="new">Nuevo</option>
                                        <option value="old">Antiguo</option>
                                      </select>
                                    )}
                                    <button
                                      onClick={(e) => handleDeleteClient(e, client.id)}
                                      className={`p-2 rounded-lg transition-colors ${
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
                                  </div>
                                </div>
                              </div>
                              
                              <div className={`mb-4 p-3 rounded-lg ${
                                theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                              }`}>
                                <select
                                  value={client.plan}
                                  onChange={(e) => handlePlanChange(e, client.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`w-full text-sm font-semibold rounded-lg px-2 py-1 border transition-colors ${
                                    theme === 'dark'
                                      ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                                >
                                  <option value="Plan Mensual - Nivel 1">Plan Mensual - Nivel 1</option>
                                  <option value="Plan Mensual - Nivel 2">Plan Mensual - Nivel 2</option>
                                  <option value="Plan Mensual - Nivel 3">Plan Mensual - Nivel 3</option>
                                  <option value="Plan Personalizado">Plan Personalizado</option>
                                </select>
                              </div>

                              {/* Suscripción */}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                      {/* Listado de clientes antiguos */}
                      {activeCategory === 'old' && filteredOldClients.length > 0 && (
                        <div className="mb-8">
                          <motion.h3 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`text-2xl font-bold mb-4 ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            Clientes Antiguos ({filteredOldClients.length})
                          </motion.h3>
                      <div className={`${
                        viewMode === 'grid' 
                          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                          : 'space-y-3'
                      }`}>
                        {filteredOldClients.map((client, index) => (
                          <motion.div
                            key={client.id}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: 0.8 + (filteredNewClients.length * 0.1) + index * 0.1 }}
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleClientClick(client.id)}
                            className={`rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-2xl transition-all duration-200 relative flex flex-col justify-between min-h-[280px] sm:min-h-[320px] cursor-pointer ${
                              theme === 'dark' 
                                ? 'bg-slate-800/80 border border-slate-700' 
                                : 'bg-white border border-gray-200'
                            }`}
                          >
                            {/* Barra de Progreso */}
                            {client.progress && (
                              <div className="mb-2">
                                <ProgressTracker
                                  dailyProgress={0}
                                  monthlyProgress={client.progress.monthlyProgress}
                                  completedDays={client.progress.completedDays}
                                  totalDays={client.progress.totalDays}
                                  showDetails={false}
                                  createdAt={client.createdAt}
                                  lastLogin={client.lastLogin}
                                />
                              </div>
                            )}
                            
                            <div>
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h3 
                                    className={`text-xl sm:text-2xl font-bold mb-2 line-clamp-2 ${
                                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                                    }`}
                                    title={client.name}
                                  >
                                    {formatClientName(client.name)}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    isClientOnline(client)
                                      ? theme === 'dark'
                                        ? 'bg-green-600/30 text-green-300 border border-green-500/70'
                                        : 'bg-green-100 text-green-700 border border-green-500'
                                      : client.status === 'active'
                                      ? theme === 'dark'
                                        ? 'bg-slate-600/30 text-slate-300 border border-slate-500/70'
                                        : 'bg-gray-200 text-gray-700 border border-gray-400'
                                      : theme === 'dark'
                                        ? 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                        : 'bg-gray-200 text-gray-600 border border-gray-400'
                                  }`}>
                                    {isClientOnline(client) ? t('dashboard.online') : (client.status === 'active' ? t('dashboard.disconnected') : t('dashboard.inactive'))}
                                  </span>
                                  {/* Dropdown de categoría y botón eliminar - Solo para coach */}
                                  <div className="flex items-center gap-2">
                                    {isCoach && (
                                      <select
                                        value={client.clientCategory === 'old' ? 'old' : client.clientCategory === 'new' ? 'new' : (oldClients.includes(client) ? 'old' : 'new')}
                                        onChange={(e) => {
                                          const newCategory = e.target.value as 'new' | 'old'
                                          handleMoveClientCategory({ stopPropagation: () => {} } as any, client.id, newCategory)
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                          theme === 'dark'
                                            ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                                            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                                        }`}
                                        title="Cambiar categoría"
                                      >
                                        <option value="new">Nuevo</option>
                                        <option value="old">Antiguo</option>
                                      </select>
                                    )}
                                    <button
                                      onClick={(e) => handleDeleteClient(e, client.id)}
                                      className={`p-2 rounded-lg transition-colors ${
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
                                  </div>
                                </div>
                              </div>
                              
                              <div className={`mb-4 p-3 rounded-lg ${
                                theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                              }`}>
                                <select
                                  value={client.plan}
                                  onChange={(e) => handlePlanChange(e, client.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`w-full text-sm font-semibold rounded-lg px-2 py-1 border transition-colors ${
                                    theme === 'dark'
                                      ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                                >
                                  <option value="Plan Mensual - Nivel 1">Plan Mensual - Nivel 1</option>
                                  <option value="Plan Mensual - Nivel 2">Plan Mensual - Nivel 2</option>
                                  <option value="Plan Mensual - Nivel 3">Plan Mensual - Nivel 3</option>
                                  <option value="Plan Personalizado">Plan Personalizado</option>
                                </select>
                              </div>

                              {/* Suscripción */}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                    </>
                  )}

                  {/* Listado completo de todos los clientes */}
                  {activeCategory === null && (
                    <div className="mb-8 mt-12">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                        <motion.h3 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 }}
                          className={`text-xl sm:text-2xl font-bold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          Todos los Clientes ({filteredAllClients.length})
                        </motion.h3>
                        
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Botón Colapsar/Expandir */}
                          <button
                            onClick={() => setIsAllClientsCollapsed(!isAllClientsCollapsed)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                              theme === 'dark'
                                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                            }`}
                          >
                            <svg 
                              className={`w-5 h-5 transition-transform ${isAllClientsCollapsed ? '' : 'rotate-180'}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            {isAllClientsCollapsed ? 'Expandir' : 'Colapsar'}
                          </button>
                          
                          {/* Filtro de Ordenamiento */}
                          <div className="flex items-center gap-2">
                            <select
                              value={sortBy}
                              onChange={(e) => {
                                const newSort = e.target.value as 'name' | 'subscription' | 'payment' | 'none'
                                setSortBy(newSort)
                                if (newSort === 'none') {
                                  setSortOrder('asc')
                                }
                              }}
                              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                                theme === 'dark'
                                  ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              <option value="none">Sin ordenar</option>
                              <option value="name">Alfabético</option>
                              <option value="subscription">Tiempo suscrito</option>
                              <option value="payment">Próximo a pagar</option>
                            </select>
                            
                            {sortBy !== 'none' && (
                              <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                  theme === 'dark'
                                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                                }`}
                                title={sortOrder === 'asc' ? 'Orden ascendente' : 'Orden descendente'}
                              >
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    {!isAllClientsCollapsed && (
                      <div className={`${
                        viewMode === 'grid' 
                          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                          : 'space-y-3'
                      }`}>
                        {filteredAllClients.map((client, index) => (
                        <motion.div
                          key={client.id}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: 0.9 + index * 0.05 }}
                          whileHover={{ scale: viewMode === 'list' ? 1 : 1.02, y: viewMode === 'list' ? 0 : -5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleClientClick(client.id)}
                          className={`rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 relative flex flex-col justify-between cursor-pointer ${
                            viewMode === 'list' 
                              ? 'p-3 min-h-[200px]' 
                              : 'p-4 sm:p-6 min-h-[280px] sm:min-h-[320px]'
                          } ${
                            theme === 'dark' 
                              ? 'bg-slate-800/80 border border-slate-700' 
                              : 'bg-white border border-gray-200'
                          }`}
                        >
                          {/* Barra de Progreso */}
                          {client.progress && (
                            <div className="mb-2">
                              <ProgressTracker
                                dailyProgress={0}
                                monthlyProgress={client.progress.monthlyProgress}
                                completedDays={client.progress.completedDays}
                                totalDays={client.progress.totalDays}
                                showDetails={false}
                                createdAt={client.createdAt}
                                lastLogin={client.lastLogin}
                              />
                            </div>
                          )}
                          <div>
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 
                                  className={`text-xl sm:text-2xl font-bold mb-1 line-clamp-2 ${
                                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                                  }`}
                                  title={client.name}
                                >
                                  {formatClientName(client.name)}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  isClientOnline(client)
                                    ? theme === 'dark'
                                      ? 'bg-green-600/30 text-green-300 border border-green-500/70'
                                      : 'bg-green-100 text-green-700 border border-green-500'
                                    : client.status === 'active'
                                    ? theme === 'dark'
                                      ? 'bg-slate-600/30 text-slate-300 border border-slate-500/70'
                                      : 'bg-gray-200 text-gray-700 border border-gray-400'
                                    : theme === 'dark'
                                      ? 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                      : 'bg-gray-200 text-gray-600 border border-gray-400'
                                }`}>
                                  {isClientOnline(client) ? t('dashboard.online') : (client.status === 'active' ? t('dashboard.disconnected') : t('dashboard.inactive'))}
                                </span>
                                {/* Dropdown de categoría y botón eliminar - Solo para coach */}
                                <div className="flex items-center gap-2">
                                  {isCoach && (
                                    <select
                                      value={client.clientCategory === 'old' ? 'old' : client.clientCategory === 'new' ? 'new' : (newClients.includes(client) ? 'new' : 'old')}
                                      onChange={(e) => {
                                        const newCategory = e.target.value as 'new' | 'old'
                                        handleMoveClientCategory({ stopPropagation: () => {} } as any, client.id, newCategory)
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                        theme === 'dark'
                                          ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                                          : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                                      }`}
                                      title="Cambiar categoría"
                                    >
                                      <option value="new">Nuevo</option>
                                      <option value="old">Antiguo</option>
                                    </select>
                                  )}
                                  <button
                                    onClick={(e) => handleDeleteClient(e, client.id)}
                                    className={`p-2 rounded-lg transition-colors ${
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
                                </div>
                              </div>
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

                            {/* Suscripción */}
                          </div>
                        </motion.div>
                      ))}
                      </div>
                    )}
                    </div>
                  )}
                </>
              )
            })()}
        </motion.div>
      </div>

      {/* Modal para agregar cliente */}
      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleClientAdded}
      />
      
      <ImportClientsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleClientAdded}
      />

      {/* Modales para clientes */}
      {clientData?.id && (
        <>
          <RMAndPRModal
            isOpen={showRMAndPRModal}
            onClose={() => setShowRMAndPRModal(false)}
            clientId={clientData.id}
            isCoach={false}
          />
          <LoadAndEffortModal
            isOpen={showLoadAndEffortModal}
            onClose={() => setShowLoadAndEffortModal(false)}
            clientId={clientData.id}
          />
          <CoachContactModal
            isOpen={showCoachContactModal}
            onClose={() => setShowCoachContactModal(false)}
          />
        </>
      )}

    </div>
  )
}

export default HomePage
