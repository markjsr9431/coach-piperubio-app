import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { db } from '../firebaseConfig'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { compareRMWithOtherClients, comparePRWithOtherClients, ComparisonResult } from '../utils/rmprComparison'
import RMPRComparisonAlert from './RMPRComparisonAlert'

export interface RMRecord {
  id: string
  exercise: string
  weight: string
  implement: string
  date: any // Timestamp de Firestore o Date
}

export interface PRRecord {
  id: string
  exercise: string
  time: string
  implement: string
  date: any // Timestamp de Firestore o Date
}

interface RMAndPRModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  isCoach?: boolean
}

const RMAndPRModal = ({ isOpen, onClose, clientId, isCoach = false }: RMAndPRModalProps) => {
  const { theme } = useTheme()
  const isCurrentUser = !isCoach

  const [rms, setRms] = useState<RMRecord[]>([])
  const [prs, setPrs] = useState<PRRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showRMForm, setShowRMForm] = useState(false)
  const [showPRForm, setShowPRForm] = useState(false)
  const [sendingToCoach, setSendingToCoach] = useState(false)
  const [showComparisonAlert, setShowComparisonAlert] = useState(false)
  const [comparisonData, setComparisonData] = useState<{
    type: 'RM' | 'PR'
    exercise: string
    value: string
    comparisons: ComparisonResult[]
  } | null>(null)
  const [pendingSave, setPendingSave] = useState<(() => Promise<void>) | null>(null)

  const [rmForm, setRmForm] = useState({
    exercise: '',
    weight: '',
    implement: ''
  })

  const [prForm, setPrForm] = useState({
    exercise: '',
    time: '',
    implement: ''
  })

  // Cargar RM y PR desde Firestore
  useEffect(() => {
    if (!isOpen) return
    
    const loadData = async () => {
      if (!clientId) return

      setLoading(true)
      try {
        const dataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
        const dataDoc = await getDoc(dataRef)

        if (dataDoc.exists()) {
          const data = dataDoc.data()
          // Convertir timestamps numéricos a Date si es necesario
          const rmsData = (data.rms || []).map((rm: any) => ({
            ...rm,
            date: rm.date?.toDate ? rm.date.toDate() : (typeof rm.date === 'number' ? new Date(rm.date) : rm.date)
          }))
          const prsData = (data.prs || []).map((pr: any) => ({
            ...pr,
            date: pr.date?.toDate ? pr.date.toDate() : (typeof pr.date === 'number' ? new Date(pr.date) : pr.date)
          }))
          setRms(rmsData)
          setPrs(prsData)
        } else {
          setRms([])
          setPrs([])
        }
      } catch (error) {
        console.error('Error loading RM/PR data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [clientId, isOpen])

  const saveRM = async () => {
    setSaving(true)
    try {
      const dataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
      
      // Obtener datos existentes
      const existingData = await getDoc(dataRef)
      const existingRms = existingData.exists() ? (existingData.data().rms || []) : []
      const existingPrs = existingData.exists() ? (existingData.data().prs || []) : []
      
      // Crear nuevo RM con fecha como número (timestamp)
      // No usar serverTimestamp() dentro del array
      const newRM = {
        id: Date.now().toString(),
        exercise: rmForm.exercise.trim(),
        weight: rmForm.weight.trim(),
        implement: rmForm.implement.trim(),
        date: Date.now() // Usar timestamp numérico en lugar de serverTimestamp()
      }
      
      // Añadir el nuevo RM
      const updatedRms = [...existingRms, newRM]
      
      // Guardar en Firestore - serverTimestamp solo fuera de arrays
      await setDoc(dataRef, {
        rms: updatedRms,
        prs: existingPrs,
        lastUpdated: serverTimestamp()
      }, { merge: true })

      // Actualizar estado local con fecha convertida
      setRms(updatedRms.map((rm: any) => ({
        ...rm,
        date: rm.date?.toDate ? rm.date.toDate() : (typeof rm.date === 'number' ? new Date(rm.date) : new Date())
      })))
      setRmForm({ exercise: '', weight: '', implement: '' })
      setShowRMForm(false)
    } catch (error: any) {
      console.error('Error saving RM:', error)
      alert(`Error al guardar el RM: ${error.message || 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleAddRM = async () => {
    if (!rmForm.exercise || !rmForm.weight || !rmForm.implement) {
      alert('Por favor completa todos los campos')
      return
    }

    // Solo comparar si es un cliente (no el coach)
    if (!isCoach && isCurrentUser) {
      try {
        const comparisons = await compareRMWithOtherClients(clientId, {
          exercise: rmForm.exercise.trim(),
          weight: rmForm.weight.trim(),
          implement: rmForm.implement.trim()
        })

        if (comparisons.length > 0) {
          // Mostrar alerta de comparación
          setComparisonData({
            type: 'RM',
            exercise: rmForm.exercise.trim(),
            value: rmForm.weight.trim(),
            comparisons
          })
          setPendingSave(() => saveRM)
          setShowComparisonAlert(true)
          return
        }
      } catch (error) {
        console.error('Error comparing RM:', error)
        // Continuar con el guardado si hay error en la comparación
      }
    }

    // Si no hay comparaciones o es el coach, guardar directamente
    await saveRM()
  }

  const savePR = async () => {
    setSaving(true)
    try {
      const dataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
      
      // Obtener datos existentes
      const existingData = await getDoc(dataRef)
      const existingRms = existingData.exists() ? (existingData.data().rms || []) : []
      const existingPrs = existingData.exists() ? (existingData.data().prs || []) : []
      
      // Crear nuevo PR con fecha como número (timestamp)
      // No usar serverTimestamp() dentro del array
      const newPR = {
        id: Date.now().toString(),
        exercise: prForm.exercise.trim(),
        time: prForm.time.trim(),
        implement: prForm.implement.trim(),
        date: Date.now() // Usar timestamp numérico en lugar de serverTimestamp()
      }
      
      // Añadir el nuevo PR
      const updatedPrs = [...existingPrs, newPR]
      
      // Guardar en Firestore - serverTimestamp solo fuera de arrays
      await setDoc(dataRef, {
        rms: existingRms,
        prs: updatedPrs,
        lastUpdated: serverTimestamp()
      }, { merge: true })

      // Actualizar estado local con fecha convertida
      setPrs(updatedPrs.map((pr: any) => ({
        ...pr,
        date: pr.date?.toDate ? pr.date.toDate() : (typeof pr.date === 'number' ? new Date(pr.date) : new Date())
      })))
      setPrForm({ exercise: '', time: '', implement: '' })
      setShowPRForm(false)
    } catch (error: any) {
      console.error('Error saving PR:', error)
      alert(`Error al guardar el PR: ${error.message || 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleAddPR = async () => {
    if (!prForm.exercise || !prForm.time || !prForm.implement) {
      alert('Por favor completa todos los campos')
      return
    }

    // Solo comparar si es un cliente (no el coach)
    if (!isCoach && isCurrentUser) {
      try {
        const comparisons = await comparePRWithOtherClients(clientId, {
          exercise: prForm.exercise.trim(),
          time: prForm.time.trim(),
          implement: prForm.implement.trim()
        })

        if (comparisons.length > 0) {
          // Mostrar alerta de comparación
          setComparisonData({
            type: 'PR',
            exercise: prForm.exercise.trim(),
            value: prForm.time.trim(),
            comparisons
          })
          setPendingSave(() => savePR)
          setShowComparisonAlert(true)
          return
        }
      } catch (error) {
        console.error('Error comparing PR:', error)
        // Continuar con el guardado si hay error en la comparación
      }
    }

    // Si no hay comparaciones o es el coach, guardar directamente
    await savePR()
  }

  const handleSendToCoach = async () => {
    setSendingToCoach(true)
    try {
      const dataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
      const dataDoc = await getDoc(dataRef)
      
      const dataToSave: any = {
        sentToCoach: true,
        sentAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      }
      
      if (dataDoc.exists()) {
        const existingData = dataDoc.data()
        dataToSave.rms = existingData.rms || []
        dataToSave.prs = existingData.prs || []
      } else {
        dataToSave.rms = []
        dataToSave.prs = []
      }
      
      await setDoc(dataRef, dataToSave, { merge: true })
      alert('RM y PR enviados al coach exitosamente')
    } catch (error: any) {
      console.error('Error sending to coach:', error)
      alert(`Error al enviar al coach: ${error.message || 'Error desconocido'}`)
    } finally {
      setSendingToCoach(false)
    }
  }

  const formatDate = (date: any) => {
    if (!date) return 'Fecha no disponible'
    if (date.toDate) {
      return date.toDate().toLocaleDateString()
    }
    if (date instanceof Date) {
      return date.toLocaleDateString()
    }
    // Si es un número (timestamp), convertirlo a Date
    if (typeof date === 'number') {
      return new Date(date).toLocaleDateString()
    }
    return 'Fecha no disponible'
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl backdrop-blur-sm ${
            theme === 'dark' 
              ? 'bg-slate-800/90 border border-slate-700/50' 
              : 'bg-white/90 border border-gray-200/50'
          }`}
        >
          {/* Header */}
          <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
          }`}>
            <h2 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              RM y PR
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-slate-700 text-slate-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <>
                {/* RM Section */}
                <div className={`rounded-xl p-6 ${
                  theme === 'dark' 
                    ? 'bg-slate-700/50' 
                    : 'bg-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      RM (Repetición Máxima)
                    </h3>
                    {isCurrentUser && (
                      <button
                        onClick={() => setShowRMForm(!showRMForm)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors text-sm"
                      >
                        {showRMForm ? 'Cancelar' : '+ Añadir RM'}
                      </button>
                    )}
                  </div>

                  {/* Formulario RM */}
                  {showRMForm && isCurrentUser && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 p-4 rounded-lg bg-slate-800/50 dark:bg-gray-200"
                    >
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Ejercicio (ej: Press de banca)"
                          value={rmForm.exercise}
                          onChange={(e) => setRmForm(prev => ({ ...prev, exercise: e.target.value }))}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="Peso (ej: 100kg)"
                          value={rmForm.weight}
                          onChange={(e) => setRmForm(prev => ({ ...prev, weight: e.target.value }))}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="Implemento (ej: Barra olímpica)"
                          value={rmForm.implement}
                          onChange={(e) => setRmForm(prev => ({ ...prev, implement: e.target.value }))}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                        <button
                          onClick={handleAddRM}
                          disabled={saving}
                          className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Guardando...' : 'Guardar RM'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Lista de RMs */}
                  {rms.length === 0 ? (
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      No hay registros de RM aún
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {rms.map((rm) => (
                        <div
                          key={rm.id}
                          className={`p-3 rounded-lg ${
                            theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'
                          }`}
                        >
                          <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {rm.exercise}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                            {rm.weight} - {rm.implement}
                          </p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                            {formatDate(rm.date)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PR Section */}
                <div className={`rounded-xl p-6 ${
                  theme === 'dark' 
                    ? 'bg-slate-700/50' 
                    : 'bg-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-xl font-bold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      PR (Récord Personal)
                    </h3>
                    {isCurrentUser && (
                      <button
                        onClick={() => setShowPRForm(!showPRForm)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors text-sm"
                      >
                        {showPRForm ? 'Cancelar' : '+ Añadir PR'}
                      </button>
                    )}
                  </div>

                  {/* Formulario PR */}
                  {showPRForm && isCurrentUser && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 p-4 rounded-lg bg-slate-800/50 dark:bg-gray-200"
                    >
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Ejercicio (ej: 5km carrera)"
                          value={prForm.exercise}
                          onChange={(e) => setPrForm(prev => ({ ...prev, exercise: e.target.value }))}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="Tiempo (ej: 25:30)"
                          value={prForm.time}
                          onChange={(e) => setPrForm(prev => ({ ...prev, time: e.target.value }))}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="Implemento (ej: Peso corporal)"
                          value={prForm.implement}
                          onChange={(e) => setPrForm(prev => ({ ...prev, implement: e.target.value }))}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                        <button
                          onClick={handleAddPR}
                          disabled={saving}
                          className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Guardando...' : 'Guardar PR'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Lista de PRs */}
                  {prs.length === 0 ? (
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                      No hay registros de PR aún
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {prs.map((pr) => (
                        <div
                          key={pr.id}
                          className={`p-3 rounded-lg ${
                            theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'
                          }`}
                        >
                          <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {pr.exercise}
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                            {pr.time} - {pr.implement}
                          </p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                            {formatDate(pr.date)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botón para enviar al coach */}
                {isCurrentUser && (rms.length > 0 || prs.length > 0) && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleSendToCoach}
                      disabled={sendingToCoach}
                      className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {sendingToCoach ? 'Enviando...' : 'Enviar RM y PR Actualizado al Coach'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Alerta de comparación RM/PR */}
      {comparisonData && (
        <RMPRComparisonAlert
          isOpen={showComparisonAlert}
          type={comparisonData.type}
          exercise={comparisonData.exercise}
          value={comparisonData.value}
          comparisons={comparisonData.comparisons}
          onConfirm={async () => {
            setShowComparisonAlert(false)
            if (pendingSave) {
              await pendingSave()
              setPendingSave(null)
              setComparisonData(null)
            }
          }}
          onCancel={() => {
            setShowComparisonAlert(false)
            setPendingSave(null)
            setComparisonData(null)
          }}
        />
      )}
    </AnimatePresence>
  )
}

export default RMAndPRModal

