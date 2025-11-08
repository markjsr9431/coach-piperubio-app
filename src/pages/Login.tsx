import { useState } from "react"
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { auth, provider } from "../firebaseConfig"

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await signInWithPopup(auth, provider)
      console.log("Usuario autenticado:", result.user)
      // Redirigir al home después del login exitoso
      navigate("/home")
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error)
      setError(error.message || "Error al iniciar sesión. Por favor, intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      await signInWithEmailAndPassword(auth, email, password)
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

          {/* Formulario de Email/Password o Botón de Google */}
          <AnimatePresence mode="wait">
            {showEmailLogin ? (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
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
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEmailLogin(false)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-800 text-white font-semibold hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="google-button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <motion.button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>Continuar con Google</span>
                    </>
                  )}
                </motion.button>
                <button
                  onClick={() => setShowEmailLogin(true)}
                  className="w-full text-slate-300 hover:text-white text-sm font-medium transition-colors"
                >
                  O inicia sesión con email y contraseña
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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
            Al continuar, aceptas nuestros términos y condiciones
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}
