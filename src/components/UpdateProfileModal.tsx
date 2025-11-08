import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { updateProfile, updateEmail, sendEmailVerification } from 'firebase/auth'
import { db } from '../firebaseConfig'
import { doc, updateDoc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'

interface UpdateProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const UpdateProfileModal = ({ isOpen, onClose, onSuccess }: UpdateProfileModalProps) => {
  const { theme } = useTheme()
  const { t } = useLanguage()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Cargar datos actuales del usuario
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        phone: ''
      })

      // Cargar teléfono desde Firestore si existe
      const loadUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            setFormData(prev => ({
              ...prev,
              phone: data.phone || ''
            }))
          }
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      }
      loadUserData()
    }
  }, [user, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // Actualizar displayName en Firebase Auth
      if (formData.displayName !== user.displayName) {
        await updateProfile(user, {
          displayName: formData.displayName
        })
      }

      // Actualizar email si cambió
      if (formData.email !== user.email) {
        await updateEmail(user, formData.email)
        // Enviar email de verificación
        await sendEmailVerification(user)
      }

      // Guardar datos adicionales en Firestore
      const userRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        // Actualizar documento existente
        await updateDoc(userRef, {
          displayName: formData.displayName,
          email: formData.email,
          phone: formData.phone || '',
          updatedAt: new Date().toISOString()
        })
      } else {
        // Crear nuevo documento
        await setDoc(userRef, {
          displayName: formData.displayName,
          email: formData.email,
          phone: formData.phone || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      // Si el usuario es un cliente, también actualizar en la colección 'clients'
      if (user.email) {
        try {
          const clientsRef = collection(db, 'clients')
          const q = query(clientsRef, where('email', '==', user.email.toLowerCase()))
          const snapshot = await getDocs(q)
          
          if (!snapshot.empty) {
            // Actualizar el documento del cliente
            const clientDoc = snapshot.docs[0]
            await updateDoc(doc(db, 'clients', clientDoc.id), {
              name: formData.displayName,
              email: formData.email.toLowerCase(),
              updatedAt: new Date().toISOString()
            })
          }
        } catch (error) {
          console.error('Error updating client name:', error)
          // No fallar si no se puede actualizar el cliente
        }
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 1500)
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error)
      let errorMessage = 'Error al actualizar perfil. Por favor, intenta de nuevo.'
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email ya está en uso por otra cuenta.'
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Por seguridad, necesitas iniciar sesión nuevamente para cambiar el email.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      displayName: '',
      email: '',
      phone: ''
    })
    setError(null)
    setSuccess(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
            style={{ minHeight: '100vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-full max-w-md rounded-2xl shadow-2xl ${
              theme === 'dark' 
                ? 'bg-slate-800 border border-slate-700' 
                : 'bg-white border border-gray-200'
            }`}>
              {success ? (
                <div className="p-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <h3 className={`text-xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {t('modal.updateProfile.success')}
                  </h3>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    {t('modal.updateProfile.successMessage')}
                  </p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className={`p-6 border-b ${
                    theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h2 className={`text-2xl font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {t('modal.updateProfile.title')}
                      </h2>
                      <button
                        onClick={handleClose}
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
                    <p className={`text-sm mt-2 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                    }`}>
                      {t('modal.updateProfile.subtitle')}
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Nombre */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {t('modal.updateProfile.name')} *
                      </label>
                      <input
                        type="text"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500'
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                        placeholder={t('modal.updateProfile.namePlaceholder')}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {t('modal.updateProfile.email')} *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500'
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                        placeholder={t('modal.updateProfile.emailPlaceholder')}
                      />
                      <p className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
                      }`}>
                        {t('modal.updateProfile.emailHint')}
                      </p>
                    </div>

                    {/* Teléfono */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {t('modal.updateProfile.phone')} <span className="text-xs text-gray-500">({t('modal.addClient.optional')})</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500'
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                        placeholder={t('modal.updateProfile.phonePlaceholder')}
                      />
                    </div>

                    {/* Error message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm"
                      >
                        {error}
                      </motion.div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handleClose}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                          theme === 'dark'
                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                        }`}
                      >
                        {t('modal.updateProfile.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-3 rounded-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-800 text-white hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? t('modal.updateProfile.updating') : t('modal.updateProfile.update')}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default UpdateProfileModal

