import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | '3months' | 'year'>('all')
  const [showRMForm, setShowRMForm] = useState(false)
  const [showPRForm, setShowPRForm] = useState(false)
  const [editingRMId, setEditingRMId] = useState<string | null>(null)
  const [editingPRId, setEditingPRId] = useState<string | null>(null)
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

  // Función helper para verificar si ya existe un registro para hoy
  const hasRecordForToday = (records: RMRecord[] | PRRecord[]): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return records.some(record => {
      let recordDate: Date
      if (record.date instanceof Date) {
        recordDate = new Date(record.date)
      } else if (typeof record.date === 'number') {
        recordDate = new Date(record.date)
      } else {
        return false
      }
      recordDate.setHours(0, 0, 0, 0)
      return recordDate.getTime() === today.getTime()
    })
  }

  const saveRM = async () => {
    setSaving(true)
    try {
      const dataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
      
      // Obtener datos existentes
      const existingData = await getDoc(dataRef)
      const existingRms = existingData.exists() ? (existingData.data().rms || []) : []
      const existingPrs = existingData.exists() ? (existingData.data().prs || []) : []
      
      // Convertir a formato Date para verificación
      const rmsWithDates = existingRms.map((rm: any) => ({
        ...rm,
        date: rm.date?.toDate ? rm.date.toDate() : (typeof rm.date === 'number' ? new Date(rm.date) : new Date())
      }))
      
      // Verificar límite diario solo si NO es el coach (es decir, es el cliente)
      if (!isCoach && hasRecordForToday(rmsWithDates)) {
        alert('Ya has registrado un RM hoy. Solo puedes registrar uno por día.')
        setSaving(false)
        return
      }

      const newRM: RMRecord = {
        id: Date.now().toString(),
        exercise: rmForm.exercise,
        weight: rmForm.weight,
        implement: rmForm.implement,
        date: new Date()
      }
      
      // Crear nuevo RM con fecha como número (timestamp)
      // No usar serverTimestamp() dentro del array
      const newRMToSave = {
        id: newRM.id,
        exercise: newRM.exercise,
        weight: newRM.weight,
        implement: newRM.implement,
        date: Date.now() // Usar timestamp numérico en lugar de serverTimestamp()
      }
      
      // Actualizar o añadir el RM
      let updatedRms: any[]
      if (editingRMId) {
        // Actualizar RM existente
        updatedRms = existingRms.map((rm: any) => 
          rm.id === editingRMId ? newRMToSave : rm
        )
        setEditingRMId(null)
      } else {
        // Añadir nuevo RM
        updatedRms = [...existingRms, newRMToSave]
      }
      
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
      setEditingRMId(null)
    } catch (error) {
      console.error('Error saving RM:', error)
      alert('Error al guardar el RM')
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

  const handleDeleteRM = async (rmId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este RM?')) return

    try {
      const dataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
      const existingData = await getDoc(dataRef)
      const existingRms = existingData.exists() ? (existingData.data().rms || []) : []
      const existingPrs = existingData.exists() ? (existingData.data().prs || []) : []
      
      const updatedRms = existingRms.filter((rm: any) => rm.id !== rmId)
      
      await setDoc(dataRef, {
        rms: updatedRms,
        prs: existingPrs,
        lastUpdated: serverTimestamp()
      }, { merge: true })
      
      setRms(updatedRms.map((rm: any) => ({
        ...rm,
        date: rm.date?.toDate ? rm.date.toDate() : (typeof rm.date === 'number' ? new Date(rm.date) : new Date())
      })))
    } catch (error) {
      console.error('Error deleting RM:', error)
      alert('Error al eliminar el RM')
    }
  }

  const handleDeletePR = async (prId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este PR?')) return

    try {
      const dataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
      const existingData = await getDoc(dataRef)
      const existingRms = existingData.exists() ? (existingData.data().rms || []) : []
      const existingPrs = existingData.exists() ? (existingData.data().prs || []) : []
      
      const updatedPrs = existingPrs.filter((pr: any) => pr.id !== prId)
      
      await setDoc(dataRef, {
        rms: existingRms,
        prs: updatedPrs,
        lastUpdated: serverTimestamp()
      }, { merge: true })
      
      setPrs(updatedPrs.map((pr: any) => ({
        ...pr,
        date: pr.date?.toDate ? pr.date.toDate() : (typeof pr.date === 'number' ? new Date(pr.date) : new Date())
      })))
    } catch (error) {
      console.error('Error deleting PR:', error)
      alert('Error al eliminar el PR')
    }
  }

  const savePR = async () => {
    setSaving(true)
    try {
      const dataRef = doc(db, 'clients', clientId, 'records', 'rm_pr')
      
      // Obtener datos existentes
      const existingData = await getDoc(dataRef)
      const existingRms = existingData.exists() ? (existingData.data().rms || []) : []
      const existingPrs = existingData.exists() ? (existingData.data().prs || []) : []
      
      // Convertir a formato Date para verificación
      const prsWithDates = existingPrs.map((pr: any) => ({
        ...pr,
        date: pr.date?.toDate ? pr.date.toDate() : (typeof pr.date === 'number' ? new Date(pr.date) : new Date())
      }))
      
      // Verificar límite diario solo si NO es el coach (es decir, es el cliente)
      if (!isCoach && hasRecordForToday(prsWithDates)) {
        alert('Ya has registrado un PR hoy. Solo puedes registrar uno por día.')
        setSaving(false)
        return
      }

      const newPR: PRRecord = {
        id: Date.now().toString(),
        exercise: prForm.exercise,
        time: prForm.time,
        implement: prForm.implement,
        date: new Date()
      }
      
      // Crear nuevo PR con fecha como número (timestamp)
      // No usar serverTimestamp() dentro del array
      const newPRToSave = {
        id: newPR.id,
        exercise: newPR.exercise,
        time: newPR.time,
        implement: newPR.implement,
        date: Date.now() // Usar timestamp numérico en lugar de serverTimestamp()
      }
      
      // Actualizar o añadir el PR
      let updatedPrs: any[]
      if (editingPRId) {
        // Actualizar PR existente
        updatedPrs = existingPrs.map((pr: any) => 
          pr.id === editingPRId ? newPRToSave : pr
        )
        setEditingPRId(null)
      } else {
        // Añadir nuevo PR
        updatedPrs = [...existingPrs, newPRToSave]
      }
      
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
      setEditingPRId(null)
    } catch (error) {
      console.error('Error saving PR:', error)
      alert('Error al guardar el PR')
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

  // Función para filtrar registros por fecha
  const filterByDate = (records: RMRecord[] | PRRecord[]): (RMRecord[] | PRRecord[]) => {
    if (dateFilter === 'all') return records
    
    const now = new Date()
    const cutoffDate = new Date()
    
    switch (dateFilter) {
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case '3months':
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        return records
    }
    
    return records.filter(record => {
      let recordDate: Date
      if (record.date instanceof Date) {
        recordDate = new Date(record.date)
      } else if (typeof record.date === 'number') {
        recordDate = new Date(record.date)
      } else if (record.date && typeof record.date === 'object' && 'toDate' in record.date) {
        recordDate = (record.date as any).toDate()
      } else {
        return false
      }
      return recordDate >= cutoffDate
    })
  }

  const filteredRMs = filterByDate(rms) as RMRecord[]
  const filteredPRs = filterByDate(prs) as PRRecord[]

  return (
    <div className="space-y-6">
      {/* Filtro por fecha */}
      <div className={`rounded-xl p-4 shadow-lg ${
        theme === 'dark' 
          ? 'bg-slate-800/50 backdrop-blur-sm' 
          : 'bg-white/80 backdrop-blur-sm'
      }`}>
        <div className="flex items-center gap-4 flex-wrap">
          <label className={`text-sm font-semibold ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
          }`}>
            Filtrar por fecha:
          </label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as 'all' | 'month' | '3months' | 'year')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              theme === 'dark'
                ? 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'
                : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            <option value="all">Todo</option>
            <option value="month">Último mes</option>
            <option value="3months">Últimos 3 meses</option>
            <option value="year">Último año</option>
          </select>
        </div>
      </div>

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
            RM (Repetición Máxima) {filteredRMs.length !== rms.length && `(${filteredRMs.length} de ${rms.length})`}
          </h3>
          {isCurrentUser && (
            <button
              onClick={() => {
                if (showRMForm) {
                  setShowRMForm(false)
                  setEditingRMId(null)
                  setRmForm({ exercise: '', weight: '', implement: '' })
                } else {
                  setShowRMForm(true)
                }
              }}
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
                disabled={saving || (!isCoach && !editingRMId && hasRecordForToday(rms))}
                className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : editingRMId ? 'Actualizar RM' : (!isCoach && hasRecordForToday(rms) ? 'Ya registraste un RM hoy' : 'Guardar RM')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Lista de RMs */}
        {filteredRMs.length === 0 ? (
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            {rms.length === 0 ? 'No hay registros de RM aún' : 'No hay registros de RM en el período seleccionado'}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredRMs.map((rm) => (
              <div
                key={rm.id}
                className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700/30' : 'bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
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
                  {isCoach && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setRmForm({
                            exercise: rm.exercise,
                            weight: rm.weight,
                            implement: rm.implement
                          })
                          setEditingRMId(rm.id)
                          setShowRMForm(true)
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'text-yellow-400 hover:bg-slate-700'
                            : 'text-yellow-600 hover:bg-gray-200'
                        }`}
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteRM(rm.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'text-red-400 hover:bg-slate-700'
                            : 'text-red-600 hover:bg-gray-200'
                        }`}
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
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
            PR (Récord Personal) {filteredPRs.length !== prs.length && `(${filteredPRs.length} de ${prs.length})`}
          </h3>
          {isCurrentUser && (
            <button
              onClick={() => {
                if (showPRForm) {
                  setShowPRForm(false)
                  setEditingPRId(null)
                  setPrForm({ exercise: '', time: '', implement: '' })
                } else {
                  setShowPRForm(true)
                }
              }}
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
                disabled={saving || (!isCoach && !editingPRId && hasRecordForToday(prs))}
                className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : editingPRId ? 'Actualizar PR' : (!isCoach && hasRecordForToday(prs) ? 'Ya registraste un PR hoy' : 'Guardar PR')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Lista de PRs */}
        {filteredPRs.length === 0 ? (
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            {prs.length === 0 ? 'No hay registros de PR aún' : 'No hay registros de PR en el período seleccionado'}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredPRs.map((pr) => (
              <div
                key={pr.id}
                className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-slate-700/30' : 'bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
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
                  {isCoach && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setPrForm({
                            exercise: pr.exercise,
                            time: pr.time,
                            implement: pr.implement
                          })
                          setEditingPRId(pr.id)
                          setShowPRForm(true)
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'text-yellow-400 hover:bg-slate-700'
                            : 'text-yellow-600 hover:bg-gray-200'
                        }`}
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeletePR(pr.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'text-red-400 hover:bg-slate-700'
                            : 'text-red-600 hover:bg-gray-200'
                        }`}
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
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
    </div>
  )
}

export default RMAndPRSection

