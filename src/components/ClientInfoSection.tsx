import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { db, auth } from '../firebaseConfig'
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, orderBy, onSnapshot, Timestamp, deleteDoc, getDocs, limit, where } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'

interface ClientInfoSectionProps {
  clientId: string
  showSaveButtons?: boolean
  onExportReady?: (exportFn: () => Promise<void>) => void
}

const ClientInfoSection = ({ clientId, showSaveButtons = false, onExportReady }: ClientInfoSectionProps) => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { user } = useAuth()
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
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
    otherPaymentMethod: '',
    isPaymentExempt: false
  })

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [lastFeedback, setLastFeedback] = useState<{rpe: number, mood: number, date: Date} | null>(null)
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
  const [savingSubscription, setSavingSubscription] = useState(false)
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showAnthropometricModal, setShowAnthropometricModal] = useState(false)
  const [anthropometricMeasures, setAnthropometricMeasures] = useState<any[]>([])
  const [showAnthropometricHistory, setShowAnthropometricHistory] = useState(false)
  const [anthropometricFormData, setAnthropometricFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    bodyFat: '',
    muscleMass: '',
    waist: '',
    hip: '',
    chest: '',
    arm: '',
    thigh: '',
    notes: ''
  })
  const [savingAnthropometric, setSavingAnthropometric] = useState(false)

  // Cargar datos del cliente
  const loadClientData = useCallback(async () => {
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
          fullName: data.name || '',
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
          otherPaymentMethod: data.otherPaymentMethod || '',
          isPaymentExempt: data.isPaymentExempt || false
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
  }, [clientId, isCoach, db])

  useEffect(() => {
    loadClientData()
  }, [loadClientData])

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

  // Cargar medidas antropométricas
  useEffect(() => {
    if (!clientId || !isCoach) return

    const anthropometricRef = collection(db, 'clients', clientId, 'anthropometric')
    const q = query(anthropometricRef, orderBy('date', 'desc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const measuresList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setAnthropometricMeasures(measuresList)
    }, (error) => {
      console.error('Error loading anthropometric measures:', error)
    })

    return () => unsubscribe()
  }, [clientId, isCoach])

  // Cargar último feedback diario
  const loadLastFeedback = useCallback(async () => {
    if (!clientId || !isCoach) {
      setLastFeedback(null)
      return
    }

    try {
      // [DEBUG 1] Muestra el ID del cliente que se está buscando
      console.log('DEBUG: Buscando último feedback para clientId:', clientId)

      const feedbackRef = collection(db, 'dailyFeedback')
      const q = query(
        feedbackRef,
        where('clientId', '==', clientId),
        orderBy('date', 'desc'),
        limit(1)
      )
      const snapshot = await getDocs(q)
      
      // [DEBUG 2] Muestra el resultado de la consulta
      console.log('DEBUG: Documentos de feedback encontrados:', snapshot.docs.length)
      
      if (!snapshot.empty) {
        const feedbackDoc = snapshot.docs[0]
        const data = feedbackDoc.data()
        
        // Procesar fecha
        let feedbackDate: Date
        if (data.date?.toDate) {
          feedbackDate = data.date.toDate()
        } else if (data.date instanceof Timestamp) {
          feedbackDate = data.date.toDate()
        } else if (data.date) {
          feedbackDate = new Date(data.date)
        } else {
          feedbackDate = new Date()
        }
        
        setLastFeedback({
          rpe: data.rpe || 0,
          mood: data.mood || 0,
          date: feedbackDate
        })
      } else {
        console.log('DEBUG: No se encontró feedback para este cliente.')
        setLastFeedback(null)
      }
    } catch (error) {
      // [DEBUG 3] Captura y muestra cualquier error de Firebase/red
      console.error('DEBUG ERROR: Error al cargar el último feedback:', error)
      setLastFeedback(null)
    }
  }, [clientId, db, isCoach])

  useEffect(() => {
    loadLastFeedback()
  }, [loadLastFeedback])

  // Función helper para parsear fecha desde string YYYY-MM-DD en hora local
  // Evita el problema de que new Date("YYYY-MM-DD") se interprete como UTC
  const parseLocalDate = (dateString: string): Date => {
    if (!dateString) {
      return new Date()
    }
    // Parsear manualmente año, mes y día desde el string
    const [year, month, day] = dateString.split('-').map(Number)
    // Crear fecha directamente en hora local a mediodía (12:00 PM)
    // month - 1 porque los meses en JavaScript son 0-indexados (0 = enero, 11 = diciembre)
    return new Date(year, month - 1, day, 12, 0, 0, 0)
  }

  // Función helper para normalizar fecha y evitar desfase de timezone
  const normalizeDate = (dateInput: any): Date => {
    let date: Date
    if (dateInput?.toDate) {
      // Es un Timestamp de Firestore
      date = dateInput.toDate()
    } else if (dateInput instanceof Date) {
      date = new Date(dateInput)
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput)
    } else {
      date = new Date()
    }
    // Normalizar a mediodía para evitar desfase de timezone
    date.setHours(12, 0, 0, 0)
    return date
  }

  // Función helper para calcular el estado del cliente basado en pagos y fecha de suscripción
  const calculateClientStatus = (subscriptionEndDate: string | null, payments: any[], isPaymentExempt?: boolean): 'pending' | 'active' | 'inactive' => {
    // Si el cliente está exento de pago, siempre está activo
    if (isPaymentExempt === true) {
      return 'active'
    }
    
    // Si no tiene pagos registrados, está pendiente
    if (!payments || payments.length === 0) {
      return 'pending'
    }

    // Si tiene pagos pero no tiene fecha de fin de suscripción, considerar activo
    if (!subscriptionEndDate) {
      return 'active'
    }

    // Convertir subscriptionEndDate a Date
    const endDate = new Date(subscriptionEndDate)
    
    if (isNaN(endDate.getTime())) {
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

  // Exponer función de exportación
  useEffect(() => {
    if (onExportReady) {
      onExportReady(handleExportToCSV)
    }
  }, [onExportReady, formData, payments])

  // Función para convertir imagen a base64 con compresión opcional
  const resizeImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          // Mantener dimensiones originales
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto del canvas'))
            return
          }
          
          // Dibujar imagen
          ctx.drawImage(img, 0, 0, img.width, img.height)
          
          // Convertir a base64 con calidad recomendada (70-80% para optimizar espacio)
          const quality = 0.75
          const base64 = canvas.toDataURL('image/jpeg', quality)
          resolve(base64)
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

    try {
      setError(null)
      // Convertir imagen a base64 con compresión opcional
      const base64 = await resizeImageToBase64(file)
      
      // Usar base64 directamente como preview
      setPhotoPreview(base64)
      setPhotoBase64(base64)
      setPhotoRemoved(false) // Resetear el flag de eliminación si se sube una nueva foto
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

      // Si hay una nueva foto (photoBase64), usarla
      if (photoBase64) {
        photoUrl = photoBase64
        console.log('Foto procesada exitosamente (base64)')
      } else if (photoRemoved) {
        // Si se eliminó la foto explícitamente, establecer como null
        photoUrl = null
      }
      // Si no hay photoBase64 y no se eliminó, mantener el valor actual de formData.profilePhoto

      // Actualizar datos en Firestore
      const clientRef = doc(db, 'clients', clientId)
      const clientDoc = await getDoc(clientRef)
      
      if (clientDoc.exists()) {
        const clientData = clientDoc.data()
        // Parsear fechas directamente en hora local a mediodía para evitar desfase de timezone
        const subscriptionStartDate = formData.subscriptionStartDate 
          ? parseLocalDate(formData.subscriptionStartDate)
          : null
        const subscriptionEndDate = formData.subscriptionEndDate 
          ? parseLocalDate(formData.subscriptionEndDate)
          : null

        // Recalcular estado del cliente basado en pagos y nueva fecha de suscripción
        const newStatus = calculateClientStatus(formData.subscriptionEndDate, payments, formData.isPaymentExempt)
        
        await updateDoc(clientRef, {
          name: formData.fullName.trim(),
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
          isPaymentExempt: formData.isPaymentExempt,
          status: newStatus,
          updatedAt: serverTimestamp(),
          updatedBy: user?.email || ''
        })

        // Actualizar displayName y photoURL si el usuario actual es el cliente
        if (clientData.email && auth.currentUser && auth.currentUser.email?.toLowerCase() === clientData.email.toLowerCase()) {
          try {
            await updateProfile(auth.currentUser, {
              displayName: formData.fullName.trim(),
              photoURL: photoUrl || undefined
            })
          } catch (error) {
            console.error('Error updating Auth profile:', error)
            // Continuar aunque falle la actualización en Auth
          }
        }

        // También actualizar en la colección 'users' si existe
        try {
          const usersRef = doc(db, 'users', clientId)
          const userDoc = await getDoc(usersRef)
          if (userDoc.exists()) {
            await updateDoc(usersRef, {
              displayName: formData.fullName.trim(),
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
      setPhotoRemoved(false)
      
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
    setPhotoRemoved(true)
    setFormData(prev => ({ ...prev, profilePhoto: null }))
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
      // Parsear fecha directamente en hora local a mediodía para evitar desfase de timezone
      const paymentDate = parseLocalDate(paymentFormData.date)
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

      // Recalcular y actualizar estado del cliente
      const updatedPaymentsSnapshot = await getDocs(paymentsRef)
      const updatedPayments = updatedPaymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      const newStatus = calculateClientStatus(formData.subscriptionEndDate, updatedPayments, formData.isPaymentExempt)
      
      // Actualizar estado en el documento del cliente
      const clientRef = doc(db, 'clients', clientId)
      await updateDoc(clientRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      })

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

  // Función para registrar pago directamente desde el modal de suscripción
  const handleRegisterPayment = async () => {
    if (!clientId || !isCoach) return

    // Validar campos requeridos
    if (!formData.subscriptionStartDate || !formData.subscriptionEndDate || !formData.paymentMethod || !formData.paymentFrequency) {
      setError('Por favor completa todos los campos: Fecha de Inicio, Fecha de Fin, Método de Pago y Frecuencia')
      return
    }

    // Validar método de pago personalizado si es "otro"
    if (formData.paymentMethod === 'otro' && !formData.otherPaymentMethod.trim()) {
      setError('Por favor especifica el método de pago personalizado')
      return
    }

    setSavingSubscription(true)
    setError(null)

    try {
      // Parsear fechas directamente en hora local a mediodía
      const paymentDate = parseLocalDate(formData.subscriptionStartDate)
      const subscriptionStartDate = parseLocalDate(formData.subscriptionStartDate)
      const subscriptionEndDate = parseLocalDate(formData.subscriptionEndDate)

      const paymentsRef = collection(db, 'clients', clientId, 'payments')
      
      // Crear documento de pago
      const paymentData: any = {
        date: Timestamp.fromDate(paymentDate),
        method: formData.paymentMethod,
        frequency: formData.paymentFrequency,
        amount: null,
        notes: '',
        createdAt: serverTimestamp()
      }
      
      // Agregar método de pago personalizado si se seleccionó "otro"
      if (formData.paymentMethod === 'otro' && formData.otherPaymentMethod) {
        paymentData.otherPaymentMethod = formData.otherPaymentMethod.trim()
      }
      
      await addDoc(paymentsRef, paymentData)

      // Recalcular y actualizar estado del cliente
      const updatedPaymentsSnapshot = await getDocs(paymentsRef)
      const updatedPayments = updatedPaymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      const newStatus = calculateClientStatus(formData.subscriptionEndDate, updatedPayments, formData.isPaymentExempt)
      
      // Actualizar documento del cliente con fechas de suscripción y datos de pago
      const clientRef = doc(db, 'clients', clientId)
      await updateDoc(clientRef, {
        subscriptionStartDate: subscriptionStartDate,
        subscriptionEndDate: subscriptionEndDate,
        paymentMethod: formData.paymentMethod,
        paymentFrequency: formData.paymentFrequency,
        otherPaymentMethod: formData.paymentMethod === 'otro' ? formData.otherPaymentMethod.trim() : null,
        isPaymentExempt: formData.isPaymentExempt,
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || ''
      })

      // Actualizar estado local del formulario
      setFormData(prev => ({
        ...prev,
        subscriptionStartDate: formData.subscriptionStartDate,
        subscriptionEndDate: formData.subscriptionEndDate,
        paymentMethod: formData.paymentMethod,
        paymentFrequency: formData.paymentFrequency,
        otherPaymentMethod: formData.otherPaymentMethod
      }))

      alert('Pago registrado y suscripción actualizada exitosamente')
      // Los pagos se actualizarán automáticamente gracias al onSnapshot existente
    } catch (error: any) {
      console.error('Error registering payment:', error)
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
      setSavingSubscription(false)
    }
  }

  // Función crítica para borrar pago y actualizar status del cliente si es necesario
  const handleDeletePayment = async (paymentId: string) => {
    if (!clientId || !isCoach) return

    // Confirmación
    if (!window.confirm('¿Está seguro de borrar este pago?')) {
      return
    }

    try {
      // Borrar el documento de pago
      const paymentRef = doc(db, 'clients', clientId, 'payments', paymentId)
      await deleteDoc(paymentRef)

      // Recalcular estado del cliente después de borrar el pago
      const paymentsRef = collection(db, 'clients', clientId, 'payments')
      const paymentsSnapshot = await getDocs(query(paymentsRef, orderBy('date', 'desc')))
      
      const remainingPayments = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Calcular nuevo estado basado en pagos restantes
      const newStatus = calculateClientStatus(formData.subscriptionEndDate, remainingPayments, formData.isPaymentExempt)
      
      // Actualizar estado en el documento del cliente
      const clientRef = doc(db, 'clients', clientId)
      await updateDoc(clientRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      })
      
      if (newStatus === 'pending') {
        alert('Pago borrado. El cliente ahora está pendiente por empezar (sin pagos registrados).')
      } else if (newStatus === 'inactive') {
        alert('Pago borrado. El cliente ha sido marcado como inactivo.')
      } else {
        alert('Pago borrado exitosamente.')
      }
    } catch (error: any) {
      console.error('Error deleting payment:', error)
      alert(`Error al borrar el pago: ${error.message || 'Error desconocido'}`)
    }
  }

  const handleAnthropometricInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setAnthropometricFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveAnthropometric = async () => {
    if (!clientId || !isCoach) return

    if (!anthropometricFormData.date) {
      setError('Por favor completa la fecha')
      return
    }

    setSavingAnthropometric(true)
    setError(null)

    try {
      // Parsear fecha directamente en hora local a mediodía para evitar desfase de timezone
      const measureDate = parseLocalDate(anthropometricFormData.date)
      const anthropometricRef = collection(db, 'clients', clientId, 'anthropometric')
      
      const measureData: any = {
        date: Timestamp.fromDate(measureDate),
        createdAt: serverTimestamp()
      }

      // Solo agregar campos que tengan valor
      if (anthropometricFormData.weight) {
        measureData.weight = parseFloat(anthropometricFormData.weight)
      }
      if (anthropometricFormData.bodyFat) {
        measureData.bodyFat = parseFloat(anthropometricFormData.bodyFat)
      }
      if (anthropometricFormData.muscleMass) {
        measureData.muscleMass = parseFloat(anthropometricFormData.muscleMass)
      }
      if (anthropometricFormData.waist) {
        measureData.waist = parseFloat(anthropometricFormData.waist)
      }
      if (anthropometricFormData.hip) {
        measureData.hip = parseFloat(anthropometricFormData.hip)
      }
      if (anthropometricFormData.chest) {
        measureData.chest = parseFloat(anthropometricFormData.chest)
      }
      if (anthropometricFormData.arm) {
        measureData.arm = parseFloat(anthropometricFormData.arm)
      }
      if (anthropometricFormData.thigh) {
        measureData.thigh = parseFloat(anthropometricFormData.thigh)
      }
      if (anthropometricFormData.notes) {
        measureData.notes = anthropometricFormData.notes.trim()
      }
      
      await addDoc(anthropometricRef, measureData)

      // Mensaje de éxito
      alert('Medida antropométrica guardada exitosamente')
      
      // Nota: La lista se actualizará automáticamente gracias a onSnapshot en el useEffect

      // Resetear formulario
      setAnthropometricFormData({
        date: new Date().toISOString().split('T')[0],
        weight: '',
        bodyFat: '',
        muscleMass: '',
        waist: '',
        hip: '',
        chest: '',
        arm: '',
        thigh: '',
        notes: ''
      })
      setShowAnthropometricModal(false)
    } catch (error: any) {
      console.error('Error saving anthropometric measure:', error)
      let errorMessage = 'Error al registrar la medida'
      
      if (error.code === 'permission-denied') {
        errorMessage = 'No tienes permisos para registrar medidas. Verifica las reglas de Firestore.'
      } else if (error.code === 'unavailable') {
        errorMessage = 'Servicio no disponible. Por favor, intenta de nuevo más tarde.'
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`
      }
      
      setError(errorMessage)
    } finally {
      setSavingAnthropometric(false)
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
      csvRows.push('Nombre,' + (formData.fullName || ''))
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
        const date = normalizeDate(payment.date)
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
      
      
      // Crear archivo CSV
      const csvContent = csvRows.join('\n')
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fullName = formData.fullName
      const fileName = `cliente_${fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
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
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Calcular estado del cliente
  const clientStatus = calculateClientStatus(formData.subscriptionEndDate, payments, formData.isPaymentExempt)

  return (
    <>
      {/* Badge de Estado del Cliente */}
      <div className="mb-6 flex items-center justify-center">
        <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${
          clientStatus === 'pending'
            ? 'bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/30 dark:text-yellow-400 border border-yellow-500/50'
            : clientStatus === 'active'
            ? 'bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-400 border border-green-500/50'
            : 'bg-red-500/20 text-red-700 dark:bg-red-500/30 dark:text-red-400 border border-red-500/50'
        }`}>
          {clientStatus === 'pending' ? 'Pendiente por empezar' : clientStatus === 'active' ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      {lastFeedback && (
        <div className={`mt-4 mb-6 p-4 rounded-xl shadow-lg ${theme === 'dark' ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`text-md font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Último Feedback Diario</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm">
            {/* Fecha */}
            <p className={`mb-2 sm:mb-0 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Fecha: <span className="font-semibold">{lastFeedback.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
            </p>
            {/* Valores */}
            <div className="flex gap-6 items-center">
              {/* RPE */}
              <div className="flex items-center gap-1">
                <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>RPE (Esfuerzo):</span>
                <span className={`font-bold text-lg ${lastFeedback.rpe > 7 ? 'text-red-500' : lastFeedback.rpe > 4 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {lastFeedback.rpe}
                </span>
              </div>
              {/* Ánimo */}
              <div className="flex items-center gap-1">
                <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>Ánimo:</span>
                <span className="text-2xl font-bold">
                  {lastFeedback.mood === 1 ? '😞' : lastFeedback.mood === 2 ? '😐' : lastFeedback.mood === 3 ? '🙂' : '😄'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Form - Layout Horizontal */}
      <div className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {/* Botón Información Personal */}
        <button
          onClick={() => setShowPersonalInfoModal(true)}
          className={`p-4 rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-between ${
            theme === 'dark' 
              ? 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/50' 
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <h2 className={`text-lg sm:text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Información Personal
          </h2>
          <svg
            className={`w-5 h-5 ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

      {/* Modal de Información Personal */}
      {showPersonalInfoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
              theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="sticky top-0 z-10 p-6 border-b bg-inherit flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Información Personal
              </h2>
              <button
                onClick={() => setShowPersonalInfoModal(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-slate-700 text-slate-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de Último Feedback Diario */}
              <div className="mb-6">
                <label className={`block text-sm font-semibold mb-3 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Último Feedback Diario
                </label>
                <div className={`p-4 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-slate-700/50 border-slate-600' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  {lastFeedback ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className={`text-xs font-medium mb-1 ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          RPE
                        </p>
                        <p className={`text-lg font-bold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {lastFeedback.rpe}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-medium mb-1 ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          Ánimo
                        </p>
                        <p className={`text-lg font-bold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {lastFeedback.mood}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-medium mb-1 ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          Fecha
                        </p>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          {lastFeedback.date.toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                    }`}>
                      Aún sin registro de feedback.
                    </p>
                  )}
                </div>
              </div>

              {/* Campos del formulario */}
              <div className="space-y-4">
                {/* Nombre Completo */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    placeholder="Ej: Juan Carlos Pérez González"
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
          </motion.div>
        </div>
      )}

        {/* Botón Medidas Antropométricas */}
        {clientId && (
          <button
            onClick={() => setShowAnthropometricModal(true)}
            className={`p-4 rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-between ${
              theme === 'dark' 
                ? 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/50' 
                : 'bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <h2 className={`text-lg sm:text-xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Medidas Antropométricas
            </h2>
            <svg
              className={`w-5 h-5 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Botón Gestión de Suscripción y Pagos */}
        <button
          onClick={() => setShowSubscriptionModal(true)}
          className={`p-4 rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-between ${
            theme === 'dark' 
              ? 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/50' 
              : 'bg-white border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <h2 className={`text-lg sm:text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Gestión de Suscripción y Pagos
          </h2>
          <svg
            className={`w-5 h-5 ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Botón RM y PR */}
        {clientId && (
          <button
            onClick={() => navigate(`/client/${clientId}/rm-pr`)}
            className={`p-4 rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-between ${
              theme === 'dark' 
                ? 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/50' 
                : 'bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <h2 className={`text-lg sm:text-xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              RM y PR
            </h2>
            <svg
              className={`w-5 h-5 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

            </div>
          </div>

      {/* Modal de Medidas Antropométricas */}
      {showAnthropometricModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
              theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="sticky top-0 z-10 p-6 border-b bg-inherit flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Medidas Antropométricas
              </h2>
              <button
                onClick={() => setShowAnthropometricModal(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-slate-700 text-slate-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Historial de Medidas
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAnthropometricHistory(!showAnthropometricHistory)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                      showAnthropometricHistory
                        ? 'bg-slate-600 hover:bg-slate-700 text-white'
                        : theme === 'dark'
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {showAnthropometricHistory ? 'Ocultar Registro' : 'Ver Registro'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAnthropometricModal(true)
                    }}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir Medida
                  </button>
                </div>
              </div>

              {anthropometricMeasures.length === 0 ? (
                <div className={`text-center py-8 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                }`}>
                  <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    No hay medidas registradas aún
                  </p>
                </div>
              ) : showAnthropometricHistory ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {anthropometricMeasures.map((measure) => {
                    const measureDate = normalizeDate(measure.date)
                    
                    return (
                      <div
                        key={measure.id}
                        className={`p-4 rounded-lg border ${
                          theme === 'dark' 
                            ? 'bg-slate-700/50 border-slate-600' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className={`font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {measureDate.toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          {measure.weight && (
                            <div>
                              <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Peso: </span>
                              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {measure.weight} kg
                              </span>
                            </div>
                          )}
                          {measure.bodyFat && (
                            <div>
                              <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>% Grasa: </span>
                              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {measure.bodyFat}%
                              </span>
                            </div>
                          )}
                          {measure.muscleMass && (
                            <div>
                              <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Masa Muscular: </span>
                              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {measure.muscleMass} kg
                              </span>
                            </div>
                          )}
                          {measure.waist && (
                            <div>
                              <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Cintura: </span>
                              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {measure.waist} cm
                              </span>
                            </div>
                          )}
                          {measure.hip && (
                            <div>
                              <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Cadera: </span>
                              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {measure.hip} cm
                              </span>
                            </div>
                          )}
                          {measure.chest && (
                            <div>
                              <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Pecho: </span>
                              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {measure.chest} cm
                              </span>
                            </div>
                          )}
                          {measure.arm && (
                            <div>
                              <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Brazo: </span>
                              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {measure.arm} cm
                              </span>
                            </div>
                          )}
                          {measure.thigh && (
                            <div>
                              <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>Muslo: </span>
                              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {measure.thigh} cm
                              </span>
                            </div>
                          )}
                        </div>
                        {measure.notes && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                              {measure.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className={`text-center py-8 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                }`}>
                  <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                    Haz clic en "Ver Registro" para ver el historial completo de medidas
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}


      {/* Modal de Gestión de Suscripción y Pagos */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
              theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
            }`}
          >
            <div className="sticky top-0 z-10 p-6 border-b bg-inherit flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Gestión de Suscripción y Pagos
              </h2>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-slate-700 text-slate-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {/* Sección de Gestión de Suscripciones */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Suscripción
                </h3>
              
                <div className="space-y-4">
                  {/* Switch Cliente Exento de Pago */}
                  <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                    theme === 'dark' ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <label className="relative inline-flex items-center cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={formData.isPaymentExempt}
                        onChange={(e) => setFormData(prev => ({ ...prev, isPaymentExempt: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className={`relative w-11 h-6 rounded-full transition-colors ${
                        formData.isPaymentExempt
                          ? 'bg-primary-600'
                          : theme === 'dark' ? 'bg-slate-600' : 'bg-gray-300'
                      }`}>
                        <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform ${
                          formData.isPaymentExempt ? 'translate-x-5' : ''
                        }`}></div>
                      </div>
                      <span className={`ml-3 text-sm font-medium ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Cliente Exento de Pago (No Paga)
                      </span>
                    </label>
                  </div>

                  {/* Campos condicionales - Solo mostrar si NO está exento */}
                  {!formData.isPaymentExempt && (
                    <>
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
                    </>
                  )}
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
                    onClick={handleRegisterPayment}
                    disabled={savingSubscription}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                      savingSubscription
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }`}
                  >
                    {savingSubscription ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Registrar Pago
                      </>
                    )}
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
                ) : (() => {
                  // Agrupar pagos por mes/año
                  const groupedPayments: { [key: string]: typeof payments } = {}
                  payments.forEach((payment) => {
                    const paymentDate = normalizeDate(payment.date)
                    const monthKey = paymentDate.toLocaleDateString('es-ES', { 
                      month: 'long', 
                      year: 'numeric' 
                    })
                    if (!groupedPayments[monthKey]) {
                      groupedPayments[monthKey] = []
                    }
                    groupedPayments[monthKey].push(payment)
                  })
                  
                  // Ordenar meses de más reciente a más antiguo
                  const sortedMonths = Object.keys(groupedPayments).sort((a, b) => {
                    const dateA = new Date(a)
                    const dateB = new Date(b)
                    return dateB.getTime() - dateA.getTime()
                  })
                  
                  return (
                    <div className="space-y-6">
                      {sortedMonths.map((monthKey) => (
                        <div key={monthKey}>
                          <h4 className={`text-md font-bold mb-3 ${
                            theme === 'dark' ? 'text-slate-200' : 'text-gray-800'
                          }`}>
                            {monthKey.charAt(0).toUpperCase() + monthKey.slice(1)}
                          </h4>
                          <div className="space-y-3">
                            {groupedPayments[monthKey].map((payment) => {
                              const paymentDate = normalizeDate(payment.date)
                              
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
                                      {isCoach && (
                                        <div className="mt-2">
                                          <button
                                            onClick={() => handleDeletePayment(payment.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                              theme === 'dark'
                                                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50'
                                                : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                                            }`}
                                          >
                                            Borrar Pago
                                          </button>
                                        </div>
                                      )}
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
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </motion.div>
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

      {/* Botones de Guardar y Cancelar - Solo si showSaveButtons es true */}
      {showSaveButtons && (
        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-700/50">
          <button
            onClick={() => navigate('/home')}
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
      )}

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

      {/* Modal de Añadir Medida Antropométrica */}
      {showAnthropometricModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`w-full max-w-2xl rounded-2xl shadow-2xl backdrop-blur-sm ${
              theme === 'dark' ? 'bg-slate-800/90 border border-slate-700/50' : 'bg-white/90 border border-gray-200/50'
            } p-6 max-h-[90vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Añadir Medida Antropométrica
              </h3>
              <button
                onClick={() => setShowAnthropometricModal(false)}
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
                  value={anthropometricFormData.date}
                  onChange={handleAnthropometricInputChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Peso Corporal (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={anthropometricFormData.weight}
                    onChange={handleAnthropometricInputChange}
                    placeholder="0.0"
                    step="0.1"
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
                    Porcentaje de Grasa (%)
                  </label>
                  <input
                    type="number"
                    name="bodyFat"
                    value={anthropometricFormData.bodyFat}
                    onChange={handleAnthropometricInputChange}
                    placeholder="0.0"
                    step="0.1"
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
                    Masa Muscular (kg)
                  </label>
                  <input
                    type="number"
                    name="muscleMass"
                    value={anthropometricFormData.muscleMass}
                    onChange={handleAnthropometricInputChange}
                    placeholder="0.0"
                    step="0.1"
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
                    Cintura (cm)
                  </label>
                  <input
                    type="number"
                    name="waist"
                    value={anthropometricFormData.waist}
                    onChange={handleAnthropometricInputChange}
                    placeholder="0.0"
                    step="0.1"
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
                    Cadera (cm)
                  </label>
                  <input
                    type="number"
                    name="hip"
                    value={anthropometricFormData.hip}
                    onChange={handleAnthropometricInputChange}
                    placeholder="0.0"
                    step="0.1"
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
                    Pecho (cm)
                  </label>
                  <input
                    type="number"
                    name="chest"
                    value={anthropometricFormData.chest}
                    onChange={handleAnthropometricInputChange}
                    placeholder="0.0"
                    step="0.1"
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
                    Brazo (cm)
                  </label>
                  <input
                    type="number"
                    name="arm"
                    value={anthropometricFormData.arm}
                    onChange={handleAnthropometricInputChange}
                    placeholder="0.0"
                    step="0.1"
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
                    Muslo (cm)
                  </label>
                  <input
                    type="number"
                    name="thigh"
                    value={anthropometricFormData.thigh}
                    onChange={handleAnthropometricInputChange}
                    placeholder="0.0"
                    step="0.1"
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white'
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Notas (opcional)
                </label>
                <textarea
                  name="notes"
                  value={anthropometricFormData.notes}
                  onChange={handleAnthropometricInputChange}
                  rows={3}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Notas adicionales sobre las medidas..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAnthropometricModal(false)
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await handleSaveAnthropometric()
                    setShowAnthropometricModal(false)
                  }}
                  disabled={savingAnthropometric}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingAnthropometric ? 'Guardando...' : 'Añadir Medida'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}

export default ClientInfoSection

