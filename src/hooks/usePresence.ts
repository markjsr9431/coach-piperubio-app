import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebaseConfig'
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore'

/**
 * Hook para mantener la presencia en línea del usuario
 * Actualiza lastLogin cada 2 minutos mientras el usuario está autenticado
 */
export const usePresence = () => {
  const { user } = useAuth()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Solo para clientes, no para coaches
    if (!user || !user.email) return

    const userEmail = user.email.toLowerCase()
    const isCoach = userEmail === 'piperubiocoach@gmail.com' || userEmail === 'sebassennin@gmail.com'
    
    if (isCoach) return

    // Función para actualizar lastLogin
    const updatePresence = async () => {
      try {
        const clientsRef = collection(db, 'clients')
        const q = query(clientsRef, where('email', '==', userEmail))
        const snapshot = await getDocs(q)
        
        if (!snapshot.empty) {
          const clientDoc = snapshot.docs[0]
          await updateDoc(doc(db, 'clients', clientDoc.id), {
            lastLogin: serverTimestamp()
          })
        }
      } catch (error) {
        console.error('Error updating presence:', error)
      }
    }

    // Actualizar inmediatamente
    updatePresence()

    // Configurar intervalo para actualizar cada 2 minutos (120000 ms)
    intervalRef.current = setInterval(updatePresence, 120000)

    // Limpiar intervalo al desmontar o cuando el usuario cambie
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [user])
}

