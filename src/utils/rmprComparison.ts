import { db } from '../firebaseConfig'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'

export interface ComparisonResult {
  clientId: string
  clientName: string
  value: string
  date: any
  exercise: string
}

export interface RMComparisonData {
  exercise: string
  weight: string
  implement: string
}

export interface PRComparisonData {
  exercise: string
  time: string
  implement: string
}

/**
 * Normaliza el nombre de un ejercicio para comparación
 */
function normalizeExerciseName(exercise: string): string {
  return exercise.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Extrae el valor numérico del peso (ej: "100kg" -> 100, "50.5 lbs" -> 50.5)
 */
function extractWeightValue(weight: string): number | null {
  const match = weight.match(/(\d+\.?\d*)/)
  if (match) {
    return parseFloat(match[1])
  }
  return null
}

/**
 * Convierte tiempo a segundos para comparación (ej: "25:30" -> 1530, "1:30:45" -> 5445)
 */
function timeToSeconds(time: string): number | null {
  const parts = time.split(':').map(p => parseInt(p.trim()))
  
  if (parts.length === 2) {
    // Formato MM:SS
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    // Formato HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 1) {
    // Solo segundos
    return parts[0]
  }
  
  return null
}

/**
 * Compara un nuevo RM con los registros de otros clientes
 */
export async function compareRMWithOtherClients(
  currentClientId: string,
  newRM: RMComparisonData
): Promise<ComparisonResult[]> {
  try {
    const results: ComparisonResult[] = []
    
    // Obtener todos los clientes
    const clientsRef = collection(db, 'clients')
    const clientsSnapshot = await getDocs(clientsRef)
    
    const normalizedNewExercise = normalizeExerciseName(newRM.exercise)
    const newWeightValue = extractWeightValue(newRM.weight)
    
    if (newWeightValue === null) {
      // Si no se puede extraer el valor numérico, no comparar
      return []
    }
    
    // Comparar con cada cliente (excepto el actual)
    for (const clientDoc of clientsSnapshot.docs) {
      if (clientDoc.id === currentClientId) {
        continue // Saltar el cliente actual
      }
      
      try {
        // Obtener registros RM/PR del cliente
        const recordsRef = doc(db, 'clients', clientDoc.id, 'records', 'rm_pr')
        const recordsDoc = await getDoc(recordsRef)
        
        if (recordsDoc.exists()) {
          const data = recordsDoc.data()
          const rms = data.rms || []
          
          // Buscar RMs del mismo ejercicio
          for (const rm of rms) {
            const normalizedExercise = normalizeExerciseName(rm.exercise || '')
            
            // Comparar si es el mismo ejercicio (normalizado)
            if (normalizedExercise === normalizedNewExercise) {
              const otherWeightValue = extractWeightValue(rm.weight || '')
              
              if (otherWeightValue !== null && otherWeightValue >= newWeightValue) {
                // Este cliente tiene un RM mayor o igual
                const clientData = clientDoc.data()
                results.push({
                  clientId: clientDoc.id,
                  clientName: clientData.name || 'Cliente',
                  value: rm.weight || '',
                  date: rm.date || null,
                  exercise: rm.exercise || ''
                })
                break // Solo agregar una vez por cliente
              }
            }
          }
        }
      } catch (error) {
        // Continuar con el siguiente cliente si hay error
        console.error(`Error comparing with client ${clientDoc.id}:`, error)
      }
    }
    
    return results
  } catch (error) {
    console.error('Error comparing RM with other clients:', error)
    return []
  }
}

/**
 * Compara un nuevo PR con los registros de otros clientes
 * Para PR, menor tiempo = mejor, así que buscamos clientes con tiempo menor o igual
 */
export async function comparePRWithOtherClients(
  currentClientId: string,
  newPR: PRComparisonData
): Promise<ComparisonResult[]> {
  try {
    const results: ComparisonResult[] = []
    
    // Obtener todos los clientes
    const clientsRef = collection(db, 'clients')
    const clientsSnapshot = await getDocs(clientsRef)
    
    const normalizedNewExercise = normalizeExerciseName(newPR.exercise)
    const newTimeSeconds = timeToSeconds(newPR.time)
    
    if (newTimeSeconds === null) {
      // Si no se puede convertir el tiempo, no comparar
      return []
    }
    
    // Comparar con cada cliente (excepto el actual)
    for (const clientDoc of clientsSnapshot.docs) {
      if (clientDoc.id === currentClientId) {
        continue // Saltar el cliente actual
      }
      
      try {
        // Obtener registros RM/PR del cliente
        const recordsRef = doc(db, 'clients', clientDoc.id, 'records', 'rm_pr')
        const recordsDoc = await getDoc(recordsRef)
        
        if (recordsDoc.exists()) {
          const data = recordsDoc.data()
          const prs = data.prs || []
          
          // Buscar PRs del mismo ejercicio
          for (const pr of prs) {
            const normalizedExercise = normalizeExerciseName(pr.exercise || '')
            
            // Comparar si es el mismo ejercicio (normalizado)
            if (normalizedExercise === normalizedNewExercise) {
              const otherTimeSeconds = timeToSeconds(pr.time || '')
              
              // Para PR, menor tiempo es mejor, así que si otro tiene tiempo menor o igual, es mejor
              if (otherTimeSeconds !== null && otherTimeSeconds <= newTimeSeconds) {
                // Este cliente tiene un PR mejor o igual (menor tiempo)
                const clientData = clientDoc.data()
                results.push({
                  clientId: clientDoc.id,
                  clientName: clientData.name || 'Cliente',
                  value: pr.time || '',
                  date: pr.date || null,
                  exercise: pr.exercise || ''
                })
                break // Solo agregar una vez por cliente
              }
            }
          }
        }
      } catch (error) {
        // Continuar con el siguiente cliente si hay error
        console.error(`Error comparing with client ${clientDoc.id}:`, error)
      }
    }
    
    return results
  } catch (error) {
    console.error('Error comparing PR with other clients:', error)
    return []
  }
}

