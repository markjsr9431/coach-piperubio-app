import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebaseConfig'
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'

interface ColorThemeSelectorProps {
  isOpen: boolean
  onClose: () => void
}

const colorSchemes = [
  { name: 'Azul', value: 'blue', colors: { primary: '#0284c7', secondary: '#0369a1' } },
  { name: 'Verde', value: 'green', colors: { primary: '#059669', secondary: '#047857' } },
  { name: 'Púrpura', value: 'purple', colors: { primary: '#7c3aed', secondary: '#6d28d9' } },
  { name: 'Rosa', value: 'pink', colors: { primary: '#db2777', secondary: '#be185d' } },
  { name: 'Naranja', value: 'orange', colors: { primary: '#ea580c', secondary: '#c2410c' } },
  { name: 'Rojo', value: 'red', colors: { primary: '#dc2626', secondary: '#b91c1c' } },
  { name: 'Amarillo', value: 'yellow', colors: { primary: '#ca8a04', secondary: '#a16207' } },
  { name: 'Cian', value: 'cyan', colors: { primary: '#0891b2', secondary: '#0e7490' } },
  { name: 'Índigo', value: 'indigo', colors: { primary: '#4f46e5', secondary: '#4338ca' } },
  { name: 'Esmeralda', value: 'emerald', colors: { primary: '#10b981', secondary: '#059669' } },
  { name: 'Teal', value: 'teal', colors: { primary: '#14b8a6', secondary: '#0d9488' } },
  { name: 'Violeta', value: 'violet', colors: { primary: '#8b5cf6', secondary: '#7c3aed' } },
  { name: 'Fucsia', value: 'fuchsia', colors: { primary: '#d946ef', secondary: '#c026d3' } },
  { name: 'Ámbar', value: 'amber', colors: { primary: '#f59e0b', secondary: '#d97706' } },
  { name: 'Lima', value: 'lime', colors: { primary: '#84cc16', secondary: '#65a30d' } },
  { name: 'Verde Azulado', value: 'sky', colors: { primary: '#0ea5e9', secondary: '#0284c7' } },
]

const ColorThemeSelector = ({ isOpen, onClose }: ColorThemeSelectorProps) => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [selectedColor, setSelectedColor] = useState<string>('blue')
  const [loading, setLoading] = useState(false)

  // Cargar color guardado del usuario - Usar UID específico del usuario
  useEffect(() => {
    const loadUserColor = async () => {
      if (!user?.uid) {
        return
      }
      
      try {
        // Buscar en la colección 'users' con el UID del usuario
        const userRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userRef)
        if (userDoc.exists()) {
          const data = userDoc.data()
          if (data.themeColor) {
            setSelectedColor(data.themeColor)
            applyColor(data.themeColor)
          }
        }
      } catch (error) {
        console.error('Error loading user color:', error)
      }
    }
    if (isOpen) {
      loadUserColor()
    }
  }, [user?.uid, isOpen])

  // Cargar color al iniciar la aplicación (no solo cuando se abre el modal)
  useEffect(() => {
    const loadUserColorOnMount = async () => {
      if (!user?.uid) {
        return
      }
      
      try {
        const userRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userRef)
        if (userDoc.exists()) {
          const data = userDoc.data()
          if (data.themeColor) {
            applyColor(data.themeColor)
          }
        }
      } catch (error) {
        console.error('Error loading user color on mount:', error)
      }
    }
    loadUserColorOnMount()
  }, [user?.uid])

  const applyColor = (colorValue: string) => {
    const colorScheme = colorSchemes.find(scheme => scheme.value === colorValue)
    if (colorScheme) {
      const root = document.documentElement
      // Aplicar colores como variables CSS para usar en Tailwind
      root.style.setProperty('--color-primary', colorScheme.colors.primary)
      root.style.setProperty('--color-primary-dark', colorScheme.colors.secondary)
      
      // También aplicar directamente a las clases de primary de Tailwind usando style
      // Esto se aplicará a elementos con clase primary-600, primary-700, etc.
      const style = document.createElement('style')
      style.id = 'custom-theme-colors'
      style.textContent = `
        .primary-custom {
          --tw-color-primary-600: ${colorScheme.colors.primary} !important;
          --tw-color-primary-700: ${colorScheme.colors.secondary} !important;
          --tw-color-primary-800: ${colorScheme.colors.secondary} !important;
        }
        .bg-primary-600 { background-color: ${colorScheme.colors.primary} !important; }
        .bg-primary-700 { background-color: ${colorScheme.colors.secondary} !important; }
        .bg-primary-800 { background-color: ${colorScheme.colors.secondary} !important; }
        .text-primary-600 { color: ${colorScheme.colors.primary} !important; }
        .border-primary-500 { border-color: ${colorScheme.colors.primary} !important; }
        .from-primary-600 { --tw-gradient-from: ${colorScheme.colors.primary} !important; }
        .to-primary-800 { --tw-gradient-to: ${colorScheme.colors.secondary} !important; }
      `
      // Eliminar estilo anterior si existe
      const existingStyle = document.getElementById('custom-theme-colors')
      if (existingStyle) {
        existingStyle.remove()
      }
      document.head.appendChild(style)
    }
  }

  const handleColorSelect = async (colorValue: string) => {
    setSelectedColor(colorValue)
    applyColor(colorValue)
    
    // Guardar en Firestore usando el UID del usuario
    if (user?.uid) {
      setLoading(true)
      try {
        const userRef = doc(db, 'users', user.uid)
        // Usar setDoc con merge para crear o actualizar
        await updateDoc(userRef, {
          themeColor: colorValue,
          updatedAt: new Date()
        }).catch(async (error) => {
          // Si el documento no existe, crearlo
          if (error.code === 'not-found') {
            await setDoc(userRef, {
              themeColor: colorValue,
              createdAt: new Date(),
              updatedAt: new Date()
            })
          } else {
            throw error
          }
        })
      } catch (error) {
        console.error('Error saving color:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md rounded-xl shadow-2xl mx-auto my-auto ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-white'
          }`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Personalizar Tema
              </h2>
              <button
                onClick={onClose}
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

            <div className="space-y-4">
              <p className={`text-sm ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                Selecciona un esquema de colores para personalizar tu perfil
              </p>

              <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {colorSchemes.map((scheme) => (
                  <button
                    key={scheme.value}
                    onClick={() => handleColorSelect(scheme.value)}
                    disabled={loading}
                    className={`relative p-4 rounded-lg transition-all ${
                      selectedColor === scheme.value
                        ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white scale-105'
                        : 'hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: scheme.colors.primary,
                    }}
                    title={scheme.name}
                  >
                    {selectedColor === scheme.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="text-center py-2">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                </div>
              )}

              {/* Botón OK */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    theme === 'dark'
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ColorThemeSelector

