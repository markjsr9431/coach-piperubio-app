import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { auth } from '../firebaseConfig'

// Emails de administradores
const ADMIN_EMAILS = {
  MAIN_ADMIN: 'sebassennin@gmail.com',
  ADMIN: 'piperubiocoach@gmail.com'
}

export type UserRole = 'main_admin' | 'admin' | 'client'

interface AuthContextType {
  user: User | null
  loading: boolean
  userRole: UserRole | null
  isAdmin: boolean
  isMainAdmin: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Función para determinar el rol del usuario
const getUserRole = (email: string | null | undefined): UserRole | null => {
  if (!email) return null
  
  const emailLower = email.toLowerCase()
  
  if (emailLower === ADMIN_EMAILS.MAIN_ADMIN.toLowerCase()) {
    return 'main_admin'
  }
  
  if (emailLower === ADMIN_EMAILS.ADMIN.toLowerCase()) {
    return 'admin'
  }
  
  return 'client'
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    // Configurar persistencia de sesión en localStorage
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Error setting persistence:', error)
    })

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      const role = getUserRole(user?.email || null)
      setUserRole(role)
      setLoading(false)
      
      // Guardar información del usuario en localStorage para persistencia
      if (user) {
        localStorage.setItem('userEmail', user.email || '')
        localStorage.setItem('userRole', role || '')
      } else {
        localStorage.removeItem('userEmail')
        localStorage.removeItem('userRole')
      }
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    await signOut(auth)
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userRole')
  }

  const isAdmin = userRole === 'admin' || userRole === 'main_admin'
  const isMainAdmin = userRole === 'main_admin'

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      userRole, 
      isAdmin, 
      isMainAdmin,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

