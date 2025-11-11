import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import UpdateProfileModal from './UpdateProfileModal'
import ColorThemeSelector from './ColorThemeSelector'
import { db } from '../firebaseConfig'
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore'

const TopBanner = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ clientId?: string }>()
  const { theme, toggleTheme } = useTheme()
  const { t, toggleLanguage, language } = useLanguage()
  const { user, logout } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showColorSelector, setShowColorSelector] = useState(false)
  const [clientName, setClientName] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isHomePage = location.pathname === '/' || location.pathname === '/login'
  const isViewingClient = location.pathname.startsWith('/client/') && params.clientId
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'

  // Cargar nombre del cliente cuando se está viendo un cliente específico
  useEffect(() => {
    if (isViewingClient && params.clientId) {
      const clientRef = doc(db, 'clients', params.clientId)
      
      // Suscribirse a cambios en tiempo real
      const unsubscribe = onSnapshot(clientRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data()
          setClientName(data.name || 'Cliente')
        } else {
          setClientName(null)
        }
      }, (error) => {
        console.error('Error loading client name:', error)
        setClientName(null)
      })

      return () => unsubscribe()
    } else {
      setClientName(null)
    }
  }, [isViewingClient, params.clientId])

  // Cargar nombre del cliente desde Firestore si es cliente
  const [clientDisplayName, setClientDisplayName] = useState<string | null>(null)
  
  useEffect(() => {
    if (!user || isCoach) {
      setClientDisplayName(null)
      return
    }

    // Buscar el cliente por email en Firestore
    const loadClientName = async () => {
      try {
        const clientsRef = collection(db, 'clients')
        const q = query(clientsRef, where('email', '==', user.email?.toLowerCase()))
        const snapshot = await getDocs(q)
        
        if (!snapshot.empty) {
          const clientData = snapshot.docs[0].data()
          setClientDisplayName(clientData.name || null)
        }
      } catch (error) {
        console.error('Error loading client name:', error)
      }
    }

    loadClientName()

    // Suscribirse a cambios en tiempo real
    let unsubscribe: (() => void) | null = null
    try {
      const clientsRef = collection(db, 'clients')
      const q = query(clientsRef, where('email', '==', user.email?.toLowerCase()))
      unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const clientData = snapshot.docs[0].data()
          setClientDisplayName(clientData.name || null)
        }
      }, (error) => {
        console.error('Error subscribing to client name:', error)
      })
    } catch (error) {
      console.error('Error setting up subscription:', error)
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user, isCoach])

  // Obtener nombre para mostrar
  const getDisplayName = () => {
    // Si estamos viendo un cliente específico, mostrar su nombre
    if (isViewingClient && clientName) {
      return clientName
    }
    
    if (!user) return 'Usuario'
    
    // Si es el admin piperubiocoach@gmail.com, mostrar "COACH PIPERUBIO"
    if (user.email?.toLowerCase() === 'piperubiocoach@gmail.com') {
      return 'COACH PIPERUBIO'
    }
    
    // Si es cliente, usar el nombre de Firestore, luego displayName, luego email
    if (clientDisplayName) {
      return clientDisplayName
    }
    
    return user.displayName || user.email || 'Usuario'
  }

  // Obtener iniciales del usuario
  const getUserInitials = () => {
    if (!user) return 'U'
    
    // Si es el admin piperubiocoach@gmail.com, mostrar "CP"
    if (user.email?.toLowerCase() === 'piperubiocoach@gmail.com') {
      return 'CP'
    }
    
    const displayName = user.displayName || user.email || ''
    const parts = displayName.split(' ')
    
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    } else if (displayName.length > 0) {
      return displayName.substring(0, 2).toUpperCase()
    }
    
    return user.email?.substring(0, 2).toUpperCase() || 'U'
  }

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const handleLogout = async () => {
    await logout()
    navigate('/')
    setShowUserMenu(false)
  }

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 ${
        theme === 'dark' ? 'bg-black/80' : 'bg-gray-800/80'
      } backdrop-blur-sm text-white shadow-lg transition-all duration-300 ${
        !isHomePage 
          ? (isScrolled ? 'py-2 sm:py-4' : 'py-3 sm:py-4')
          : (isScrolled ? 'py-2 sm:py-6' : 'py-6 sm:py-6')
      } px-4 sm:px-6 lg:px-8`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Botón de back - Solo visible cuando no estamos en HomePage */}
        {!isHomePage && (
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 p-2 sm:p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors mr-2 sm:mr-0"
            aria-label="Volver a la página anterior"
            title="Volver a la página anterior"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <div className={`${!isHomePage ? 'flex-1' : 'flex-1'} text-center transition-all duration-300 ${
          !isHomePage && isScrolled ? 'hidden sm:block' : ''
        }`}>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={`font-bold uppercase mb-2 transition-all duration-300 ${
              !isHomePage
                ? (isScrolled ? 'text-sm sm:text-xl' : 'text-lg sm:text-2xl')
                : (isScrolled ? 'text-base sm:text-2xl' : 'text-2xl sm:text-3xl')
            }`}
          >
            {isViewingClient && clientName ? clientName : (location.pathname.startsWith('/client/') ? t('plan.title') : 'Coach Piperubio')}
          </motion.h2>
          {/* Fecha actual - Centrada */}
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className={`font-semibold transition-all duration-300 text-center ${
              !isHomePage
                ? (isScrolled ? 'text-xs sm:text-sm' : 'text-xs sm:text-base')
                : (isScrolled ? 'text-xs sm:text-base' : 'text-sm sm:text-lg')
            } text-white/90`}
          >
            {(() => {
              const today = new Date()
              const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
              const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
              const dayName = days[today.getDay()]
              const day = today.getDate()
              const month = months[today.getMonth()]
              const year = today.getFullYear()
              
              // En móviles mostrar formato corto, en desktop mostrar completo
              return (
                <>
                  <span className="sm:hidden">{dayName} {day} {month}</span>
                  <span className="hidden sm:inline">{dayName} {day} {month} {year}</span>
                </>
              )
            })()}
          </motion.p>
          {/* Solo mostrar "Gestión de Cliente" si es el coach viendo un cliente */}
          {isViewingClient && clientName && isCoach && (
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={`font-semibold uppercase transition-all duration-300 ${
                !isHomePage
                  ? (isScrolled ? 'text-xs sm:text-sm hidden sm:block' : 'text-xs sm:text-base')
                  : (isScrolled ? 'text-xs sm:text-base hidden sm:block' : 'text-sm sm:text-lg')
              } text-primary-300`}
            >
              Gestión de Cliente
            </motion.p>
          )}
          {location.pathname.startsWith('/client/') && !isViewingClient && (
            <>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className={`font-semibold uppercase mb-1 transition-all duration-300 ${
                  !isHomePage
                    ? (isScrolled ? 'text-xs sm:text-base hidden sm:block' : 'text-sm sm:text-lg')
                    : (isScrolled ? 'text-sm sm:text-lg hidden sm:block' : 'text-lg sm:text-xl')
                }`}
              >
                {t('plan.level')}
              </motion.p>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className={`font-bold uppercase transition-all duration-300 ${
                  !isHomePage
                    ? (isScrolled ? 'text-xs sm:text-base hidden sm:block' : 'text-sm sm:text-lg')
                    : (isScrolled ? 'text-base sm:text-xl hidden sm:block' : 'text-xl sm:text-2xl')
                }`}
              >
                {t('plan.client')}
              </motion.p>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Botones de control */}
          <div className="flex gap-2">
            {/* Botón de cambio de tema */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label={t('theme.toggle')}
              title={t('theme.toggle')}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {/* Botón de cambio de idioma */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-semibold text-sm"
              aria-label={t('language.toggle')}
              title={t('language.toggle')}
            >
              {language === 'es' ? 'EN' : 'ES'}
            </button>
          </div>

          {/* Botón de usuario con menú */}
          {user && (
            <div className="relative" ref={menuRef}>
              <motion.button
                onClick={() => setShowUserMenu(!showUserMenu)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 text-white font-bold flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
                aria-label="Menú de usuario"
                title={user.displayName || user.email || 'Usuario'}
              >
                {getUserInitials()}
              </motion.button>

              {/* Menú desplegable */}
              <AnimatePresence>
                {showUserMenu && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowUserMenu(false)}
                      className="fixed inset-0 z-40"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl z-50 ${
                        theme === 'dark' 
                          ? 'bg-slate-800 border border-slate-700' 
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      {/* Información del usuario */}
                      <div className={`p-4 border-b ${
                        theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
                      }`}>
                        <p className={`font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {getDisplayName()}
                        </p>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                        }`}>
                          {user.email}
                        </p>
                      </div>

                      {/* Opciones del menú */}
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            setShowUpdateModal(true)
                          }}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-slate-700 text-slate-300'
                              : 'hover:bg-gray-100 text-gray-700'
                          } flex items-center gap-3`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {t('userMenu.updateProfile')}
                        </button>
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            setShowColorSelector(true)
                          }}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-slate-700 text-slate-300'
                              : 'hover:bg-gray-100 text-gray-700'
                          } flex items-center gap-3`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                          Personalizar Tema
                        </button>
                        <button
                          onClick={handleLogout}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-red-500/20 text-red-400'
                              : 'hover:bg-red-50 text-red-600'
                          } flex items-center gap-3`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          {t('userMenu.logout')}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Modal de actualizar perfil */}
          <UpdateProfileModal
            isOpen={showUpdateModal}
            onClose={() => setShowUpdateModal(false)}
            onSuccess={() => {
              // Recargar la página para actualizar los datos del usuario
              window.location.reload()
            }}
          />

          {/* Selector de colores - Para todos los usuarios */}
          <ColorThemeSelector
            isOpen={showColorSelector}
            onClose={() => setShowColorSelector(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
            className="flex-shrink-0"
          >
            {user ? (
              <motion.button
                onClick={() => navigate('/home')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="cursor-pointer focus:outline-none"
                aria-label="Ir al inicio"
                title="Ir al inicio"
              >
                <img 
                  src="/favicon.png" 
                  alt="Coach Piperubio Logo" 
                  className={`object-contain transition-all duration-300 ${
                    !isHomePage
                      ? (isScrolled ? 'w-10 h-10 sm:w-16 sm:h-16' : 'w-14 h-14 sm:w-20 sm:h-20')
                      : (isScrolled ? 'w-12 h-12 sm:w-20 sm:h-20' : 'w-20 h-20 sm:w-24 sm:h-24')
                  }`}
                />
              </motion.button>
            ) : (
              <img 
                src="/favicon.png" 
                alt="Coach Piperubio Logo" 
                className={`object-contain transition-all duration-300 ${
                  !isHomePage
                    ? (isScrolled ? 'w-10 h-10 sm:w-16 sm:h-16' : 'w-14 h-14 sm:w-20 sm:h-20')
                    : (isScrolled ? 'w-12 h-12 sm:w-20 sm:h-20' : 'w-20 h-20 sm:w-24 sm:h-24')
                }`}
              />
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

export default TopBanner

