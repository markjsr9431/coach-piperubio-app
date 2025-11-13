import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../firebaseConfig'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const AddClientModal = ({ isOpen, onClose, onSuccess }: AddClientModalProps) => {
  const { theme } = useTheme()
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    firstName: '',
    secondName: '',
    firstLastName: '',
    secondLastName: '',
    email: '',
    plan: 'Plan Mensual - Nivel 2',
    phone: '',
    password: ''
  })

  // Función helper para combinar nombres
  const combineName = (firstName: string, secondName: string, firstLastName: string, secondLastName: string): string => {
    const parts = [firstName, secondName, firstLastName, secondLastName].filter(Boolean)
    return parts.join(' ')
  }
  const [useCustomPassword, setUseCustomPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'success'>('form')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('Por favor, ingresa un email válido')
      }

      // Usar contraseña personalizada o generar una temporal
      let passwordToUse: string
      if (useCustomPassword && formData.password) {
        // Validar contraseña personalizada
        if (formData.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres')
        }
        passwordToUse = formData.password
      } else {
        // Generar contraseña temporal
        passwordToUse = Math.random().toString(36).slice(-12) + 
                       Math.random().toString(36).slice(-12).toUpperCase() + '123!'
      }
      
      // Guardar credenciales del coach antes de crear el cliente
      const coachEmail = auth.currentUser?.email
      const coachPassword = sessionStorage.getItem('coach_password_temp')
      
      if (!coachEmail) {
        throw new Error('No se pudo obtener la sesión del coach')
      }

      // Crear usuario directamente
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.toLowerCase(),
        passwordToUse
      )

      const createdClientId = userCredential.user.uid

      // Guardar información del cliente en Firestore
      const fullName = combineName(formData.firstName, formData.secondName, formData.firstLastName, formData.secondLastName)
      await setDoc(doc(db, 'clients', createdClientId), {
        name: fullName,
        email: formData.email.toLowerCase(),
        phone: formData.phone || '',
        plan: formData.plan,
        status: 'active',
        createdAt: serverTimestamp(),
        role: 'client',
        createdBy: coachEmail
      })

      // Restaurar sesión del coach inmediatamente
      if (coachPassword) {
        await signInWithEmailAndPassword(auth, coachEmail, coachPassword)
      } else {
        // Si no hay contraseña guardada, el usuario deberá iniciar sesión de nuevo
        console.warn('No se pudo restaurar la sesión del coach automáticamente')
      }
      
      console.log('Cliente creado exitosamente:', createdClientId)
      
      setLoading(false)
      setStep('success')
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)
    } catch (error: any) {
      console.error('Error al agregar cliente:', error)
      
      let errorMessage = 'Error al agregar cliente. Por favor, intenta de nuevo.'
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email ya está registrado. El cliente puede iniciar sesión directamente.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El email proporcionado no es válido.'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      setLoading(false)
      
      // Intentar restaurar sesión del coach incluso si hay error
      const coachEmail = auth.currentUser?.email
      const coachPassword = sessionStorage.getItem('coach_password_temp')
      if (coachEmail && coachPassword) {
        try {
          await signInWithEmailAndPassword(auth, coachEmail, coachPassword)
        } catch (restoreError) {
          console.error('Error al restaurar sesión del coach:', restoreError)
        }
      }
    }
  }

  const handleClose = () => {
    setFormData({
      firstName: '',
      secondName: '',
      firstLastName: '',
      secondLastName: '',
      email: '',
      plan: 'Plan Mensual - Nivel 2',
      phone: '',
      password: ''
    })
    setUseCustomPassword(false)
    setShowPassword(false)
    setError(null)
    setStep('form')
    setLoading(false)
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
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100]"
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
            <div className={`w-full max-w-md rounded-2xl shadow-2xl backdrop-blur-sm ${
              theme === 'dark' 
                ? 'bg-slate-800/90 border border-slate-700/50' 
                : 'bg-white/90 border border-gray-200/50'
            }`}>
              {step === 'form' ? (
                <>
                  {/* Header */}
                  <div className={`p-6 border-b ${
                    theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h2 className={`text-2xl font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {t('modal.addClient.title')}
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
                      {t('modal.addClient.subtitle')}
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500'
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
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
                        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500'
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
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
                        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500'
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
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
                        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500'
                            : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                        placeholder="Ej: González (opcional)"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {t('modal.addClient.email')} *
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
                        placeholder={t('modal.addClient.emailPlaceholder')}
                      />
                      <p className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
                      }`}>
                        {useCustomPassword 
                          ? t('modal.addClient.emailHintWithPassword')
                          : t('modal.addClient.emailHint')
                        }
                      </p>
                    </div>

                    {/* Teléfono (opcional) */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {t('modal.addClient.phone')} <span className="text-xs text-gray-500">({t('modal.addClient.optional')})</span>
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
                        placeholder={t('modal.addClient.phonePlaceholder')}
                      />
                    </div>

                    {/* Contraseña (opcional) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={`block text-sm font-semibold ${
                          theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          {t('modal.addClient.password')} <span className="text-xs text-gray-500">({t('modal.addClient.optional')})</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setUseCustomPassword(!useCustomPassword)}
                          className={`text-xs ${
                            theme === 'dark' ? 'text-primary-400' : 'text-primary-600'
                          } hover:underline`}
                        >
                          {useCustomPassword ? t('modal.addClient.useAutoPassword') : t('modal.addClient.setCustomPassword')}
                        </button>
                      </div>
                      {useCustomPassword ? (
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            minLength={6}
                            className={`w-full px-4 py-3 pr-12 rounded-lg border transition-colors ${
                              theme === 'dark'
                                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-primary-500'
                                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-primary-500'
                            } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                            placeholder={t('modal.addClient.passwordPlaceholder')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                              theme === 'dark'
                                ? 'hover:bg-slate-600 text-slate-400'
                                : 'hover:bg-gray-200 text-gray-500'
                            }`}
                            title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          >
                            {showPassword ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className={`w-full px-4 py-3 rounded-lg border ${
                          theme === 'dark'
                            ? 'bg-slate-700/50 border-slate-600 text-slate-400'
                            : 'bg-gray-100 border-gray-300 text-gray-500'
                        }`}>
                          {t('modal.addClient.autoPasswordHint')}
                        </div>
                      )}
                    </div>

                    {/* Plan */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        {t('modal.addClient.plan')} *
                      </label>
                      <select
                        name="plan"
                        value={formData.plan}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-slate-700 border-slate-600 text-white focus:border-primary-500'
                            : 'bg-gray-50 border-gray-300 text-gray-900 focus:border-primary-500'
                        } focus:outline-none focus:ring-2 focus:ring-primary-500/20`}
                      >
                        <option value="Plan Mensual - Nivel 1">Plan Mensual - Nivel 1</option>
                        <option value="Plan Mensual - Nivel 2">Plan Mensual - Nivel 2</option>
                        <option value="Plan Mensual - Nivel 3">Plan Mensual - Nivel 3</option>
                        <option value="Plan Personalizado">Plan Personalizado</option>
                      </select>
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
                        {t('modal.addClient.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-3 rounded-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-800 text-white hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? t('modal.addClient.creating') : t('modal.addClient.create')}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
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
                    {t('modal.addClient.success')}
                  </h3>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    {t('modal.addClient.successMessage')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AddClientModal

