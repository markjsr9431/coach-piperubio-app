import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { auth } from "../firebaseConfig"

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showTerms, setShowTerms] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await signInWithEmailAndPassword(auth, email, password)
      
      // Guardar contraseña temporalmente para restaurar sesión después de crear clientes
      if (email.toLowerCase() === 'piperubiocoach@gmail.com' || email.toLowerCase() === 'sebassennin@gmail.com') {
        sessionStorage.setItem('coach_password_temp', password)
      }
      
      navigate("/home")
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error)
      let errorMessage = "Error al iniciar sesión. Por favor, intenta de nuevo."
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No existe una cuenta con este email."
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Contraseña incorrecta."
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "El email ingresado no es válido."
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <motion.img
              src="/favicon.png"
              alt="logo"
              className="w-24 h-24 rounded-full shadow-lg"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
          </div>

          {/* Título de bienvenida */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-2">
              ¡Bienvenid@!
            </h1>
            <p className="text-slate-300 text-lg">
              Accede a tu plan de entrenamiento personalizado
            </p>
          </motion.div>

          {/* Formulario de Email/Password */}
          <motion.form
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleEmailLogin}
            className="space-y-4"
          >
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Correo electrónico"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Contraseña"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#0284c7' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </motion.form>

          {/* Mensaje de error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Texto informativo */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-slate-400 text-sm mt-6"
          >
            Al continuar, aceptas nuestros{' '}
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-primary-400 hover:text-primary-300 underline transition-colors"
            >
              términos y condiciones
            </button>
          </motion.p>
        </div>
      </motion.div>

      {/* Modal de Términos y Condiciones */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTerms(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Términos y Condiciones</h2>
                <button
                  onClick={() => setShowTerms(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="text-slate-300 space-y-4">
                  <section>
                    <h3 className="text-xl font-semibold text-white mb-2">1. Aceptación de los Términos</h3>
                    <p>
                      Al acceder y utilizar esta plataforma de entrenamiento personalizado, usted acepta cumplir con estos términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar el servicio.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-2">2. Uso del Servicio</h3>
                    <p>
                      El servicio está destinado únicamente para uso personal. Usted se compromete a:
                    </p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>Proporcionar información precisa y actualizada</li>
                      <li>Mantener la confidencialidad de su cuenta y contraseña</li>
                      <li>No compartir su cuenta con terceros</li>
                      <li>Usar el servicio de manera responsable y conforme a la ley</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-2">3. Responsabilidad de la Salud</h3>
                    <p>
                      Los programas de entrenamiento proporcionados son sugerencias generales. Antes de comenzar cualquier programa de ejercicio, consulte con un profesional de la salud. No nos hacemos responsables de lesiones o problemas de salud que puedan resultar del uso de este servicio.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-2">4. Privacidad</h3>
                    <p>
                      Respetamos su privacidad y protegemos sus datos personales de acuerdo con nuestra política de privacidad. Sus datos se utilizan únicamente para proporcionar y mejorar el servicio.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-xl font-semibold text-white mb-2">5. Modificaciones</h3>
                    <p>
                      Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en la plataforma.
                    </p>
                  </section>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-700 flex justify-end">
                <button
                  onClick={() => setShowTerms(false)}
                  className="px-6 py-2 rounded-lg font-semibold transition-colors text-white"
                  style={{ backgroundColor: '#0284c7' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
