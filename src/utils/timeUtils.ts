/**
 * Calcula el tiempo transcurrido desde una fecha hasta ahora
 * @param createdAt - Fecha de creación (puede ser string ISO, timestamp de Firestore, o Date)
 * @returns string con el tiempo transcurrido (ej: "2 meses", "1 año y 3 meses")
 */
export const calculateTimeActive = (createdAt: any): string => {
  if (!createdAt) {
    return 'Fecha no disponible'
  }

  let date: Date

  // Convertir diferentes formatos de fecha a Date
  if (createdAt instanceof Date) {
    date = createdAt
  } else if (typeof createdAt === 'string') {
    date = new Date(createdAt)
  } else if (createdAt?.toDate) {
    // Timestamp de Firestore
    date = createdAt.toDate()
  } else if (createdAt?.seconds) {
    // Timestamp de Firestore (formato alternativo)
    date = new Date(createdAt.seconds * 1000)
  } else {
    return 'Fecha no disponible'
  }

  // Verificar que la fecha es válida
  if (isNaN(date.getTime())) {
    return 'Fecha no válida'
  }

  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffDays === 0) {
    return 'Hoy'
  } else if (diffDays === 1) {
    return '1 día'
  } else if (diffDays < 30) {
    return `${diffDays} días`
  } else if (diffMonths === 1) {
    return '1 mes'
  } else if (diffMonths < 12) {
    return `${diffMonths} meses`
  } else if (diffYears === 1) {
    const remainingMonths = diffMonths % 12
    if (remainingMonths === 0) {
      return '1 año'
    } else if (remainingMonths === 1) {
      return '1 año y 1 mes'
    } else {
      return `1 año y ${remainingMonths} meses`
    }
  } else {
    const remainingMonths = diffMonths % 12
    if (remainingMonths === 0) {
      return `${diffYears} años`
    } else if (remainingMonths === 1) {
      return `${diffYears} años y 1 mes`
    } else {
      return `${diffYears} años y ${remainingMonths} meses`
    }
  }
}

