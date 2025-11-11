import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { db, auth } from '../firebaseConfig'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
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
    profilePhoto: null as string | null
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            cedula: data.cedula || '',
            rh: data.rh || '',
            eps: data.eps || '',
            profilePhoto: data.profilePhoto || null
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        
        await updateDoc(clientRef, {
          name: updatedName,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          cedula: formData.cedula.trim() || null,
          rh: formData.rh.trim() || null,
          eps: formData.eps.trim() || null,
          profilePhoto: photoUrl || null,
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
            <h1 className={`text-4xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Información del Cliente
            </h1>
            <p className={`text-lg ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Gestiona la información personal y la fotografía de perfil
            </p>
          </div>

          {/* Form */}
          <div className={`rounded-xl p-6 shadow-lg ${
            theme === 'dark' 
              ? 'bg-slate-800/80 border border-slate-700' 
              : 'bg-white border border-gray-200'
          }`}>
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

            {/* Sección RM y PR */}
            {clientId && (
              <div className="mt-8">
                <RMAndPRSection clientId={clientId} isCoach={isCoach} />
              </div>
            )}

            {/* Botón para ver gráficas de progreso - Solo para coach */}
            {clientId && isCoach && (
              <div className="mt-6">
                <button
                  onClick={() => {
                    // TODO: Implementar modal de gráficas
                    alert('Funcionalidad de gráficas en desarrollo. Mostrará progreso de RM, PR y peso corporal por semana, mes y año.')
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
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ClientProfilePage

