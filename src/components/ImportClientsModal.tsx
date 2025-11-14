import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../firebaseConfig'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

interface ImportClientsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface CSVRow {
  cedula: string
  nombreCompleto: string
  apellido: string
  celular: string
}

const ImportClientsModal = ({ isOpen, onClose, onSuccess }: ImportClientsModalProps) => {
  const { theme } = useTheme()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [preview, setPreview] = useState<CSVRow[]>([])
  const [processed, setProcessed] = useState(0)
  const [total, setTotal] = useState(0)

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []

    // Saltar la primera línea si es encabezado
    const startIndex = lines[0].toLowerCase().includes('cédula') || lines[0].toLowerCase().includes('cedula') ? 1 : 0
    
    return lines.slice(startIndex).map(line => {
      // Dividir por comas, pero manejar comillas
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      
      if (values.length < 4) {
        throw new Error(`Línea inválida: ${line}. Se esperan 4 columnas: cédula, nombre completo, apellido, celular`)
      }

      return {
        cedula: values[0] || '',
        nombreCompleto: values[1] || '',
        apellido: values[2] || '',
        celular: values[3] || ''
      }
    }).filter(row => row.cedula && row.nombreCompleto) // Filtrar filas vacías
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Por favor selecciona un archivo CSV')
      return
    }

    setFile(selectedFile)
    setError(null)
    setSuccess(null)

    try {
      const text = await selectedFile.text()
      const parsed = parseCSV(text)
      setPreview(parsed)
      setTotal(parsed.length)
    } catch (err: any) {
      setError(err.message || 'Error al leer el archivo CSV')
      setFile(null)
      setPreview([])
    }
  }

  const generateEmail = (nombreCompleto: string, apellido: string, cedula: string): string => {
    // Crear email único basado en nombre y cédula
    const nombreLimpio = nombreCompleto.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.')
      .substring(0, 15)
    const apellidoLimpio = apellido.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.')
      .substring(0, 10)
    const cedulaLimpia = cedula.replace(/\D/g, '').substring(0, 4)
    return `${nombreLimpio}.${apellidoLimpio}${cedulaLimpia}@temporal.com`
  }

  const generatePassword = (): string => {
    return Math.random().toString(36).slice(-12) + 
           Math.random().toString(36).slice(-12).toUpperCase() + '123!'
  }

  const handleImport = async () => {
    if (!file || preview.length === 0) {
      setError('Por favor selecciona un archivo CSV válido')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setProcessed(0)

    const adminEmail = auth.currentUser?.email
    if (!adminEmail) {
      setError('No hay un usuario admin autenticado')
      setLoading(false)
      return
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Guardar credenciales del coach antes de crear clientes
    const coachEmail = auth.currentUser?.email
    const coachPassword = sessionStorage.getItem('coach_password_temp')
    
    if (!coachEmail) {
      setError('No se pudo obtener la sesión del coach')
      setLoading(false)
      return
    }

    try {
      for (let i = 0; i < preview.length; i++) {
        const row = preview[i]
        try {
          const email = generateEmail(row.nombreCompleto, row.apellido, row.cedula)
          const password = generatePassword()
          const fullName = `${row.nombreCompleto} ${row.apellido}`.trim()

          // Crear usuario directamente
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            email.toLowerCase(),
            password
          )

          const createdClientId = userCredential.user.uid

          // Guardar información del cliente en Firestore
          await setDoc(doc(db, 'clients', createdClientId), {
            name: fullName,
            email: email.toLowerCase(),
            phone: row.celular || '',
            plan: 'Plan Mensual - Nivel 2',
            status: 'active',
            createdAt: serverTimestamp(),
            role: 'client',
            createdBy: coachEmail
          })

          successCount++
        } catch (err: any) {
          errorCount++
          if (err.code === 'auth/email-already-in-use') {
            errors.push(`${row.nombreCompleto}: Email ya está registrado`)
          } else {
            errors.push(`${row.nombreCompleto}: ${err.message || 'Error desconocido'}`)
          }
        }

        setProcessed(i + 1)

        // Pequeña pausa para no sobrecargar
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Restaurar sesión del coach después de crear todos los clientes
      if (coachPassword) {
        await signInWithEmailAndPassword(auth, coachEmail, coachPassword)
      }

      if (successCount > 0) {
        setSuccess(`Se importaron ${successCount} cliente(s) exitosamente${errorCount > 0 ? `. ${errorCount} error(es).` : '.'}`)
        if (errors.length > 0) {
          console.error('Errores durante la importación:', errors)
        }
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 5000)
      } else {
        setError(`No se pudo importar ningún cliente. Errores: ${errors.join(', ')}`)
      }
    } catch (err: any) {
      setError(err.message || 'Error durante la importación')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview([])
    setError(null)
    setSuccess(null)
    setProcessed(0)
    setTotal(0)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100]"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl backdrop-blur-sm ${
              theme === 'dark' 
                ? 'bg-slate-800/90 border border-slate-700/50' 
                : 'bg-white/90 border border-gray-200/50'
            } max-h-[90vh] flex flex-col`}>
              {/* Header */}
              <div className={`p-6 border-b ${
                theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
              } flex items-center justify-between`}>
                <h2 className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Importar Clientes desde CSV
                </h2>
                <button
                  onClick={handleClose}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 text-sm">
                    {success}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      Seleccionar archivo CSV
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-slate-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      disabled={loading}
                    />
                    <p className={`text-xs mt-2 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                    }`}>
                      Formato esperado: cédula, nombre completo, apellido, número de celular
                    </p>
                  </div>

                  {preview.length > 0 && (
                    <div>
                      <h3 className={`text-lg font-semibold mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Vista previa ({preview.length} cliente(s))
                      </h3>
                      <div className={`max-h-60 overflow-y-auto rounded-lg border ${
                        theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
                      }`}>
                        <table className="w-full text-sm">
                          <thead className={`${
                            theme === 'dark' ? 'bg-slate-700' : 'bg-gray-100'
                          } sticky top-0`}>
                            <tr>
                              <th className={`px-3 py-2 text-left font-semibold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>Cédula</th>
                              <th className={`px-3 py-2 text-left font-semibold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>Nombre</th>
                              <th className={`px-3 py-2 text-left font-semibold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>Apellido</th>
                              <th className={`px-3 py-2 text-left font-semibold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>Celular</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.slice(0, 10).map((row, index) => (
                              <tr key={index} className={`border-t ${
                                theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
                              }`}>
                                <td className={`px-3 py-2 ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                }`}>{row.cedula}</td>
                                <td className={`px-3 py-2 ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                }`}>{row.nombreCompleto}</td>
                                <td className={`px-3 py-2 ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                }`}>{row.apellido}</td>
                                <td className={`px-3 py-2 ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                                }`}>{row.celular}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {preview.length > 10 && (
                          <p className={`text-xs p-2 text-center ${
                            theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                          }`}>
                            ... y {preview.length - 10} más
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <p className={`mt-2 text-sm ${
                        theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                      }`}>
                        Procesando {processed} de {total}...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className={`p-6 border-t ${
                theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
              } flex items-center justify-end gap-3`}>
                <button
                  onClick={handleClose}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    theme === 'dark'
                      ? 'bg-slate-700 hover:bg-slate-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || preview.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Importando...' : 'Importar Clientes'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ImportClientsModal

