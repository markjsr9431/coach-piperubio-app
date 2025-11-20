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
import DailyFeedbackModal from '../components/DailyFeedbackModal'
import { db } from '../firebaseConfig'
import { collection, onSnapshot, doc, deleteDoc, getDocs, getDoc, query, where, orderBy, Timestamp, QuerySnapshot, DocumentSnapshot } from 'firebase/firestore'

// Datos de ejemplo de clientes (esto se conectará con Firebase más adelante)
interface Client {
  id: string
  name: string
  email: string
  plan: string
  status: 'active' | 'inactive' | 'pending'
  lastWorkout?: string
  createdAt?: any
  lastLogin?: any
  subscriptionStartDate?: any
  subscriptionEndDate?: any
  profilePhoto?: string | null
  avatar?: string | null
  isPaymentExempt?: boolean
  progress?: {
    monthlyProgress: number
    completedDays: number
    totalDays: number
    averageWorkoutTime?: number // en segundos
  }
  latestRM?: {
    exercise: string
    weight: string
    date?: any
  } | null
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
  const [sortBy, setSortBy] = useState<'name' | 'subscription' | 'payment' | 'createdAt' | 'none'>('none')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'pending' | 'all'>('all')
  const [rmFilter, setRmFilter] = useState<boolean | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [hasFeedbackToday, setHasFeedbackToday] = useState(false)
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [deletingClients, setDeletingClients] = useState(false)
  
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
      interface ClientData {
        name?: string
        email?: string
        plan?: string
        status?: string
        lastWorkout?: any
        createdAt?: any
        lastLogin?: any
        subscriptionStartDate?: any
        subscriptionEndDate?: any
        profilePhoto?: string | null
        avatar?: string | null
        isPaymentExempt?: boolean
      }

      const isClient = (data: any): data is ClientData => {
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

      // Función para construir query dinámica según filtros
      const buildQuery = (clientsRef: any) => {
        let q: any = clientsRef
        
        // Aplicar filtro de estado (solo para 'active' e 'inactive', 'pending' se calcula dinámicamente)
        if (statusFilter !== 'all' && statusFilter !== 'pending') {
          q = query(q, where('status', '==', statusFilter))
        }
        
        // Aplicar ordenamiento
        if (sortBy !== 'none') {
          let orderField = 'name'
          if (sortBy === 'createdAt') {
            orderField = 'createdAt'
          } else if (sortBy === 'subscription') {
            orderField = 'subscriptionStartDate'
          } else if (sortBy === 'payment') {
            orderField = 'subscriptionEndDate'
          }
          q = query(q, orderBy(orderField, sortOrder))
        } else {
          // Ordenamiento por defecto: alfabético
          q = query(q, orderBy('name', 'asc'))
        }
        
        return q
      }

      // Función para verificar si un cliente tiene registros RM
      const hasRMRecords = async (clientId: string): Promise<boolean> => {
        try {
          const recordsRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
          const recordsDoc = await getDoc(recordsRef)
          if (recordsDoc.exists()) {
            const data = recordsDoc.data()
            return (data.rms && data.rms.length > 0) || false
          }
          return false
        } catch (error) {
          console.error(`Error checking RM records for ${clientId}:`, error)
          return false
        }
      }

      // Cargar una vez inicialmente para mostrar datos rápido
      const loadClients = async () => {
        try {
          const clientsRef = collection(db, 'clients')
          
          // Construir query dinámica
          const q = buildQuery(clientsRef)
          const snapshot = await getDocs(q)
          
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

                // Cargar último RM
                let latestRM = null
                try {
                  const recordsRef = doc(db, 'clients', docSnapshot.id, 'records', 'rm_pr')
                  const recordsDoc = await getDoc(recordsRef)
                  if (recordsDoc.exists()) {
                    const recordsData = recordsDoc.data()
                    const rms = recordsData.rms || []
                    if (rms.length > 0) {
                      // Obtener el RM más reciente
                      const sortedRMs = [...rms].sort((a: any, b: any) => {
                        const dateA = a.date?.toDate ? a.date.toDate() : (a.date ? new Date(a.date) : new Date(0))
                        const dateB = b.date?.toDate ? b.date.toDate() : (b.date ? new Date(b.date) : new Date(0))
                        return dateB.getTime() - dateA.getTime()
                      })
                      latestRM = {
                        exercise: sortedRMs[0].exercise || '',
                        weight: sortedRMs[0].weight || '',
                        date: sortedRMs[0].date
                      }
                    }
                  }
                } catch (error) {
                  console.error(`Error loading RM for ${docSnapshot.id}:`, error)
                }

                // Cargar pagos del cliente
                let payments: any[] = []
                try {
                  const paymentsRef = collection(db, 'clients', docSnapshot.id, 'payments')
                  const paymentsSnapshot = await getDocs(paymentsRef)
                  payments = paymentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  }))
                } catch (error) {
                  console.error(`Error loading payments for ${docSnapshot.id}:`, error)
                }

