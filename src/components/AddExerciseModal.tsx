import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebaseConfig'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { exerciseCategories } from '../data/exercises'

interface AddExerciseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const AddExerciseModal = ({ isOpen, onClose, onSuccess }: AddExerciseModalProps) => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    video: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validar campos requeridos
      if (!formData.name.trim()) {
        throw new Error('El nombre del ejercicio es requerido')
      }
      if (!formData.category) {
        throw new Error('La categoría es requerida')
      }

      // Verificar que sea admin
      const userEmail = user?.email?.toLowerCase()
      const isAdmin = userEmail === 'piperubiocoach@gmail.com' || userEmail === 'sebassennin@gmail.com'
      
      if (!isAdmin) {
        throw new Error('Solo los administradores pueden añadir ejercicios')
      }

      // Guardar ejercicio en Firestore
      // Construir objeto sin campos undefined (Firestore no acepta undefined)
      const exerciseData: any = {
        name: formData.name.trim(),
        category: formData.category,
        createdAt: serverTimestamp(),
        createdBy: user?.email || ''
      }

      // Solo agregar description si tiene valor
      const descriptionTrimmed = formData.description.trim()
      if (descriptionTrimmed) {
        exerciseData.description = descriptionTrimmed
      }

      // Solo agregar video si tiene valor
      const videoTrimmed = formData.video.trim()
      if (videoTrimmed) {
        exerciseData.video = videoTrimmed
      }

      await addDoc(collection(db, 'exercises'), exerciseData)

      // Resetear formulario
      setFormData({
        name: '',
        category: '',
        description: '',
        video: ''
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error al agregar ejercicio:', error)
      setError(error.message || 'Error al agregar el ejercicio')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        category: '',
        description: '',
        video: ''
      })
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`relative w-full max-w-md rounded-xl shadow-2xl backdrop-blur-sm ${
            theme === 'dark' ? 'bg-slate-800/90 border border-slate-700/50' : 'bg-white/90 border border-gray-200/50'
          }`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Añadir Ejercicio
              </h2>
              <button
                onClick={handleClose}
                disabled={loading}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-slate-700 text-slate-300'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Nombre del Ejercicio *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Ej: Burpees"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Categoría *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                >
                  <option value="">Selecciona una categoría</option>
                  {exerciseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={loading}
                  rows={3}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none`}
                  placeholder="Descripción del ejercicio (opcional)"
                />
              </div>

              {/* Video URL */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  URL del Video (YouTube)
                </label>
                <input
                  type="url"
                  name="video"
                  value={formData.video}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="https://www.youtube.com/..."
                />
              </div>

              {/* Error */}
              {error && (
                <div className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600'
                }`}>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Añadiendo...' : 'Añadir Ejercicio'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default AddExerciseModal

