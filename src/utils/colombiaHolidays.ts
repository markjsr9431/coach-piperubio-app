/**
 * Utilidades para obtener festivos de Colombia
 * Incluye festivos fijos y móviles según el calendario colombiano
 */

/**
 * Calcula la fecha de Pascua para un año dado usando el algoritmo de Meeus/Jones/Butcher
 */
function calculateEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  
  return new Date(year, month - 1, day)
}

/**
 * Obtiene todos los festivos de Colombia para un año dado
 * @param year Año para el cual obtener los festivos
 * @returns Array de fechas de festivos
 */
export function getColombiaHolidays(year: number): Date[] {
  const holidays: Date[] = []
  
  // Festivos fijos
  holidays.push(new Date(year, 0, 1))   // Año Nuevo
  holidays.push(new Date(year, 0, 6))   // Día de los Reyes Magos (primer lunes después del 6 de enero)
  holidays.push(new Date(year, 2, 19))  // Día de San José (19 de marzo o siguiente lunes)
  holidays.push(new Date(year, 3, 1))   // Día del Trabajo (1 de mayo)
  holidays.push(new Date(year, 6, 20))  // Día de la Independencia (20 de julio)
  holidays.push(new Date(year, 7, 7))   // Batalla de Boyacá (7 de agosto)
  holidays.push(new Date(year, 9, 12))  // Día de la Raza (12 de octubre)
  holidays.push(new Date(year, 10, 1))  // Día de Todos los Santos (1 de noviembre)
  holidays.push(new Date(year, 10, 11)) // Independencia de Cartagena (11 de noviembre)
  holidays.push(new Date(year, 11, 8))  // Día de la Inmaculada Concepción (8 de diciembre)
  holidays.push(new Date(year, 11, 25)) // Navidad (25 de diciembre)
  
  // Calcular Pascua y festivos móviles
  const easter = calculateEaster(year)
  
  // Jueves Santo (3 días antes de Pascua)
  const holyThursday = new Date(easter)
  holyThursday.setDate(easter.getDate() - 3)
  holidays.push(holyThursday)
  
  // Viernes Santo (2 días antes de Pascua)
  const goodFriday = new Date(easter)
  goodFriday.setDate(easter.getDate() - 2)
  holidays.push(goodFriday)
  
  // Lunes de Pascua (día siguiente a Pascua)
  const easterMonday = new Date(easter)
  easterMonday.setDate(easter.getDate() + 1)
  holidays.push(easterMonday)
  
  // Día de la Ascensión (40 días después de Pascua, siguiente lunes si cae domingo)
  const ascension = new Date(easter)
  ascension.setDate(easter.getDate() + 40)
  if (ascension.getDay() === 0) {
    ascension.setDate(ascension.getDate() + 1) // Mover al lunes siguiente
  }
  holidays.push(ascension)
  
  // Corpus Christi (60 días después de Pascua, siguiente lunes si cae domingo)
  const corpusChristi = new Date(easter)
  corpusChristi.setDate(easter.getDate() + 60)
  if (corpusChristi.getDay() === 0) {
    corpusChristi.setDate(corpusChristi.getDate() + 1) // Mover al lunes siguiente
  }
  holidays.push(corpusChristi)
  
  // Sagrado Corazón (68 días después de Pascua, siguiente lunes si cae domingo)
  const sacredHeart = new Date(easter)
  sacredHeart.setDate(easter.getDate() + 68)
  if (sacredHeart.getDay() === 0) {
    sacredHeart.setDate(sacredHeart.getDate() + 1) // Mover al lunes siguiente
  }
  holidays.push(sacredHeart)
  
  // Ajustar festivos que caen en domingo al lunes siguiente (según ley colombiana)
  return holidays.map(holiday => {
    if (holiday.getDay() === 0) {
      const monday = new Date(holiday)
      monday.setDate(holiday.getDate() + 1)
      return monday
    }
    return holiday
  })
}

/**
 * Verifica si una fecha es un festivo en Colombia
 * @param date Fecha a verificar
 * @returns true si es festivo, false en caso contrario
 */
export function isColombiaHoliday(date: Date): boolean {
  const year = date.getFullYear()
  const holidays = getColombiaHolidays(year)
  
  return holidays.some(holiday => {
    return (
      holiday.getDate() === date.getDate() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getFullYear() === date.getFullYear()
    )
  })
}

/**
 * Obtiene el nombre del festivo para una fecha dada
 * @param date Fecha a verificar
 * @returns Nombre del festivo o null si no es festivo
 */
export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  
  const holidayNames: { [key: string]: string } = {
    [`${year}-1-1`]: 'Año Nuevo',
    [`${year}-1-6`]: 'Día de los Reyes Magos',
    [`${year}-3-19`]: 'Día de San José',
    [`${year}-4-1`]: 'Día del Trabajo',
    [`${year}-6-20`]: 'Día de la Independencia',
    [`${year}-7-7`]: 'Batalla de Boyacá',
    [`${year}-9-12`]: 'Día de la Raza',
    [`${year}-10-1`]: 'Día de Todos los Santos',
    [`${year}-10-11`]: 'Independencia de Cartagena',
    [`${year}-11-8`]: 'Día de la Inmaculada Concepción',
    [`${year}-11-25`]: 'Navidad'
  }
  
  // Calcular festivos móviles
  const easter = calculateEaster(year)
  
  // Jueves Santo
  const holyThursday = new Date(easter)
  holyThursday.setDate(easter.getDate() - 3)
  if (holyThursday.getDate() === day && holyThursday.getMonth() === month) {
    return 'Jueves Santo'
  }
  
  // Viernes Santo
  const goodFriday = new Date(easter)
  goodFriday.setDate(easter.getDate() - 2)
  if (goodFriday.getDate() === day && goodFriday.getMonth() === month) {
    return 'Viernes Santo'
  }
  
  // Lunes de Pascua
  const easterMonday = new Date(easter)
  easterMonday.setDate(easter.getDate() + 1)
  if (easterMonday.getDate() === day && easterMonday.getMonth() === month) {
    return 'Lunes de Pascua'
  }
  
  // Día de la Ascensión
  const ascension = new Date(easter)
  ascension.setDate(easter.getDate() + 40)
  if (ascension.getDay() === 0) {
    ascension.setDate(ascension.getDate() + 1)
  }
  if (ascension.getDate() === day && ascension.getMonth() === month) {
    return 'Día de la Ascensión'
  }
  
  // Corpus Christi
  const corpusChristi = new Date(easter)
  corpusChristi.setDate(easter.getDate() + 60)
  if (corpusChristi.getDay() === 0) {
    corpusChristi.setDate(corpusChristi.getDate() + 1)
  }
  if (corpusChristi.getDate() === day && corpusChristi.getMonth() === month) {
    return 'Corpus Christi'
  }
  
  // Sagrado Corazón
  const sacredHeart = new Date(easter)
  sacredHeart.setDate(easter.getDate() + 68)
  if (sacredHeart.getDay() === 0) {
    sacredHeart.setDate(sacredHeart.getDate() + 1)
  }
  if (sacredHeart.getDate() === day && sacredHeart.getMonth() === month) {
    return 'Sagrado Corazón'
  }
  
  return holidayNames[`${year}-${month}-${day}`] || null
}

