import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { exerciseCategories, searchExercises, ExerciseData } from '../data/exercises'
import { db } from '../firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
import TopBanner from '../components/TopBanner'
import AddExerciseModal from '../components/AddExerciseModal'
import EditExerciseModal from '../components/EditExerciseModal'

const ExercisesPage = () => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseData | null>(null)
  const [exercises, setExercises] = useState<ExerciseData[]>([])

  const isCoach = user?.email?.toLowerCase() === 'piperubiocoach@gmail.com'

  // Cargar ejercicios desde Firestore y combinar con ejercicios estáticos
  useEffect(() => {
    const loadExercises = async () => {
      try {
        // Cargar ejercicios de Firestore
        const exercisesRef = collection(db, 'exercises')
        const snapshot = await getDocs(exercisesRef)
        const firestoreExercises: ExerciseData[] = []
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          firestoreExercises.push({
            id: `firestore-${doc.id}`, // Prefijo para identificar ejercicios de Firestore
            name: data.name || '',
            category: data.category || '',
            description: data.description || '',
            video: data.video || ''
          })
        })

        // Combinar con ejercicios estáticos (evitar duplicados por nombre)
        const staticExercises = searchExercises('', undefined)
        const allExercises = [...staticExercises]
        
        // Añadir ejercicios de Firestore que no estén en los estáticos
        firestoreExercises.forEach((firestoreExercise) => {
          if (!allExercises.find(e => e.name.toLowerCase() === firestoreExercise.name.toLowerCase())) {
            allExercises.push(firestoreExercise)
          }
        })

        setExercises(allExercises)
      } catch (error) {
        console.error('Error loading exercises:', error)
        // Si falla, usar solo ejercicios estáticos
        setExercises(searchExercises('', undefined))
      }
    }

    loadExercises()
  }, [])

  const handleExerciseAdded = () => {
    // Recargar ejercicios
    const loadExercises = async () => {
      try {
        const exercisesRef = collection(db, 'exercises')
        const snapshot = await getDocs(exercisesRef)
        const firestoreExercises: ExerciseData[] = []
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          firestoreExercises.push({
            id: `firestore-${doc.id}`, // Prefijo para identificar ejercicios de Firestore
            name: data.name || '',
            category: data.category || '',
            description: data.description || '',
            video: data.video || ''
          })
        })

        const staticExercises = searchExercises('', undefined)
        const allExercises = [...staticExercises]
        
        firestoreExercises.forEach((firestoreExercise) => {
          if (!allExercises.find(e => e.name.toLowerCase() === firestoreExercise.name.toLowerCase())) {
            allExercises.push(firestoreExercise)
          }
        })

        setExercises(allExercises)
      } catch (error) {
        console.error('Error reloading exercises:', error)
      }
    }
    loadExercises()
  }

  const filteredExercises = useMemo(() => {
    let filtered = exercises

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(query) ||
        exercise.description?.toLowerCase().includes(query)
      )
    }

    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter(exercise => exercise.category === selectedCategory)
    }

    // Aplicar ordenamiento alfabético si está activo
    if (sortOrder !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        const nameA = a.name.toLowerCase()
        const nameB = b.name.toLowerCase()
        if (sortOrder === 'asc') {
          return nameA.localeCompare(nameB, 'es')
        } else {
          return nameB.localeCompare(nameA, 'es')
        }
      })
    }

    return filtered
  }, [exercises, searchQuery, selectedCategory, sortOrder])

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
            <p className={`text-xl mb-6 ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
            }`}>
              Explora todos los ejercicios disponibles por categoría
            </p>
            
            {/* Botón Añadir Ejercicio - Solo para coach */}
            {isCoach && (
              <motion.button
                onClick={() => setShowAddModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-primary-600 to-primary-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 flex items-center gap-2 font-semibold mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Añadir Ejercicio
              </motion.button>
            )}
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

            {/* Category Filter and Sort */}
            <div className="flex flex-wrap gap-2 items-center mb-2">
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
              <div className={`ml-auto flex items-center gap-2 px-3 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'
              }`}>
                <span className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Ordenar:
                </span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc' | 'none')}
                  className={`text-sm rounded px-2 py-1 border transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-600 border-slate-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                >
                  <option value="none">Sin ordenar</option>
                  <option value="asc">A-Z</option>
                  <option value="desc">Z-A</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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
                  <div className="mb-3">
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
                  
                  {exercise.description && (
                    <p className={`text-sm mb-3 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      {exercise.description}
                    </p>
                  )}

                  {/* Botón de editar - Solo para coach, visible en todos los ejercicios */}
                  {isCoach && (
                    <button
                      onClick={() => {
                        // Permitir editar todos los ejercicios (estáticos y de Firestore)
                        setSelectedExercise(exercise)
                        setShowEditModal(true)
                      }}
                      className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
                        theme === 'dark'
                          ? 'text-primary-400 hover:text-primary-300'
                          : 'text-primary-600 hover:text-primary-700'
                      }`}
                      title="Editar ejercicio"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal para añadir ejercicio */}
      <AddExerciseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleExerciseAdded}
      />

      {/* Modal para editar ejercicio */}
      <EditExerciseModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedExercise(null)
        }}
        onSuccess={handleExerciseAdded}
        exercise={selectedExercise}
      />
    </div>
  )
}

export default ExercisesPage