              const clientData = data as ClientData
              const tempClient: Client = {
                id: docSnapshot.id,
                name: clientData.name || '',
                email: clientData.email || '',
                plan: clientData.plan || 'Plan Mensual - Nivel 2',
                status: (clientData.status as 'active' | 'inactive' | 'pending') || 'active',
                lastWorkout: clientData.lastWorkout || undefined,
                createdAt: clientData.createdAt || undefined,
                lastLogin: clientData.lastLogin || undefined,
                subscriptionStartDate: clientData.subscriptionStartDate || clientData.createdAt || undefined,
                subscriptionEndDate: clientData.subscriptionEndDate || undefined,
                profilePhoto: clientData.profilePhoto || null,
                avatar: clientData.avatar || null,
                isPaymentExempt: clientData.isPaymentExempt || false,
                progress,
                latestRM
              }
              
              // Calcular estado dinámicamente basado en pagos y fecha de suscripción
              const calculatedStatus = calculateClientStatus(tempClient, payments)
              const client: Client = {
                ...tempClient,
                status: calculatedStatus
              }
                return client
              }
              return null
            })
          )

          let validClients = clientsWithProgress.filter((c): c is Client => c !== null)
          
          // Filtrar clientes según el filtro de estado (el estado ya está calculado dinámicamente)
          if (statusFilter !== 'all') {
            validClients = validClients.filter((client) => {
              return client.status === statusFilter
            })
          } else {
            // Si el filtro es 'all', mostrar solo clientes activos y pendientes (no inactivos por defecto)
            // Esto mantiene el comportamiento anterior donde solo se mostraban activos
            validClients = validClients.filter((client) => {
              return client.status === 'active' || client.status === 'pending'
            })
          }
          
          // Aplicar filtro por RM si está activo
          if (rmFilter !== null) {
            const clientsWithRMCheck = await Promise.all(
              validClients.map(async (client) => {
                const hasRM = await hasRMRecords(client.id)
                return { client, hasRM }
              })
            )
            validClients = clientsWithRMCheck
              .filter(({ hasRM }) => rmFilter === hasRM)
              .map(({ client }) => client)
          }
          
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
      const q = buildQuery(clientsRef)
      const unsubscribe = onSnapshot(q, async (snapshot: QuerySnapshot) => {
        // Cargar progreso para cada cliente
        const clientsWithProgress = await Promise.all(
          Array.from(snapshot.docs).map(async (docSnapshot: DocumentSnapshot) => {
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
                        monthlyProgress: progressData?.monthlyProgress || 0,
                        completedDays: progressData?.completedDays || 0,
                        totalDays: progressData?.totalDays || 30,
                        averageWorkoutTime: progressData?.averageWorkoutTime || undefined
                      }
                }
              } catch (error) {
                console.error(`Error loading progress for ${docSnapshot.id}:`, error)
              }

              // Cargar último RM
              let latestRM = null
              try {
                const recordsRef = doc(db, 'clients', docSnapshot.id, 'records', 'rm_pr')
                const recordsDoc = await getDoc(recordsRef)
                if (recordsDoc.exists()) {
                  const recordsData = recordsDoc.data()
                  const rms = recordsData?.rms || []
                  if (rms.length > 0) {
                    // Obtener el RM más reciente
                    const sortedRMs = [...rms].sort((a: any, b: any) => {
                      const dateA = a.date?.toDate ? a.date.toDate() : (a.date ? new Date(a.date) : new Date(0))
                      const dateB = b.date?.toDate ? b.date.toDate() : (b.date ? new Date(b.date) : new Date(0))
                      return dateB.getTime() - dateA.getTime()
                    })
                    latestRM = {
                      exercise: sortedRMs[0].exercise || '',
                      weight: sortedRMs[0].weight || '',
                      date: sortedRMs[0].date
                    }
                  }
                }
              } catch (error) {
                console.error(`Error loading RM for ${docSnapshot.id}:`, error)
              }

              // Cargar pagos del cliente
              let payments: any[] = []
              try {
                const paymentsRef = collection(db, 'clients', docSnapshot.id, 'payments')
                const paymentsSnapshot = await getDocs(paymentsRef)
                payments = paymentsSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }))
              } catch (error) {
                console.error(`Error loading payments for ${docSnapshot.id}:`, error)
              }

              const clientData = data as ClientData
              const tempClient: Client = {
                id: docSnapshot.id,
                name: clientData.name || '',
                email: clientData.email || '',
                plan: clientData.plan || 'Plan Mensual - Nivel 2',
                status: (clientData.status as 'active' | 'inactive' | 'pending') || 'active',
                lastWorkout: clientData.lastWorkout || undefined,
                createdAt: clientData.createdAt || undefined,
                lastLogin: clientData.lastLogin || undefined,
                subscriptionStartDate: clientData.subscriptionStartDate || clientData.createdAt || undefined,
                subscriptionEndDate: clientData.subscriptionEndDate || undefined,
                profilePhoto: clientData.profilePhoto || null,
                avatar: clientData.avatar || null,
                isPaymentExempt: clientData.isPaymentExempt || false,
                progress,
                latestRM
              }
              
              // Calcular estado dinámicamente basado en pagos y fecha de suscripción
              const calculatedStatus = calculateClientStatus(tempClient, payments)
              const client: Client = {
                ...tempClient,
                status: calculatedStatus
              }
              return client
            }
            return null
          })
        )

        let validClients = clientsWithProgress.filter((c): c is Client => c !== null)
        
        // Filtrar clientes según el filtro de estado (el estado ya está calculado dinámicamente)
        if (statusFilter !== 'all') {
          validClients = validClients.filter((client) => {
            return client.status === statusFilter
          })
        } else {
          // Si el filtro es 'all', mostrar solo clientes activos y pendientes (no inactivos por defecto)
          // Esto mantiene el comportamiento anterior donde solo se mostraban activos
          validClients = validClients.filter((client) => {
            return client.status === 'active' || client.status === 'pending'
          })
        }
        
        // Aplicar filtro por RM si está activo
        if (rmFilter !== null) {
          const clientsWithRMCheck = await Promise.all(
            validClients.map(async (client) => {
              const hasRM = await hasRMRecords(client.id)
              return { client, hasRM }
            })
          )
          validClients = clientsWithRMCheck
            .filter(({ hasRM }) => rmFilter === hasRM)
            .map(({ client }) => client)
        }
        
        console.log(`Actualización en tiempo real: ${validClients.length} clientes:`, validClients.map(c => c.email))
        setClients(validClients)
      }, (error: any) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isCoach, statusFilter, sortBy, sortOrder, rmFilter])

  // Verificar si hay feedback del día de hoy (solo para clientes)
  useEffect(() => {
    if (isCoach || !user || !clientData?.id) {
      setShowFeedbackModal(false)
      setHasFeedbackToday(false)
      return
    }

    const checkTodayFeedback = async () => {
      try {
        // Crear timestamp del día de hoy (inicio del día, sin horas)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayTimestamp = Timestamp.fromDate(today)

        // Consultar si existe feedback para hoy
        const feedbackRef = collection(db, 'dailyFeedback')
        const q = query(
          feedbackRef,
          where('clientId', '==', clientData.id),
          where('date', '==', todayTimestamp)
        )
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
          // No hay feedback de hoy, mostrar modal
          setShowFeedbackModal(true)
          setHasFeedbackToday(false)
        } else {
          // Ya hay feedback de hoy, no mostrar modal
          setShowFeedbackModal(false)
          setHasFeedbackToday(true)
        }
      } catch (error) {
        console.error('Error checking today feedback:', error)
        // En caso de error, no mostrar el modal
        setShowFeedbackModal(false)
        setHasFeedbackToday(false)
      }
    }

    checkTodayFeedback()
  }, [user, isCoach, clientData?.id])


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

  const handleDeleteSelectedClients = async () => {
    if (selectedClients.size === 0) return

    const count = selectedClients.size
    const confirmMessage = `¿Estás seguro de que deseas eliminar ${count} ${count === 1 ? 'cliente' : 'clientes'}?`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    setDeletingClients(true)
    const clientIds = Array.from(selectedClients)
    let successCount = 0
    let errorCount = 0

    try {
      // Eliminar clientes en paralelo
      const deletePromises = clientIds.map(async (clientId) => {
        try {
          await deleteDoc(doc(db, 'clients', clientId))
          successCount++
        } catch (error: any) {
          console.error(`Error al eliminar cliente ${clientId}:`, error)
          errorCount++
        }
      })

      await Promise.all(deletePromises)

      // Limpiar selección y desactivar modo selección
      setSelectedClients(new Set())
      setSelectionMode(false)

      // Mostrar resultado
      if (errorCount === 0) {
        alert(`Se eliminaron exitosamente ${successCount} ${successCount === 1 ? 'cliente' : 'clientes'}`)
      } else {
        alert(`Se eliminaron ${successCount} ${successCount === 1 ? 'cliente' : 'clientes'}. ${errorCount} ${errorCount === 1 ? 'error' : 'errores'} ocurrieron.`)
      }
    } catch (error: any) {
      console.error('Error durante eliminación en lote:', error)
      alert(`Error durante la eliminación: ${error.message || 'Error desconocido'}`)
    } finally {
      setDeletingClients(false)
    }
  }

  // Función helper para calcular días hasta próximo pago
  const calculateDaysUntilPayment = (subscriptionEndDate: any): number | null => {
    if (!subscriptionEndDate) return null
    
    try {
      let endDate: Date
      if (subscriptionEndDate.toDate) {
        endDate = subscriptionEndDate.toDate()
      } else if (subscriptionEndDate instanceof Date) {
        endDate = subscriptionEndDate
      } else if (typeof subscriptionEndDate === 'string') {
        endDate = new Date(subscriptionEndDate)
      } else if (subscriptionEndDate?.seconds) {
        endDate = new Date(subscriptionEndDate.seconds * 1000)
      } else {
        return null
      }
      
      if (isNaN(endDate.getTime())) {
        return null
      }
      
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)
      
      const diffTime = endDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays
    } catch (error) {
      console.error('Error calculating days until payment:', error)
      return null
    }
  }

  // Función helper para calcular días suscrito
  const calculateDaysSubscribed = (startDate: any): number | null => {
    if (!startDate) return null
    
    try {
      let date: Date
      if (startDate.toDate) {
        date = startDate.toDate()
      } else if (startDate instanceof Date) {
        date = startDate
      } else if (typeof startDate === 'string') {
        date = new Date(startDate)
      } else if (startDate?.seconds) {
        date = new Date(startDate.seconds * 1000)
      } else {
        return null
      }
      
      if (isNaN(date.getTime())) {
        return null
      }
      
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      date.setHours(0, 0, 0, 0)
      
      const diffTime = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays
    } catch (error) {
      console.error('Error calculating days subscribed:', error)
      return null
    }
  }

  // Función helper para calcular el estado del cliente basado en pagos y fecha de suscripción
  const calculateClientStatus = (client: Client, payments: any[]): 'pending' | 'active' | 'inactive' => {
    // Si el cliente está exento de pago, siempre está activo
    if (client.isPaymentExempt === true) {
      return 'active'
    }
    
    // Si no tiene pagos registrados, está pendiente
    if (!payments || payments.length === 0) {
      return 'pending'
    }

    // Si tiene pagos pero no tiene fecha de fin de suscripción, considerar activo
    if (!client.subscriptionEndDate) {
      return 'active'
    }

    // Convertir subscriptionEndDate a Date
    let endDate: Date | null = null
    if (client.subscriptionEndDate?.toDate) {
      endDate = client.subscriptionEndDate.toDate()
    } else if (client.subscriptionEndDate instanceof Date) {
      endDate = client.subscriptionEndDate
    } else if (typeof client.subscriptionEndDate === 'string') {
      endDate = new Date(client.subscriptionEndDate)
    } else if (client.subscriptionEndDate?.seconds) {
      endDate = new Date(client.subscriptionEndDate.seconds * 1000)
    }

    if (!endDate || isNaN(endDate.getTime())) {
      // Si no se puede convertir la fecha, considerar activo si tiene pagos
      return 'active'
    }

    // Comparar con fecha actual
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    if (now <= endDate) {
      return 'active'
    } else {
      return 'inactive'
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
      <div className="h-20 sm:h-24"></div>

      {/* Contenido Principal */}
      <div className="pt-6 pb-12 px-4 sm:px-6 lg:px-8">
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
            {!isCoach && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={`text-base sm:text-xl ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}
              >
                {clientData?.name || user?.displayName || user?.email || 'Cliente'}
              </motion.p>
            )}
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

          {/* Componente de Filtros - Solo visible para el coach */}
          {isCoach && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mb-6"
            >
              <div className={`max-w-7xl mx-auto p-3 rounded-xl ${
                theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-white/50 border border-gray-200'
              }`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-3">
                  {/* Búsqueda por Nombre */}
                  <div className="relative lg:flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre..."
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                      }`}
                    />
                  </div>

                  {/* Filtro de Estado */}
                  <div className="sm:col-span-1 lg:col-span-1">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | 'pending' | 'all')}
                      className={`w-full px-3 py-2 rounded-lg border transition-colors text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-slate-600 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                      }`}
                    >
                      <option value="all">Todos</option>
                      <option value="active">Activos</option>
                      <option value="pending">Pendientes</option>
                      <option value="inactive">Inactivos</option>
                    </select>
                  </div>

                  {/* Ordenamiento */}
                  <div className="sm:col-span-1 lg:col-span-1">
                    <select
                      value={sortBy === 'none' ? 'name' : sortBy === 'createdAt' ? (sortOrder === 'desc' ? 'recent' : 'oldest') : sortBy}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === 'recent') {
                          setSortBy('createdAt')
                          setSortOrder('desc')
                        } else if (value === 'oldest') {
                          setSortBy('createdAt')
                          setSortOrder('asc')
                        } else if (value === 'name') {
                          setSortBy('name')
                          setSortOrder('asc')
                        } else {
                          setSortBy('none')
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-lg border transition-colors text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-slate-600 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                      }`}
                    >
                      <option value="name">Alfabético (A-Z)</option>
                      <option value="recent">Más Reciente</option>
                      <option value="oldest">Más Antiguo</option>
                    </select>
                  </div>

                  {/* Filtro por RM */}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <select
                      value={rmFilter === null ? 'all' : rmFilter ? 'withRM' : 'withoutRM'}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === 'all') {
                          setRmFilter(null)
                        } else if (value === 'withRM') {
                          setRmFilter(true)
                        } else {
                          setRmFilter(false)
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-lg border transition-colors text-sm ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-slate-600 text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                          : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                      }`}
                    >
                      <option value="all">Todos (RM)</option>
                      <option value="withRM">Con RM</option>
                      <option value="withoutRM">Sin RM</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

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
                      Registra la carga utilizada en tus entrenamientos
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

                {/* Ficha 4: Feedback Diario */}
                <motion.button
                  onClick={() => setShowFeedbackModal(true)}
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
                      theme === 'dark' ? 'bg-purple-600/20' : 'bg-purple-100'
                    }`}>
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Feedback Diario
                    </h3>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                    }`}>
                      Registra tu sensación de esfuerzo y estado de ánimo
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
                className={`bg-gradient-to-r from-primary-600 to-primary-800 text-white px-4 py-2 sm:px-8 sm:py-4 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-200 flex items-center gap-2 sm:gap-3 font-semibold text-sm sm:text-lg border-2 ${
                  theme === 'dark' ? 'border-primary-400' : 'border-primary-700'
                }`}
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
                className={`bg-gradient-to-r from-green-600 to-green-800 text-white px-4 py-2 sm:px-8 sm:py-4 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-200 flex items-center gap-2 sm:gap-3 font-semibold text-sm sm:text-lg border-2 ${
                  theme === 'dark' ? 'border-green-400' : 'border-green-700'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar Clientes
              </motion.button>

              {/* Botón Modo Selección */}
              <motion.button
                onClick={() => {
                  setSelectionMode(!selectionMode)
                  if (selectionMode) {
                    setSelectedClients(new Set())
                  }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`${
                  selectionMode
                    ? 'bg-gradient-to-r from-blue-600 to-blue-800'
                    : 'bg-gradient-to-r from-gray-600 to-gray-800'
                } text-white px-4 py-2 sm:px-8 sm:py-4 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-200 flex items-center gap-2 sm:gap-3 font-semibold text-sm sm:text-lg border-2 ${
                  theme === 'dark' ? 'border-gray-400' : 'border-gray-700'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {selectionMode ? 'Cancelar Selección' : 'Seleccionar'}
              </motion.button>

              {/* Botón Eliminar Seleccionados */}
              {selectionMode && selectedClients.size > 0 && (
                <motion.button
                  onClick={handleDeleteSelectedClients}
                  disabled={deletingClients}
                  whileHover={{ scale: deletingClients ? 1 : 1.05 }}
                  whileTap={{ scale: deletingClients ? 1 : 0.95 }}
                  className={`bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-2 sm:px-8 sm:py-4 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-200 flex items-center gap-2 sm:gap-3 font-semibold text-sm sm:text-lg border-2 ${
                    theme === 'dark' ? 'border-red-400' : 'border-red-700'
                  } ${deletingClients ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {deletingClients ? (
                    <>
                      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar ({selectedClients.size})
                    </>
                  )}
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Contenido según el tipo de usuario */}
          {isCoach ? (
            /* Vista del Coach - Lista de Clientes */
            <div className="mb-8">

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
                    case 'createdAt':
                      // Ordenar por subscriptionStartDate (fecha de inicio de suscripción) para "Más Antiguo"
                      // Usar fecha muy futura para clientes sin fecha (van al final)
                      const futureDate = new Date('9999-12-31')
                      
                      const aStartDate = a.subscriptionStartDate?.toDate 
                        ? a.subscriptionStartDate.toDate() 
                        : a.subscriptionStartDate 
                        ? new Date(a.subscriptionStartDate) 
                        : (a.createdAt?.toDate 
                          ? a.createdAt.toDate() 
                          : a.createdAt 
                          ? new Date(a.createdAt) 
                          : futureDate)
                      
                      const bStartDate = b.subscriptionStartDate?.toDate 
                        ? b.subscriptionStartDate.toDate() 
                        : b.subscriptionStartDate 
                        ? new Date(b.subscriptionStartDate) 
                        : (b.createdAt?.toDate 
                          ? b.createdAt.toDate() 
                          : b.createdAt 
                          ? new Date(b.createdAt) 
                          : futureDate)
                      
                      comparison = aStartDate.getTime() - bStartDate.getTime()
                      break
                  }
                  
                  return sortOrder === 'asc' ? comparison : -comparison
                })
              }
              
              const allClients = sortedClients
              
              // Aplicar filtro de búsqueda
              const filteredAllClients = filterClients(allClients)

              return (
                <>
                  {/* Listado completo de todos los clientes */}
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
                        Clientes ({filteredAllClients.length})
                      </motion.h3>
                        
                      </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {filteredAllClients.map((client, index) => (
                        <motion.div
                          key={client.id}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: 0.9 + index * 0.05 }}
                          whileHover={{ scale: 1.02, y: -5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleClientClick(client.id)}
                          className={`rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 relative flex flex-col justify-between cursor-pointer p-2 sm:p-3 h-full ${
                            theme === 'dark' 
                              ? 'bg-slate-800/80 border border-slate-700' 
                              : 'bg-white border border-gray-200'
                          } ${selectionMode && selectedClients.has(client.id) ? 'ring-2 ring-primary-500' : ''}`}
                        >
                          {/* Checkbox de selección - Solo visible en modo selección */}
                          {selectionMode && isCoach && (
                            <div
                              className="absolute top-2 left-2 z-10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedClients.has(client.id)}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  const newSelected = new Set(selectedClients)
                                  if (e.target.checked) {
                                    newSelected.add(client.id)
                                  } else {
                                    newSelected.delete(client.id)
                                  }
                                  setSelectedClients(newSelected)
                                }}
                                className={`w-5 h-5 rounded border-2 cursor-pointer ${
                                  theme === 'dark'
                                    ? 'border-slate-500 bg-slate-700 checked:bg-primary-600 checked:border-primary-600'
                                    : 'border-gray-300 bg-white checked:bg-primary-600 checked:border-primary-600'
                                } focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                              />
                            </div>
                          )}
                          {/* Botón eliminar - Solo para coach, oculto en modo selección */}
                          {!selectionMode && isCoach && (
                            <button
                              onClick={(e) => handleDeleteClient(e, client.id)}
                              className={`absolute top-2 right-2 p-1.5 rounded-lg transition-colors ${
                                theme === 'dark'
                                  ? 'hover:bg-red-500/20 text-red-400'
                                  : 'hover:bg-red-50 text-red-600'
                              }`}
                              title={t('dashboard.deleteClient')}
                              aria-label={t('dashboard.deleteClient')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          <div className={`${selectionMode ? 'pl-8' : 'pr-6'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 
                                className={`text-sm font-bold line-clamp-2 flex-1 ${
                                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}
                                title={client.name}
                              >
                                {formatClientName(client.name)}
                              </h3>
                              {/* Badge de Estado */}
                              <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold whitespace-nowrap ${
                                client.status === 'pending'
                                  ? 'bg-yellow-500/20 text-yellow-600 dark:bg-yellow-500/30 dark:text-yellow-400'
                                  : client.status === 'active'
                                  ? 'bg-green-500/20 text-green-600 dark:bg-green-500/30 dark:text-green-400'
                                  : 'bg-red-500/20 text-red-600 dark:bg-red-500/30 dark:text-red-400'
                              }`}>
                                {client.status === 'pending' ? 'Pendiente' : client.status === 'active' ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <div className={`text-[10px] sm:text-xs space-y-0 ${
                              theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                            }`}>
                                {(() => {
                                  const daysSubscribed = calculateDaysSubscribed(client.subscriptionStartDate || client.createdAt)
                                  const daysUntilPayment = calculateDaysUntilPayment(client.subscriptionEndDate)
                                  return (
                                    <>
                                      {daysSubscribed !== null && (
                                        <p>Días suscrito: {daysSubscribed} días</p>
                                      )}
                                      {daysUntilPayment !== null ? (
                                        <p>Próximo pago en: {daysUntilPayment > 0 ? `${daysUntilPayment} días` : 'Hoy'}</p>
                                      ) : (
                                        <p>Sin fecha de pago</p>
                                      )}
                                      {client.latestRM && (
                                        <p className="mt-0.5">
                                          <span className="font-semibold">RM:</span> {client.latestRM.weight} {client.latestRM.exercise}
                                        </p>
                                      )}
                                    </>
                                  )
                                })()}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
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
      {clientData?.id && !isCoach && (
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
          <DailyFeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => {
              setShowFeedbackModal(false)
            }}
            onSave={() => {
              setHasFeedbackToday(true)
            }}
            clientId={clientData.id}
            hasFeedbackToday={hasFeedbackToday}
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
