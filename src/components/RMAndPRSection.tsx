import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { db } from '../firebaseConfig'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

export interface RMRecord {
  id: string
  exercise: string
  weight: string
  implement: string
  date: Date
}

export interface PRRecord {
  id: string
  exercise: string
  time: string
  implement: string
  date: Date
}

interface RMAndPRSectionProps {
  clientId: string
  isCoach?: boolean
}

const RMAndPRSection = ({ clientId, isCoach = false }: RMAndPRSectionProps) => {
  const { theme } = useTheme()
  const isCurrentUser = !isCoach

  const [rms, setRms] = useState<RMRecord[]>([])
  const [prs, setPrs] = useState<PRRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showRMForm, setShowRMForm] = useState(false)
  const [showPRForm, setShowPRForm] = useState(false)
  const [sendingToCoach, setSendingToCoach] = useState(false)

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
    const loadData = async () => {
      if (!clientId) return

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
        }
      } catch (error) {
        console.error('Error loading RM/PR data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [clientId])

  const handleAddRM = async () => {
    if (!rmForm.exercise || !rmForm.weight || !rmForm.implement) {
      alert('Por favor completa todos los campos')
      return
    }

    setSaving(true)
    try {
      const newRM: RMRecord = {
        id: Date.now().toString(),
        exercise: rmForm.exercise,
        weight: rmForm.weight,
        implement: rmForm.implement,
        date: new Date()
      }

      const dataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
      
      // Obtener datos existentes
      const existingData = await getDoc(dataRef)
      const existingRms = existingData.exists() ? (existingData.data().rms || []) : []
      const existingPrs = existingData.exists() ? (existingData.data().prs || []) : []
      
      // Crear nuevo RM con fecha como número (timestamp)
      // No usar serverTimestamp() dentro del array
      const newRMToSave = {
        id: newRM.id,
        exercise: newRM.exercise,
        weight: newRM.weight,
        implement: newRM.implement,
        date: Date.now() // Usar timestamp numérico en lugar de serverTimestamp()
      }
      
      // Añadir el nuevo RM
      const updatedRms = [...existingRms, newRMToSave]
      
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
    } catch (error) {
      console.error('Error saving RM:', error)
      alert('Error al guardar el RM')
    } finally {
      setSaving(false)
    }
  }

  const handleAddPR = async () => {
    if (!prForm.exercise || !prForm.time || !prForm.implement) {
      alert('Por favor completa todos los campos')
      return
    }

    setSaving(true)
    try {
      const newPR: PRRecord = {
        id: Date.now().toString(),
        exercise: prForm.exercise,
        time: prForm.time,
        implement: prForm.implement,
        date: new Date()
      }

      const dataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
      
      // Obtener datos existentes
      const existingData = await getDoc(dataRef)
      const existingRms = existingData.exists() ? (existingData.data().rms || []) : []
      const existingPrs = existingData.exists() ? (existingData.data().prs || []) : []
      
      // Crear nuevo PR con fecha como número (timestamp)
      // No usar serverTimestamp() dentro del array
      const newPRToSave = {
        id: newPR.id,
        exercise: newPR.exercise,
        time: newPR.time,
        implement: newPR.implement,
        date: Date.now() // Usar timestamp numérico en lugar de serverTimestamp()
      }
      
      // Añadir el nuevo PR
      const updatedPrs = [...existingPrs, newPRToSave]
      
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
    } catch (error) {
      console.error('Error saving PR:', error)
      alert('Error al guardar el PR')
    } finally {
      setSaving(false)
    }
  }

  const handleSendToCoach = async () => {
    setSendingToCoach(true)
    try {
      // Asegurarse de que el documento existe primero
      const dataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
      const dataDoc = await getDoc(dataRef)
      
      // Preparar datos para guardar manteniendo RM y PR existentes
      const dataToSave: any = {
        sentToCoach: true,
        sentAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      }
      
      // Si el documento existe, mantener los datos existentes tal como están
      if (dataDoc.exists()) {
        const existingData = dataDoc.data()
        if (existingData.rms) {
          dataToSave.rms = existingData.rms
        }
        if (existingData.prs) {
          dataToSave.prs = existingData.prs
        }
      } else {
        // Si no existe, obtener los datos actuales del estado (que ya tienen Timestamps)
        const currentDataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
        const currentDataDoc = await getDoc(currentDataRef)
        if (currentDataDoc.exists()) {
          const currentData = currentDataDoc.data()
          dataToSave.rms = currentData.rms || []
          dataToSave.prs = currentData.prs || []
        } else {
          // Si realmente no hay datos, crear arrays vacíos
          dataToSave.rms = []
          dataToSave.prs = []
        }
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

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* RM Section */}
      <div className={`rounded-xl p-6 shadow-lg ${
        theme === 'dark' 
          ? 'bg-slate-800/50 backdrop-blur-sm' 
          : 'bg-white/80 backdrop-blur-sm'
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
            className="mb-4 p-4 rounded-lg bg-slate-700/30 dark:bg-gray-100"
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
                  theme === 'dark' ? 'bg-slate-700/30' : 'bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {rm.exercise}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      {rm.weight} - {rm.implement}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      {(() => {
                        if (!rm.date) return 'Fecha no disponible'
                        if (rm.date && typeof rm.date === 'object' && 'toDate' in rm.date) {
                          return (rm.date as any).toDate().toLocaleDateString()
                        }
                        if (rm.date instanceof Date) {
                          return rm.date.toLocaleDateString()
                        }
                        if (typeof rm.date === 'number') {
                          return new Date(rm.date).toLocaleDateString()
                        }
                        return 'Fecha no disponible'
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PR Section */}
      <div className={`rounded-xl p-6 shadow-lg ${
        theme === 'dark' 
          ? 'bg-slate-800/50 backdrop-blur-sm' 
          : 'bg-white/80 backdrop-blur-sm'
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
            className="mb-4 p-4 rounded-lg bg-slate-700/30 dark:bg-gray-100"
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
                  theme === 'dark' ? 'bg-slate-700/30' : 'bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {pr.exercise}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      {pr.time} - {pr.implement}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      {(() => {
                        if (!pr.date) return 'Fecha no disponible'
                        if (pr.date && typeof pr.date === 'object' && 'toDate' in pr.date) {
                          return (pr.date as any).toDate().toLocaleDateString()
                        }
                        if (pr.date instanceof Date) {
                          return pr.date.toLocaleDateString()
                        }
                        if (typeof pr.date === 'number') {
                          return new Date(pr.date).toLocaleDateString()
                        }
                        return 'Fecha no disponible'
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón para enviar al coach */}
      {isCurrentUser && (rms.length > 0 || prs.length > 0) && (
        <div className="flex justify-center">
          <button
            onClick={handleSendToCoach}
            disabled={sendingToCoach}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {sendingToCoach ? 'Enviando...' : 'Enviar RM y PR Actualizado al Coach'}
          </button>
        </div>
      )}
    </div>
  )
}

export default RMAndPRSection

