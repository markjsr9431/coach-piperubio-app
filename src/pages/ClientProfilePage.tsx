import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { db, auth } from '../firebaseConfig'
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import TopBanner from '../components/TopBanner'
import RMAndPRSection from '../components/RMAndPRSection'

const ClientProfilePage = () => {
  const navigate = useNavigate()
  const { clientId } = useParams<{ clientId: string }>()
  const { theme } = useTheme()
  const { user } = useAuth()
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cedula: '',
    rh: '',
    eps: '',
    profilePhoto: null as string | null,
    subscriptionStartDate: '',
    subscriptionEndDate: '',
    paymentMethod: '' as 'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'otro' | '',
    paymentFrequency: '' as 'mensual' | 'trimestral' | 'cuotas' | 'dias' | 'por_clases' | '',
    otherPaymentMethod: ''
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    method: '' as 'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'otro' | '',
    frequency: '' as 'mensual' | 'trimestral' | 'cuotas' | 'dias' | 'por_clases' | '',
    notes: '',
    otherPaymentMethod: ''
  })
  const [savingPayment, setSavingPayment] = useState(false)
  const [isPersonalInfoExpanded, setIsPersonalInfoExpanded] = useState(false)
  const [isSubscriptionExpanded, setIsSubscriptionExpanded] = useState(false)
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false)
  const [isRMAndPRExpanded, setIsRMAndPRExpanded] = useState(false)
  const [feedbackList, setFeedbackList] = useState<Array<{day: number, data: any}>>([])

  // Cargar datos del cliente
  useEffect(() => {
    const loadClientData = async () => {
      if (!clientId || !isCoach) {
        setLoading(false)
        return
      }

      try {
        const clientRef = doc(db, 'clients', clientId)
        const clientDoc = await getDoc(clientRef)
        
        if (clientDoc.exists()) {
          const data = clientDoc.data()
          const startDate = data.subscriptionStartDate?.toDate 
            ? data.subscriptionStartDate.toDate() 
            : data.subscriptionStartDate 
            ? new Date(data.subscriptionStartDate) 
            : data.createdAt?.toDate 
            ? data.createdAt.toDate() 
            : data.createdAt 
            ? new Date(data.createdAt) 
            : null
          const endDate = data.subscriptionEndDate?.toDate 
            ? data.subscriptionEndDate.toDate() 
            : data.subscriptionEndDate 
            ? new Date(data.subscriptionEndDate) 
            : null

          setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            cedula: data.cedula || '',
            rh: data.rh || '',
            eps: data.eps || '',
            profilePhoto: data.profilePhoto || null,
            subscriptionStartDate: startDate ? startDate.toISOString().split('T')[0] : '',
            subscriptionEndDate: endDate ? endDate.toISOString().split('T')[0] : '',
            paymentMethod: data.paymentMethod || '',
            paymentFrequency: data.paymentFrequency || '',
            otherPaymentMethod: data.otherPaymentMethod || ''
          })
          if (data.profilePhoto) {
            // Si es base64 (empieza con data:image) o URL
            setPhotoPreview(data.profilePhoto)
          }
        }
      } catch (error) {
        console.error('Error loading client data:', error)
        setError('Error al cargar los datos del cliente')
      } finally {
        setLoading(false)
      }
    }

    loadClientData()
  }, [clientId, isCoach])

  // Cargar historial de pagos
  useEffect(() => {
    if (!clientId || !isCoach) return

    const paymentsRef = collection(db, 'clients', clientId, 'payments')
    const q = query(paymentsRef, orderBy('date', 'desc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const paymentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setPayments(paymentsList)
    }, (error) => {
      console.error('Error loading payments:', error)
    })

    return () => unsubscribe()
  }, [clientId, isCoach])

  // Cargar retroalimentación desde localStorage
  useEffect(() => {
    if (!clientId) return

    const loadFeedback = () => {
      const feedbacks: Array<{day: number, data: any}> = []
      // Buscar retroalimentación de los últimos 30 días
      for (let day = 1; day <= 30; day++) {
        const storageKey = `feedback_${clientId}_day_${day}`
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            feedbacks.push({ day, data: parsed })
          } catch (error) {
            console.error(`Error loading feedback for day ${day}:`, error)
          }
        }
      }
      // Ordenar por día descendente
      feedbacks.sort((a, b) => b.day - a.day)
      setFeedbackList(feedbacks)
    }

    loadFeedback()
  }, [clientId])

  // Función para redimensionar imagen y convertir a base64 (para Firestore)
  const resizeImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validar tamaño antes de procesar (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('La imagen es demasiado grande. Por favor, selecciona una imagen más pequeña (máximo 5MB).'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_SIZE = 128
          let width = img.width
          let height = img.height

          // Calcular dimensiones manteniendo proporción
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto del canvas'))
            return
          }
          
          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convertir a base64 con calidad reducida
          // Intentar diferentes niveles de calidad hasta que el tamaño sea aceptable (máximo 800KB para Firestore)
          let quality = 0.7
          const maxSize = 800 * 1024 // 800KB máximo (Firestore permite hasta 1MB)
          
          const tryCompress = (q: number) => {
            const base64 = canvas.toDataURL('image/jpeg', q)
            // Calcular tamaño aproximado (base64 es ~33% más grande que el binario)
            const size = (base64.length * 3) / 4
            
            if (size > maxSize && q > 0.3) {
              // Reducir calidad si el tamaño es muy grande
              tryCompress(q - 0.1)
            } else {
              resolve(base64)
            }
          }
          
          tryCompress(quality)
        }
        img.onerror = () => reject(new Error('Error al cargar la imagen'))
        if (e.target?.result) {
          img.src = e.target.result as string
        }
      }
      reader.onerror = () => reject(new Error('Error al leer el archivo'))
      reader.readAsDataURL(file)
    })
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecciona un archivo de imagen')
      return
    }

    // Validar tamaño (máximo 5MB antes de redimensionar)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Por favor, selecciona una imagen más pequeña (máximo 5MB).')
      return
    }

    try {
      setError(null)
      // Redimensionar imagen y convertir a base64
      const base64 = await resizeImageToBase64(file)
      
      // Usar base64 directamente como preview
      setPhotoPreview(base64)
      setPhotoBase64(base64)
    } catch (error: any) {
      console.error('Error processing image:', error)
      setError(error.message || 'Error al procesar la imagen')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSave = async () => {
    if (!clientId || !isCoach) return

    setSaving(true)
    setError(null)

    try {
      let photoUrl = formData.profilePhoto

      // Guardar foto como base64 si hay una nueva
      if (photoBase64) {
        // Guardar directamente como base64 en Firestore
        photoUrl = photoBase64
        console.log('Foto procesada exitosamente (base64)')
      }

      // Actualizar datos en Firestore
      const clientRef = doc(db, 'clients', clientId)
      const clientDoc = await getDoc(clientRef)
      
      if (clientDoc.exists()) {
        const clientData = clientDoc.data()
        const updatedName = formData.name.trim()
        
        const subscriptionStartDate = formData.subscriptionStartDate 
          ? new Date(formData.subscriptionStartDate) 
          : null
        const subscriptionEndDate = formData.subscriptionEndDate 
          ? new Date(formData.subscriptionEndDate) 
          : null

        await updateDoc(clientRef, {
          name: updatedName,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          cedula: formData.cedula.trim() || null,
          rh: formData.rh.trim() || null,
          eps: formData.eps.trim() || null,
          profilePhoto: photoUrl || null,
          subscriptionStartDate: subscriptionStartDate || null,
          subscriptionEndDate: subscriptionEndDate || null,
          paymentMethod: formData.paymentMethod || null,
          paymentFrequency: formData.paymentFrequency || null,
          otherPaymentMethod: formData.otherPaymentMethod || null,
          updatedAt: serverTimestamp(),
          updatedBy: user?.email || ''
        })

        // Si el cliente tiene una cuenta de Auth asociada (mismo email), actualizar displayName
        if (clientData.email && auth.currentUser && auth.currentUser.email?.toLowerCase() === clientData.email.toLowerCase()) {
          try {
            await updateProfile(auth.currentUser, {
              displayName: updatedName
            })
          } catch (error) {
            console.error('Error updating Auth displayName:', error)
            // Continuar aunque falle la actualización en Auth
          }
        }

        // También actualizar en la colección 'users' si existe
        try {
          const usersRef = doc(db, 'users', clientId)
          const userDoc = await getDoc(usersRef)
          if (userDoc.exists()) {
            await updateDoc(usersRef, {
              displayName: updatedName,
              email: formData.email.trim().toLowerCase(),
              updatedAt: new Date().toISOString()
            })
          }
        } catch (error) {
          console.error('Error updating user document:', error)
          // Continuar aunque falle
        }
      }

      // Actualizar estado local
      setFormData(prev => ({ ...prev, profilePhoto: photoUrl }))
      setPhotoBase64(null)
      
      alert('Información del cliente actualizada correctamente')
    } catch (error: any) {
      console.error('Error saving client data:', error)
      setError(error.message || 'Error al guardar los datos del cliente')
    } finally {
      setSaving(false)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setPhotoBase64(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setPaymentFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSavePayment = async () => {
    if (!clientId || !isCoach) return

    if (!paymentFormData.date || !paymentFormData.method) {
      setError('Por favor completa la fecha y el método de pago')
      return
    }

    setSavingPayment(true)
    setError(null)

    try {
      const paymentDate = new Date(paymentFormData.date)
      const paymentsRef = collection(db, 'clients', clientId, 'payments')
      
      const paymentData: any = {
        date: Timestamp.fromDate(paymentDate),
        amount: paymentFormData.amount ? parseFloat(paymentFormData.amount) : null,
        method: paymentFormData.method,
        frequency: paymentFormData.frequency || null,
        notes: paymentFormData.notes || '',
        createdAt: serverTimestamp()
      }
      
      // Agregar método de pago personalizado si se seleccionó "otro"
      if (paymentFormData.method === 'otro' && paymentFormData.otherPaymentMethod) {
        paymentData.otherPaymentMethod = paymentFormData.otherPaymentMethod.trim()
      }
      
      await addDoc(paymentsRef, paymentData)

      // Resetear formulario
      setPaymentFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        method: '' as 'efectivo' | 'transferencia' | 'tarjeta_debito' | 'tarjeta_credito' | 'otro' | '',
        frequency: '' as 'mensual' | 'trimestral' | 'cuotas' | 'dias' | 'por_clases' | '',
        notes: '',
        otherPaymentMethod: ''
      })
      setShowPaymentModal(false)
    } catch (error: any) {
      console.error('Error saving payment:', error)
      let errorMessage = 'Error al registrar el pago'
      
      if (error.code === 'permission-denied') {
        errorMessage = 'No tienes permisos para registrar pagos. Verifica las reglas de Firestore.'
      } else if (error.code === 'unavailable') {
        errorMessage = 'Servicio no disponible. Por favor, intenta de nuevo más tarde.'
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`
      }
      
      setError(errorMessage)
    } finally {
      setSavingPayment(false)
    }
  }

  const handleExportToCSV = async () => {
    if (!clientId) return

    try {
      // Cargar datos de RM/PR
      let rms: any[] = []
      let prs: any[] = []
      try {
        const recordsRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
        const recordsDoc = await getDoc(recordsRef)
        if (recordsDoc.exists()) {
          const data = recordsDoc.data()
          rms = (data.rms || []).map((rm: any) => ({
            ...rm,
            date: rm.date?.toDate ? rm.date.toDate() : (typeof rm.date === 'number' ? new Date(rm.date) : new Date())
          }))
          prs = (data.prs || []).map((pr: any) => ({
            ...pr,
            date: pr.date?.toDate ? pr.date.toDate() : (typeof pr.date === 'number' ? new Date(pr.date) : new Date())
          }))
        }
      } catch (error) {
        console.error('Error loading RM/PR:', error)
      }

      // Preparar datos para CSV
      const csvRows: string[] = []
      
      // Encabezado principal
      csvRows.push('INFORMACIÓN DEL CLIENTE')
      csvRows.push('')
      
      // Información Personal
      csvRows.push('INFORMACIÓN PERSONAL')
      csvRows.push('Nombre,' + (formData.name || ''))
      csvRows.push('Email,' + (formData.email || ''))
      csvRows.push('Teléfono,' + (formData.phone || ''))
      csvRows.push('Cédula,' + (formData.cedula || ''))
      csvRows.push('RH,' + (formData.rh || ''))
      csvRows.push('EPS,' + (formData.eps || ''))
      csvRows.push('')
      
      // Información de Suscripción
      csvRows.push('SUSCRIPCIÓN')
      csvRows.push('Fecha de Inicio,' + (formData.subscriptionStartDate || ''))
      csvRows.push('Fecha de Fin,' + (formData.subscriptionEndDate || ''))
      csvRows.push('Método de Pago,' + (formData.paymentMethod || ''))
      csvRows.push('Frecuencia de Pago,' + (formData.paymentFrequency || ''))
      if (formData.otherPaymentMethod) {
        csvRows.push('Otro Método de Pago,' + formData.otherPaymentMethod)
      }
      csvRows.push('')
      
      // Historial de Pagos
      csvRows.push('HISTORIAL DE PAGOS')
      csvRows.push('Fecha,Monto,Método,Frecuencia,Notas')
      payments.forEach((payment: any) => {
        const date = payment.date?.toDate ? payment.date.toDate() : (payment.date ? new Date(payment.date) : new Date())
        const dateStr = date.toLocaleDateString('es-ES')
        const amount = payment.amount || ''
        const method = payment.method || ''
        const frequency = payment.frequency || ''
        const notes = (payment.notes || '').replace(/,/g, ';').replace(/\n/g, ' ')
        csvRows.push(`${dateStr},${amount},${method},${frequency},"${notes}"`)
      })
      csvRows.push('')
      
      // Registros RM
      csvRows.push('REGISTROS RM (REPETICIÓN MÁXIMA)')
      csvRows.push('Fecha,Ejercicio,Peso,Implemento')
      rms.forEach((rm: any) => {
        const date = rm.date instanceof Date ? rm.date : new Date(rm.date)
        const dateStr = date.toLocaleDateString('es-ES')
        csvRows.push(`${dateStr},"${rm.exercise || ''}","${rm.weight || ''}","${rm.implement || ''}"`)
      })
      csvRows.push('')
      
      // Registros PR
      csvRows.push('REGISTROS PR (RÉCORD PERSONAL)')
      csvRows.push('Fecha,Ejercicio,Tiempo,Implemento')
      prs.forEach((pr: any) => {
        const date = pr.date instanceof Date ? pr.date : new Date(pr.date)
        const dateStr = date.toLocaleDateString('es-ES')
        csvRows.push(`${dateStr},"${pr.exercise || ''}","${pr.time || ''}","${pr.implement || ''}"`)
      })
      csvRows.push('')
      
      // Retroalimentación
      csvRows.push('RETROALIMENTACIÓN DIARIA')
      csvRows.push('Día,Comentario,Esfuerzo,Peso Utilizado,Sentimiento')
      feedbackList.forEach(({ day, data }) => {
        const comment = (data.comment || '').replace(/,/g, ';').replace(/\n/g, ' ')
        const effort = data.effort !== null && data.effort !== undefined ? data.effort : ''
        const weightUsed = data.weightUsed && data.weightUsed.length > 0
          ? data.weightUsed.filter((w: string) => w !== 'Otro').map((implement: string) => {
              const amount = data.weightAmounts?.[implement]
              return amount ? `${implement} (${amount}kg)` : implement
            }).join('; ')
          : ''
        const feeling = data.feeling || ''
        csvRows.push(`${day},"${comment}",${effort},"${weightUsed}",${feeling}`)
      })
      
      // Crear archivo CSV
      const csvContent = csvRows.join('\n')
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fileName = `cliente_${formData.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting to CSV:', error)
      alert('Error al exportar la información. Por favor, intenta de nuevo.')
    }
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">No tienes permisos para acceder a esta página</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${
        theme === 'dark' 
          ? 'from-slate-900 via-slate-800 to-slate-900' 
          : 'from-gray-50 via-gray-100 to-gray-200'
      }`}>
        <TopBanner />
        <div className="h-40 sm:h-48"></div>
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${
      theme === 'dark' 
        ? 'from-slate-900 via-slate-800 to-slate-900' 
        : 'from-gray-50 via-gray-100 to-gray-200'
    }`}>
      <TopBanner />
      <div className="h-40 sm:h-48"></div>

      <div className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(`/client/${clientId}/workouts`)}
              className={`mb-4 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>
            <div className="flex items-center justify-between mb-2">
              <h1 className={`text-4xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Información del Cliente
              </h1>
              <button
                onClick={handleExportToCSV}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar información
              </button>
            </div>
            <p className={`text-lg ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Gestiona la información personal y la fotografía de perfil
            </p>
          </div>

          {/* Form - Dos Columnas con Secciones Colapsables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Izquierda - Información Personal */}
            <div className={`rounded-xl shadow-lg overflow-hidden ${
              theme === 'dark' 
                ? 'bg-slate-800/80 border border-slate-700' 
                : 'bg-white border border-gray-200'
            }`}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsPersonalInfoExpanded(!isPersonalInfoExpanded)
                }}
                className={`w-full p-6 flex items-center justify-between transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-slate-700/50' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <h2 className={`text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Información Personal
                </h2>
                <svg
                  className={`w-5 h-5 transition-transform ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                  } ${isPersonalInfoExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isPersonalInfoExpanded && (
                <div className="px-6 pb-6">
                  {/* Foto de Perfil */}
                  <div className="mb-6">
              <label className={`block text-sm font-semibold mb-3 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                Fotografía de Perfil
              </label>

              {/* Opción de subir foto (opcional) */}
              <div className="mt-4">
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  O subir fotografía (opcional)
                </label>
                <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary-500"
                      />
                      <button
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className={`w-32 h-32 rounded-full border-4 border-dashed flex items-center justify-center ${
                      theme === 'dark' ? 'border-slate-600' : 'border-gray-300'
                    }`}>
                      <svg className={`w-12 h-12 ${
                        theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="inline-block px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    {photoPreview ? 'Cambiar Foto' : 'Subir Foto'}
                  </label>
                  <p className={`text-xs mt-2 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    Máximo 128x128 píxeles. La imagen se redimensionará y comprimirá automáticamente (máximo 5MB original).
                  </p>
                </div>
                  </div>
                </div>
                </div>

                {/* Campos del formulario */}
                <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              {/* Email */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="cliente@ejemplo.com"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Número de Celular
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="+57 300 123 4567"
                />
              </div>

              {/* Cédula */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Número de Cédula
                </label>
                <input
                  type="text"
                  name="cedula"
                  value={formData.cedula}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="1234567890"
                />
              </div>

              {/* RH */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  RH (Tipo de Sangre)
                </label>
                <input
                  type="text"
                  name="rh"
                  value={formData.rh}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Ej: O+"
                />
              </div>

              {/* EPS */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  EPS
                </label>
                <input
                  type="text"
                  name="eps"
                  value={formData.eps}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Ej: Sura, Coomeva, etc."
                />
              </div>
                </div>
                </div>
              )}
            </div>

            {/* Sección Ver Retroalimentación */}
            {clientId && (
              <div className={`rounded-xl shadow-lg overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-slate-800/80 border border-slate-700' 
                  : 'bg-white border border-gray-200'
              }`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsFeedbackExpanded(!isFeedbackExpanded)
                  }}
                  className={`w-full p-6 flex items-center justify-between transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-slate-700/50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <h2 className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Ver Retroalimentación
                  </h2>
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                    } ${isFeedbackExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isFeedbackExpanded && (
                  <div className="px-6 pb-6">
                    {feedbackList.length === 0 ? (
                      <p className={`text-center py-8 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                      }`}>
                        No hay retroalimentación registrada aún
                      </p>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {feedbackList.map(({ day, data }) => (
                          <div
                            key={day}
                            className={`p-4 rounded-lg border ${
                              theme === 'dark'
                                ? 'bg-slate-700/50 border-slate-600'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <h3 className={`font-semibold mb-2 ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              Día {day}
                            </h3>
                            
                            {data.comment && (
                              <div className="mb-2">
                                <p className={`text-sm font-medium mb-1 ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                }`}>
                                  Comentario:
                                </p>
                                <p className={`text-sm ${
                                  theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                                }`}>
                                  {data.comment}
                                </p>
                              </div>
                            )}
                            
                            {data.effort !== null && data.effort !== undefined && (
                              <div className="mb-2">
                                <p className={`text-sm font-medium mb-1 ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                }`}>
                                  Esfuerzo: {data.effort}/10
                                </p>
                                <div className={`w-full rounded-full h-2 ${
                                  theme === 'dark' ? 'bg-slate-600' : 'bg-gray-300'
                                }`}>
                                  <div
                                    className={`h-2 rounded-full ${
                                      data.effort <= 3 ? 'bg-red-500' :
                                      data.effort <= 6 ? 'bg-yellow-500' :
                                      data.effort <= 8 ? 'bg-green-500' :
                                      'bg-blue-500'
                                    }`}
                                    style={{ width: `${(data.effort / 10) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {data.weightUsed && data.weightUsed.length > 0 && (
                              <div className="mb-2">
                                <p className={`text-sm font-medium mb-1 ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                }`}>
                                  Peso utilizado:
                                </p>
                                <p className={`text-sm ${
                                  theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                                }`}>
                                  {data.weightUsed.filter((w: string) => w !== 'Otro').map((implement: string) => {
                                    const amount = data.weightAmounts?.[implement]
                                    return amount ? `${implement} (${amount}kg)` : implement
                                  }).join(', ')}
                                </p>
                              </div>
                            )}
                            
                            {data.feeling && (
                              <div>
                                <p className={`text-sm font-medium mb-1 ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                }`}>
                                  Sentimiento:
                                </p>
                                <p className={`text-sm ${
                                  theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                                }`}>
                                  {data.feeling === 'excelente' ? '😃 Excelente' :
                                   data.feeling === 'bien' ? '🙂 Bien' :
                                   data.feeling === 'normal' ? '😐 Normal' :
                                   data.feeling === 'cansado' ? '😫 Cansado' :
                                   data.feeling === 'dificil' ? '😞 Difícil' : data.feeling}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sección RM y PR */}
            {clientId && (
              <div className={`rounded-xl shadow-lg overflow-hidden ${
                theme === 'dark' 
                  ? 'bg-slate-800/80 border border-slate-700' 
                  : 'bg-white border border-gray-200'
              }`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsRMAndPRExpanded(!isRMAndPRExpanded)
                  }}
                  className={`w-full p-6 flex items-center justify-between transition-colors ${
                    theme === 'dark' 
                      ? 'hover:bg-slate-700/50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <h2 className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    RM y PR
                  </h2>
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                    } ${isRMAndPRExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isRMAndPRExpanded && (
                  <div className="px-6 pb-6">
                    <RMAndPRSection clientId={clientId} isCoach={isCoach} />
                  </div>
                )}
              </div>
            )}

            {/* Columna Derecha - Gestión de Suscripción y Pagos */}
            <div className={`rounded-xl shadow-lg overflow-hidden ${
              theme === 'dark' 
                ? 'bg-slate-800/80 border border-slate-700' 
                : 'bg-white border border-gray-200'
            }`}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsSubscriptionExpanded(!isSubscriptionExpanded)
                }}
                className={`w-full p-6 flex items-center justify-between transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-slate-700/50' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <h2 className={`text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Gestión de Suscripción y Pagos
                </h2>
                <svg
                  className={`w-5 h-5 transition-transform ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                  } ${isSubscriptionExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isSubscriptionExpanded && (
                <div className="px-6 pb-6">
                  {/* Sección de Gestión de Suscripciones */}
                  <div className="mb-6">
                    <h3 className={`text-lg font-semibold mb-4 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      Suscripción
                    </h3>
                  
                    <div className="space-y-4">
                      {/* Fecha de Inicio */}
                      <div>
                        <label className={`block text-sm font-semibold mb-2 ${
                          theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Fecha de Inicio de Suscripción
                        </label>
                        <input
                          type="date"
                          name="subscriptionStartDate"
                          value={formData.subscriptionStartDate}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                            theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-gray-50 border-gray-300 text-gray-900'
                          } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                        />
                      </div>

                      {/* Fecha de Fin */}
                      <div>
                        <label className={`block text-sm font-semibold mb-2 ${
                          theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Fecha de Fin de Suscripción
                        </label>
                        <input
                          type="date"
                          name="subscriptionEndDate"
                          value={formData.subscriptionEndDate}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                            theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-gray-50 border-gray-300 text-gray-900'
                          } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                        />
                      </div>

                      {/* Método de Pago */}
                      <div>
                        <label className={`block text-sm font-semibold mb-2 ${
                          theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Método de Pago
                        </label>
                        <select
                          name="paymentMethod"
                          value={formData.paymentMethod}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                            theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-gray-50 border-gray-300 text-gray-900'
                          } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                        >
                          <option value="">Seleccionar método</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="tarjeta_debito">Tarjeta Débito</option>
                          <option value="tarjeta_credito">Tarjeta de Crédito</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>

                      {/* Método de Pago Otro - Campo de texto condicional */}
                      {formData.paymentMethod === 'otro' && (
                        <div>
                          <label className={`block text-sm font-semibold mb-2 ${
                            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                          }`}>
                            Especificar método de pago
                          </label>
                          <input
                            type="text"
                            name="otherPaymentMethod"
                            value={formData.otherPaymentMethod}
                            onChange={handleInputChange}
                            placeholder="Ej: Nequi, Daviplata, etc."
                            className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                              theme === 'dark'
                                ? 'bg-slate-700 border-slate-600 text-white'
                                : 'bg-gray-50 border-gray-300 text-gray-900'
                            } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                          />
                        </div>
                      )}

                      {/* Frecuencia de Pago */}
                      <div>
                        <label className={`block text-sm font-semibold mb-2 ${
                          theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          Frecuencia de Pago
                        </label>
                        <select
                          name="paymentFrequency"
                          value={formData.paymentFrequency}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                            theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-gray-50 border-gray-300 text-gray-900'
                          } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                        >
                          <option value="">Seleccionar frecuencia</option>
                          <option value="mensual">Mensual</option>
                          <option value="trimestral">Trimestral (cada 3 meses)</option>
                          <option value="cuotas">Cuotas</option>
                          <option value="dias">Días</option>
                          <option value="por_clases">Por Clases</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Sección de Historial de Pagos */}
                  <div className="pt-6 border-t border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Historial de Pagos
                  </h3>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Registrar Pago
                    </button>
                  </div>

                  {payments.length === 0 ? (
                <div className={`text-center py-8 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                }`}>
                  <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    No hay pagos registrados aún
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => {
                    const paymentDate = payment.date?.toDate 
                      ? payment.date.toDate() 
                      : payment.date 
                      ? new Date(payment.date) 
                      : new Date()
                    
                    return (
                      <div
                        key={payment.id}
                        className={`p-4 rounded-lg border ${
                          theme === 'dark' 
                            ? 'bg-slate-700/50 border-slate-600' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className={`font-semibold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                                {paymentDate.toLocaleDateString('es-ES', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  year: 'numeric' 
                                })}
                              </p>
                              {payment.amount && (
                                <span className={`px-2 py-1 rounded text-sm font-semibold ${
                                  theme === 'dark' 
                                    ? 'bg-green-500/20 text-green-300' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  ${payment.amount.toLocaleString('es-ES')}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm">
                              <span className={`px-2 py-1 rounded ${
                                theme === 'dark' 
                                  ? 'bg-primary-500/20 text-primary-300' 
                                  : 'bg-primary-100 text-primary-700'
                              }`}>
                                {payment.method === 'efectivo' ? 'Efectivo' : 
                                 payment.method === 'transferencia' ? 'Transferencia' : 
                                 payment.method === 'credito' ? 'Crédito' : payment.method}
                              </span>
                              {payment.frequency && (
                                <span className={`px-2 py-1 rounded ${
                                  theme === 'dark' 
                                    ? 'bg-blue-500/20 text-blue-300' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {payment.frequency === 'mensual' ? 'Mensual' : 
                                   payment.frequency === 'trimestral' ? 'Trimestral' : 
                                   payment.frequency === 'cuotas' ? 'Cuotas' :
                                   payment.frequency === 'dias' ? 'Días' :
                                   payment.frequency === 'por_clases' ? 'Por Clases' :
                                   payment.frequency || ''}
                                </span>
                              )}
                            </div>
                            {payment.notes && (
                              <p className={`mt-2 text-sm ${
                                theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                              }`}>
                                {payment.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botón para ver gráficas de progreso - Solo para coach */}
          {clientId && isCoach && (
            <div className="mt-6">
              <button
                onClick={() => {
                  navigate(`/client/${clientId}/progress`)
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-purple-900 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Ver Gráficas de Progreso
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={`mt-4 p-3 rounded-lg ${
              theme === 'dark' ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600'
            }`}>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-slate-700/50">
            <button
              onClick={() => navigate(`/client/${clientId}/workouts`)}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Modal de Registro de Pago */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`w-full max-w-md rounded-2xl shadow-2xl backdrop-blur-sm ${
              theme === 'dark' ? 'bg-slate-800/90 border border-slate-700/50' : 'bg-white/90 border border-gray-200/50'
            } p-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Registrar Pago
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-slate-700 text-slate-400' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Fecha *
                </label>
                <input
                  type="date"
                  name="date"
                  value={paymentFormData.date}
                  onChange={handlePaymentInputChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Monto (opcional)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={paymentFormData.amount}
                  onChange={handlePaymentInputChange}
                  placeholder="0.00"
                  step="0.01"
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Método de Pago *
                </label>
                <select
                  name="method"
                  value={paymentFormData.method}
                  onChange={handlePaymentInputChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  required
                >
                  <option value="">Seleccionar método</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta_debito">Tarjeta Débito</option>
                  <option value="tarjeta_credito">Tarjeta de Crédito</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {/* Método de Pago Otro - Campo de texto condicional */}
              {paymentFormData.method === 'otro' && (
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Especificar método de pago
                  </label>
                  <input
                    type="text"
                    name="otherPaymentMethod"
                    value={paymentFormData.otherPaymentMethod}
                    onChange={handlePaymentInputChange}
                    placeholder="Ej: Nequi, Daviplata, etc."
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  />
                </div>
              )}

              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Frecuencia (opcional)
                </label>
                <select
                  name="frequency"
                  value={paymentFormData.frequency}
                  onChange={handlePaymentInputChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                >
                  <option value="">Seleccionar frecuencia</option>
                  <option value="mensual">Mensual</option>
                  <option value="trimestral">Trimestral (cada 3 meses)</option>
                  <option value="cuotas">Cuotas</option>
                  <option value="dias">Días</option>
                  <option value="por_clases">Por Clases</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Notas (opcional)
                </label>
                <textarea
                  name="notes"
                  value={paymentFormData.notes}
                  onChange={handlePaymentInputChange}
                  rows={3}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Notas adicionales sobre el pago..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePayment}
                  disabled={savingPayment}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPayment ? 'Guardando...' : 'Registrar Pago'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default ClientProfilePage

