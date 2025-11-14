import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { db, auth } from '../firebaseConfig'
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'

interface ClientInfoSectionProps {
  clientId: string
  showSaveButtons?: boolean
  showProgressButton?: boolean
  onExportReady?: (exportFn: () => Promise<void>) => void
}

const ClientInfoSection = ({ clientId, showSaveButtons = false, showProgressButton = true, onExportReady }: ClientInfoSectionProps) => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { user } = useAuth()
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    secondName: '',
    firstLastName: '',
    secondLastName: '',
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

  // Función helper para combinar nombres
  const combineName = (firstName: string, secondName: string, firstLastName: string, secondLastName: string): string => {
    const parts = [firstName, secondName, firstLastName, secondLastName].filter(Boolean)
    return parts.join(' ')
  }

  // Función helper para separar nombre completo en partes
  const splitName = (fullName: string): { firstName: string; secondName: string; firstLastName: string; secondLastName: string } => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) {
      return { firstName: '', secondName: '', firstLastName: '', secondLastName: '' }
    } else if (parts.length === 1) {
      return { firstName: parts[0], secondName: '', firstLastName: '', secondLastName: '' }
    } else if (parts.length === 2) {
      return { firstName: parts[0], secondName: '', firstLastName: parts[1], secondLastName: '' }
    } else if (parts.length === 3) {
      return { firstName: parts[0], secondName: '', firstLastName: parts[1], secondLastName: parts[2] }
    } else {
      // Si tiene 4 o más partes, asumir: primer nombre, segundo nombre, primer apellido, segundo apellido
      return { 
        firstName: parts[0], 
        secondName: parts[1], 
        firstLastName: parts[2], 
        secondLastName: parts.slice(3).join(' ') 
      }
    }
  }
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
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
  const [isAnthropometricExpanded, setIsAnthropometricExpanded] = useState(false)
  const [anthropometricMeasures, setAnthropometricMeasures] = useState<any[]>([])
  const [showAnthropometricModal, setShowAnthropometricModal] = useState(false)
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
            ...splitName(data.name || ''),
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
        const updatedName = combineName(
          formData.firstName.trim(),
          formData.secondName.trim(),
          formData.firstLastName.trim(),
          formData.secondLastName.trim()
        )
        
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

        // Actualizar displayName y photoURL si el usuario actual es el cliente
        if (clientData.email && auth.currentUser && auth.currentUser.email?.toLowerCase() === clientData.email.toLowerCase()) {
          try {
            await updateProfile(auth.currentUser, {
              displayName: updatedName,
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
      const measureDate = new Date(anthropometricFormData.date)
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
      csvRows.push('Nombre,' + (combineName(formData.firstName, formData.secondName, formData.firstLastName, formData.secondLastName) || ''))
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
      
      
      // Crear archivo CSV
      const csvContent = csvRows.join('\n')
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fullName = combineName(formData.firstName, formData.secondName, formData.firstLastName, formData.secondLastName)
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

  return (
    <>
      {/* Form - Tres Columnas con Secciones Colapsables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-8">
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
            <h2 className={`text-lg sm:text-xl font-bold ${
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
                        La imagen se comprimirá automáticamente (calidad 75%). 
                        <br />
                        <span className="font-semibold">Recomendación:</span> Para optimizar el almacenamiento, considera usar servicios externos como Cloudinary, Firebase Storage o Imgur. 
                        Comprime la imagen antes de subir (formato JPEG con calidad 70-80%) para reducir el consumo de espacio.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campos del formulario */}
              <div className="space-y-4">
                {/* Primer Nombre */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Primer Nombre *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    placeholder="Ej: Juan"
                  />
                </div>

                {/* Segundo Nombre */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Segundo Nombre
                  </label>
                  <input
                    type="text"
                    name="secondName"
                    value={formData.secondName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    placeholder="Ej: Carlos (opcional)"
                  />
                </div>

                {/* Primer Apellido */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Primer Apellido *
                  </label>
                  <input
                    type="text"
                    name="firstLastName"
                    value={formData.firstLastName}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    placeholder="Ej: Pérez"
                  />
                </div>

                {/* Segundo Apellido */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Segundo Apellido
                  </label>
                  <input
                    type="text"
                    name="secondLastName"
                    value={formData.secondLastName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                    placeholder="Ej: González (opcional)"
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

        {/* Botón Ver Retroalimentación */}
        {clientId && (
          <button
            onClick={() => navigate(`/client/${clientId}/feedback`)}
            className={`w-full p-6 rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-between ${
              theme === 'dark' 
                ? 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/50' 
                : 'bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <h2 className={`text-xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Ver Retroalimentación
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

        {/* Sección Medidas Antropométricas */}
        {clientId && (
          <div className={`rounded-xl shadow-lg overflow-hidden ${
            theme === 'dark' 
              ? 'bg-slate-800/80 border border-slate-700' 
              : 'bg-white border border-gray-200'
          }`}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsAnthropometricExpanded(!isAnthropometricExpanded)
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
                Medidas Antropométricas
              </h2>
              <svg
                className={`w-5 h-5 transition-transform ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                } ${isAnthropometricExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isAnthropometricExpanded && (
              <div className="px-6 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                  }`}>
                    Historial de Medidas
                  </h3>
                  <button
                    onClick={() => setShowAnthropometricModal(true)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir Medida
                  </button>
                </div>

                {anthropometricMeasures.length === 0 ? (
                  <div className={`text-center py-8 rounded-lg ${
                    theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
                  }`}>
                    <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      No hay medidas registradas aún
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {anthropometricMeasures.map((measure) => {
                      const measureDate = measure.date?.toDate 
                        ? measure.date.toDate() 
                        : measure.date 
                        ? new Date(measure.date) 
                        : new Date()
                      
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
                )}
              </div>
            )}
          </div>
        )}

        {/* Botón RM y PR */}
        {clientId && (
          <button
            onClick={() => navigate(`/client/${clientId}/rm-pr`)}
            className={`w-full p-6 rounded-xl shadow-lg transition-all hover:scale-105 flex items-center justify-between ${
              theme === 'dark' 
                ? 'bg-slate-800/80 border border-slate-700 hover:bg-slate-700/50' 
                : 'bg-white border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <h2 className={`text-xl font-bold ${
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
            <h2 className={`text-lg sm:text-xl font-bold ${
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
      {clientId && isCoach && showProgressButton && (
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

      {/* Botones de Guardar y Cancelar - Solo si showSaveButtons es true */}
      {showSaveButtons && (
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
                  onClick={() => setShowAnthropometricModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAnthropometric}
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

