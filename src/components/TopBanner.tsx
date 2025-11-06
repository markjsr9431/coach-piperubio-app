import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'

const TopBanner = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { t, toggleLanguage, language } = useLanguage()
  const [isScrolled, setIsScrolled] = useState(false)
  const isHomePage = location.pathname === '/'

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
            onClick={() => navigate('/')}
            className="flex-shrink-0 p-2 sm:p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors mr-2 sm:mr-0"
            aria-label="Volver al inicio"
            title="Volver al inicio"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <div className={`${!isHomePage ? 'flex-1' : 'flex-1'} text-center sm:text-left transition-all duration-300 ${
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
            {t('plan.title')}
          </motion.h2>
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
            SARAH FIGUEROA
          </motion.p>
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
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
            className="flex-shrink-0"
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
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

export default TopBanner

