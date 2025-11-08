import { signInWithPopup } from "firebase/auth"
import { auth, provider } from "../firebaseConfig"

export default function Login() {
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      console.log("Usuario autenticado:", user)
      // Aquí puedes redirigir al home o dashboard del coach
    } catch (error) {
      console.error("Error al iniciar sesión:", error)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <img src="/favicon.png" alt="logo" className="w-20 mb-6" />
      <h1 className="text-2xl font-bold mb-6">Inicia sesión</h1>
      <button
        onClick={handleGoogleLogin}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-500"
      >
        Continuar con Google
      </button>
    </div>
  )
}
