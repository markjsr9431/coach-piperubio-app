import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { exerciseCategories, searchExercises } from '../data/exercises'
import TopBanner from '../components/TopBanner'

const ExercisesPage = () => {
  const { theme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const filteredExercises = useMemo(() => {
    return searchExercises(searchQuery, selectedCategory || undefined)
  }, [searchQuery, selectedCategory])

  return (
    <div className={`min-h-screen bg-gradient-to-br ${
      theme === 'dark' 
        ? 'from-slate-900 via-slate-800 to-slate-900' 
        : 'from-gray-50 via-gray-100 to-gray-200'
    }`}>
      {/* Banner Superior Persistente */}
      <TopBanner />
      
      {/* Espacio para el banner fijo */}
      <div className="h-40 sm:h-48"></div>

      {/* Contenido Principal */}
      <div className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className={`text-5xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Base de Datos de Ejercicios
            </h1>
            <p className={`text-xl ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Explora todos los ejercicios disponibles por categoría
            </p>
          </div>

          {/* Search and Filters */}
          <div className={`mb-8 p-6 rounded-xl ${
            theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/50'
          }`}>
            {/* Search Bar */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ejercicio..."
                className={`w-full px-4 py-3 pl-12 rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
              <svg
                className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  selectedCategory === ''
                    ? 'bg-primary-600 text-white'
                    : theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              {exerciseCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : theme === 'dark'
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise List */}
          <div className="mb-4">
            <p className={`text-sm ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
            }`}>
              {filteredExercises.length} ejercicio(s) encontrado(s)
            </p>
          </div>

          {filteredExercises.length === 0 ? (
            <div className={`text-center py-12 rounded-xl ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/50'
            }`}>
              <p className={`text-xl ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
              }`}>
                No se encontraron ejercicios
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExercises.map((exercise) => (
                <motion.div
                  key={exercise.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className={`rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all ${
                    theme === 'dark' ? 'bg-slate-800/80 border border-slate-700' : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <h3 className={`font-bold text-xl mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {exercise.name}
                      </h3>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        theme === 'dark' 
                          ? 'bg-primary-500/20 text-primary-300' 
                          : 'bg-primary-100 text-primary-700'
                      }`}>
                        {exercise.category}
                      </span>
                    </div>
                    {exercise.video && (
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {exercise.description && (
                    <p className={`text-sm mb-3 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      {exercise.description}
                    </p>
                  )}

                  {exercise.video && (
                    <a
                      href={exercise.video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
                        theme === 'dark'
                          ? 'text-primary-400 hover:text-primary-300'
                          : 'text-primary-600 hover:text-primary-700'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Ver video
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default ExercisesPage

