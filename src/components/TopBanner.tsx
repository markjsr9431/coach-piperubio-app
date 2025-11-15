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
  const [showConfigMenu, setShowConfigMenu] = useState(false)
  const [clientName, setClientName] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const configMenuRef = useRef<HTMLDivElement>(null)
  const isHomePage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/home'
  const isViewingClient = location.pathname.startsWith('/client/') && params.clientId
  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'

  // Función para manejar el botón back - navegar página por página
  const handleBack = () => {
    const path = location.pathname
    // No permitir volver hasta login
    if (path === '/' || path === '/login' || path === '/home') {
      return
    }
    // Usar navigate(-1) para ir a la página anterior
    navigate(-1)
  }

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

  // Cargar nombre y foto del cliente desde Firestore si es cliente
  const [clientDisplayName, setClientDisplayName] = useState<string | null>(null)
  const [clientProfilePhoto, setClientProfilePhoto] = useState<string | null>(null)
  
  useEffect(() => {
    if (!user || isCoach) {
      setClientDisplayName(null)
      setClientProfilePhoto(null)
      return
    }

    // Buscar el cliente por email en Firestore
    const loadClientData = async () => {
      try {
        const clientsRef = collection(db, 'clients')
        const q = query(clientsRef, where('email', '==', user.email?.toLowerCase()))
        const snapshot = await getDocs(q)
        
        if (!snapshot.empty) {
          const clientData = snapshot.docs[0].data()
          setClientDisplayName(clientData.name || null)
          setClientProfilePhoto(clientData.profilePhoto || null)
          
          // Actualizar photoURL en Auth si hay foto y el usuario no tiene una o es diferente
          if (clientData.profilePhoto && clientData.profilePhoto !== user.photoURL) {
            try {
              const { updateProfile } = await import('firebase/auth')
              await updateProfile(user, {
                photoURL: clientData.profilePhoto
              })
            } catch (error) {
              console.error('Error updating Auth photoURL:', error)
            }
          }
        }
      } catch (error) {
        console.error('Error loading client data:', error)
      }
    }

    loadClientData()

    // Suscribirse a cambios en tiempo real
    let unsubscribe: (() => void) | null = null
    try {
      const clientsRef = collection(db, 'clients')
      const q = query(clientsRef, where('email', '==', user.email?.toLowerCase()))
      unsubscribe = onSnapshot(q, async (snapshot) => {
        if (!snapshot.empty) {
          const clientData = snapshot.docs[0].data()
          setClientDisplayName(clientData.name || null)
          const newPhoto = clientData.profilePhoto || null
          setClientProfilePhoto(newPhoto)
          
          // Actualizar photoURL en Auth si hay una nueva foto
          if (newPhoto && user && newPhoto !== user.photoURL) {
            try {
              const { updateProfile } = await import('firebase/auth')
              await updateProfile(user, {
                photoURL: newPhoto
              })
            } catch (error) {
              console.error('Error updating Auth photoURL:', error)
            }
          }
        }
      }, (error) => {
        console.error('Error subscribing to client data:', error)
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

  // Función helper para obtener iniciales: "J. R."
  const getInitials = (fullName: string): string => {
    if (!fullName) return ''
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    if (parts.length === 1) return `${parts[0][0]}.`.toUpperCase()
    // Primer nombre inicial y primer apellido inicial
    const firstName = parts[0]
    const lastName = parts.length >= 3 ? parts[2] : parts[parts.length - 1]
    return `${firstName[0]}. ${lastName[0]}.`.toUpperCase()
  }

  // Función helper para obtener nombre + apellido: "JOSE RUBIO"
  const getNameAndLastName = (fullName: string): string => {
    if (!fullName) return ''
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length <= 2) return fullName
    // Primer nombre y primer apellido (parts[2] si hay 3+ partes)
    if (parts.length === 3) {
      return `${parts[0]} ${parts[2]}`
    }
    return `${parts[0]} ${parts[2]}`
  }

  // Función helper para obtener inicial + apellido: "J. RUBIO"
  const getInitialAndLastName = (fullName: string): string => {
    if (!fullName) return ''
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    const firstName = parts[0]
    const lastName = parts.length >= 3 ? parts[2] : parts[parts.length - 1]
    return `${firstName[0]}. ${lastName}`.toUpperCase()
  }

  // Función helper para formatear nombres: mostrar solo primer nombre y primer apellido (para desktop)
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

  // Obtener nombre completo sin truncar
  const getFullName = (): string => {
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

  // Obtener nombre para mostrar con truncamiento condicional en móvil
  const getDisplayName = () => {
    const fullName = getFullName()
    
    // En desktop, usar formato normal (primer nombre + primer apellido)
    if (!isMobile) {
      return formatClientName(fullName)
    }
    
    // En móvil con sticky header (scroll down), siempre mostrar iniciales
    if (isScrolled) {
      return getInitials(fullName)
    }
    
    // En móvil sin scroll, usar jerarquía condicional
    // Intentar nombre completo primero
    const fullNameText = fullName
    
    // Si el nombre es muy largo (más de 20 caracteres), usar nombre + apellido
    if (fullNameText.length > 20) {
      const nameAndLast = getNameAndLastName(fullNameText)
      // Si aún es largo, usar inicial + apellido
      if (nameAndLast.length > 15) {
        return getInitialAndLastName(fullNameText)
      }
      return nameAndLast
    }
    
    // Si el nombre completo es razonable, mostrarlo
    return fullNameText
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

  // Cerrar menú de configuración al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (configMenuRef.current && !configMenuRef.current.contains(event.target as Node)) {
        setShowConfigMenu(false)
      }
    }

    if (showConfigMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showConfigMenu])

  const handleLogout = async () => {
    await logout()
    navigate('/')
    setShowUserMenu(false)
  }

  // Detectar si estamos en móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640) // sm breakpoint de Tailwind
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Medir ancho del nombre para detectar estiramiento (opcional, para futuras mejoras)
  // useEffect(() => {
  //   if (nameRef.current && isMobile) {
  //     const observer = new ResizeObserver((entries) => {
  //       for (const entry of entries) {
  //         // nameWidth podría usarse en el futuro para detectar estiramiento dinámico
  //       }
  //     })
  //     observer.observe(nameRef.current)
  //     return () => observer.disconnect()
  //   }
  // }, [isMobile, isScrolled, clientName, clientDisplayName, user])

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 ${
        theme === 'dark' ? 'bg-black/80' : 'bg-gray-800/80'
      } backdrop-blur-sm text-white shadow-lg transition-all duration-300 ${
        !isHomePage 
          ? (isScrolled ? 'py-1.5 lg:py-3' : 'py-2 lg:py-3')
          : (isScrolled ? 'py-1.5 lg:py-3' : 'py-2 lg:py-3')
      } px-3 sm:px-4 lg:px-10`}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-3 items-center gap-1 sm:gap-2 lg:gap-3">
        {/* Columna Izquierda: Botón de back + Fecha */}
        <div className="flex items-center gap-1 sm:gap-2">
          {!isHomePage && (
            <button
              onClick={handleBack}
              className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Volver"
              title="Volver"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          {/* Fecha - Movida a la izquierda */}
          {isHomePage && isCoach && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="flex flex-col items-start"
            >
              {(() => {
                const today = new Date()
                const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
                const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                const dayName = days[today.getDay()]
                const day = today.getDate()
                const month = months[today.getMonth()]
                const year = today.getFullYear()
                
                return (
                  <>
                    <span className={`font-semibold transition-all duration-300 text-left leading-tight ${
                      !isHomePage
                        ? (isScrolled ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm')
                        : (isScrolled ? 'text-xs sm:text-sm' : 'text-xs sm:text-base')
                    } text-white/90`}>
                      {dayName}
                    </span>
                    <span className={`font-semibold transition-all duration-300 text-left leading-tight ${
                      !isHomePage
                        ? (isScrolled ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm')
                        : (isScrolled ? 'text-xs sm:text-sm' : 'text-xs sm:text-base')
                    } text-white/90`}>
                      <span className="sm:hidden">{day} {month}</span>
                      <span className="hidden sm:inline">{day} {month} {year}</span>
                    </span>
                  </>
                )
              })()}
            </motion.div>
          )}
        </div>
        
        {/* Columna Central: Texto Principal + Eslogan - Centrada */}
        <div className={`flex flex-col justify-center items-center transition-all duration-300 ${
          !isHomePage && isScrolled ? 'hidden sm:flex' : 'flex'
        }`}>
          {/* Texto Principal y Eslogan - Siempre centrado */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center gap-0"
          >
            <motion.h2 
              className={`font-bold uppercase transition-all duration-300 leading-tight text-center ${
                !isHomePage
                  ? (isScrolled ? 'text-xs lg:text-2xl' : 'text-xs sm:text-base lg:text-2xl')
                  : (isScrolled ? 'text-xs sm:text-base lg:text-2xl' : 'text-sm sm:text-lg lg:text-3xl')
              }`}
            >
              {isViewingClient && clientName ? getDisplayName() : (location.pathname.startsWith('/client/') ? t('plan.title') : 'Coach Piperubio')}
            </motion.h2>
            {/* Eslogan - Movido al centro, debajo del título principal */}
            {isCoach && isHomePage && (
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.22, duration: 0.5 }}
                className={`font-normal transition-all duration-300 leading-tight whitespace-normal text-center text-white/70 ${
                  isScrolled ? 'text-[9px] sm:text-[8px] lg:text-xs' : 'text-[9px] sm:text-[10px] lg:text-sm'
                } mt-[-2px]`}
              >
                Prof. Deporte | Halterofilia
              </motion.p>
            )}
          </motion.div>
          {/* Solo mostrar "Gestión de Cliente" si es el coach viendo un cliente */}
          {isViewingClient && clientName && isCoach && (
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={`font-semibold uppercase transition-all duration-300 mt-0.5 ${
                !isHomePage
                  ? (isScrolled ? 'text-[10px] sm:text-xs hidden sm:block' : 'text-xs sm:text-sm')
                  : (isScrolled ? 'text-xs sm:text-sm hidden sm:block' : 'text-xs sm:text-base')
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
                className={`font-semibold uppercase transition-all duration-300 mt-0.5 ${
                  !isHomePage
                    ? (isScrolled ? 'text-[10px] sm:text-xs hidden sm:block' : 'text-xs sm:text-sm')
                    : (isScrolled ? 'text-xs sm:text-sm hidden sm:block' : 'text-sm sm:text-base')
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
                    ? (isScrolled ? 'text-xs sm:text-sm hidden sm:block' : 'text-sm sm:text-base')
                    : (isScrolled ? 'text-sm sm:text-base hidden sm:block' : 'text-base sm:text-lg')
                }`}
              >
                {t('plan.client')}
              </motion.p>
            </>
          )}
        </div>
        
        {/* Columna Derecha: Avatar + Botones de control + Logo */}
        <div className="flex items-center justify-end gap-1 sm:gap-1.5 lg:gap-2">
          {/* Avatar */}
          {user && (
            <div className="relative" ref={menuRef}>
              <motion.button
                onClick={() => setShowUserMenu(!showUserMenu)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full text-white font-bold flex items-center justify-center shadow-lg hover:shadow-xl transition-all overflow-hidden ${
                  (clientProfilePhoto || user.photoURL) 
                    ? '' 
                    : 'bg-gradient-to-br from-primary-600 to-primary-800'
                }`}
                aria-label="Menú de usuario"
                title={user.displayName || user.email || 'Usuario'}
              >
                {(clientProfilePhoto || user.photoURL) ? (
                  <img 
                    src={clientProfilePhoto || user.photoURL || ''} 
                    alt={user.displayName || user.email || 'Usuario'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getUserInitials()
                )}
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
                        {isCoach && (
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
                        )}
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

          {/* Botones de control - Condensados en móvil */}
          <div className="relative" ref={configMenuRef}>
            {/* Botones individuales - Solo en escritorio */}
            <div className="hidden lg:flex items-center gap-1 sm:gap-1.5">
              {/* Botón de cambio de idioma */}
              <button
                onClick={toggleLanguage}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-semibold text-[10px] sm:text-xs"
                aria-label={t('language.toggle')}
                title={t('language.toggle')}
              >
                {language === 'es' ? 'EN' : 'ES'}
              </button>
              {/* Botón de cambio de tema */}
              <button
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label={t('theme.toggle')}
                title={t('theme.toggle')}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Ícono de configuración - Solo en móvil */}
            <button
              onClick={() => setShowConfigMenu(!showConfigMenu)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Configuración"
              title="Configuración"
            >
              <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Menú desplegable de configuración - Solo en móvil */}
            <AnimatePresence>
              {showConfigMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowConfigMenu(false)}
                    className="fixed inset-0 z-40 lg:hidden"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className={`absolute right-0 mt-2 w-48 rounded-xl shadow-2xl z-50 lg:hidden ${
                      theme === 'dark' 
                        ? 'bg-slate-800 border border-slate-700' 
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {/* Opciones del menú */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          toggleLanguage()
                          setShowConfigMenu(false)
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-slate-700 text-slate-300'
                            : 'hover:bg-gray-100 text-gray-700'
                        } flex items-center gap-3`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        {language === 'es' ? 'Cambiar a EN' : 'Cambiar a ES'}
                      </button>
                      <button
                        onClick={() => {
                          toggleTheme()
                          setShowConfigMenu(false)
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-slate-700 text-slate-300'
                            : 'hover:bg-gray-100 text-gray-700'
                        } flex items-center gap-3`}
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
                        {theme === 'dark' ? 'Cambiar a Tema Claro' : 'Cambiar a Tema Oscuro'}
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Logo */}
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
                      ? (isScrolled ? 'w-8 h-8 sm:w-12 sm:h-12' : 'w-10 h-10 sm:w-16 sm:h-16')
                      : (isScrolled ? 'w-10 h-10 sm:w-16 sm:h-16' : 'w-14 h-14 sm:w-20 sm:h-20')
                  }`}
                />
              </motion.button>
            ) : (
              <img 
                src="/favicon.png" 
                alt="Coach Piperubio Logo" 
                className={`object-contain transition-all duration-300 ${
                  !isHomePage
                    ? (isScrolled ? 'w-8 h-8 sm:w-12 sm:h-12' : 'w-10 h-10 sm:w-16 sm:h-16')
                    : (isScrolled ? 'w-10 h-10 sm:w-16 sm:h-16' : 'w-14 h-14 sm:w-20 sm:h-20')
                }`}
              />
            )}
          </motion.div>

          {/* Modal de actualizar perfil */}
          <UpdateProfileModal
            isOpen={showUpdateModal}
            onClose={() => setShowUpdateModal(false)}
            onSuccess={() => {
              // Recargar la página para actualizar los datos del usuario
              window.location.reload()
            }}
          />

          {/* Selector de colores - Solo para el coach */}
          {isCoach && (
            <ColorThemeSelector
              isOpen={showColorSelector}
              onClose={() => setShowColorSelector(false)}
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default TopBanner

