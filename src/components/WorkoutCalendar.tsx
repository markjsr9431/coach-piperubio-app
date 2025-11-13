import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { Workout } from '../data/workouts'
import { isColombiaHoliday, getHolidayName } from '../utils/colombiaHolidays'

interface WorkoutCalendarProps {
  workouts: Workout[]
  workoutDates: { [dayIndex: number]: Date }
  onDayClick: (dayIndex: number) => void
  onEditWorkout?: (dayIndex: number) => void
  onResetDay?: (dayIndex: number) => void
  workoutDurations?: { [dayIndex: number]: number }
  isCoach?: boolean
}

const WorkoutCalendar = ({
  workouts,
  workoutDates,
  onDayClick,
  onEditWorkout,
  onResetDay,
  workoutDurations,
  isCoach = false
}: WorkoutCalendarProps) => {
  const { theme } = useTheme()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Obtener el primer día del mes y el último día
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  
  // Calcular el día de la semana del primer día (0 = Lunes, 6 = Domingo)
  const firstDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7
  
  // Construir el calendario con 6 columnas (Lun-Sáb), excluyendo domingos
  const days: (number | null)[] = []
  
  // Añadir días vacíos al inicio para alinear con Lunes
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null)
  }
  
  // Añadir días del mes, saltando domingos
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const dayOfWeek = (date.getDay() + 6) % 7 // 0 = Lunes, 6 = Domingo
    
    // Solo agregar si no es domingo
    if (dayOfWeek !== 6) {
      days.push(day)
    }
    // Los domingos se saltan completamente
  }
  
  // Nombres de los días de la semana (Lunes a Sábado)
  const dayNames = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
  
  // Nombres de los meses
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  
  // Función para obtener el día de la semana (0 = Lunes, 5 = Sábado, 6 = Domingo)
  const getDayOfWeek = (day: number): number => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return (date.getDay() + 6) % 7
  }
  
  // Función para verificar si un día tiene entrenamiento asignado
  const hasWorkout = (day: number): { hasWorkout: boolean; dayIndex: number | null; dayName: string | null; date: Date | null } => {
    const dayOfWeek = getDayOfWeek(day)
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    
    // Domingo (6) no tiene entrenamiento
    if (dayOfWeek === 6) {
      return { hasWorkout: false, dayIndex: null, dayName: null, date: null }
    }
    
    // Buscar workout que coincida con el día de la semana
    const dayNamesMap: { [key: number]: string } = {
      0: 'Lunes',
      1: 'Martes',
      2: 'Miércoles',
      3: 'Jueves',
      4: 'Viernes',
      5: 'Sábado'
    }
    
    const dayName = dayNamesMap[dayOfWeek]
    
    // Buscar en workouts si hay alguno para este día
    const workoutIndex = workouts.findIndex(w => {
      const workoutDayName = w.day.split(' - ')[1]?.replace(' (Opcional)', '').trim()
      return workoutDayName === dayName
    })
    
    if (workoutIndex !== -1) {
      return { hasWorkout: true, dayIndex: workoutIndex, dayName, date }
    }
    
    return { hasWorkout: false, dayIndex: null, dayName, date: null }
  }
  
  // Función para formatear duración del entrenamiento
  const formatWorkoutDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }
  
  // Navegación de mes
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }
  
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }
  
  const goToToday = () => {
    setCurrentMonth(new Date())
  }
  
  const today = new Date()
  const isCurrentMonth = currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()
  const todayDay = today.getDate()
  
  return (
    <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/80'}`}>
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'hover:bg-slate-700 text-slate-300'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                theme === 'dark'
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              Hoy
            </button>
          )}
        </div>

        <button
          onClick={goToNextMonth}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'hover:bg-slate-700 text-slate-300'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="relative">
        <div className="overflow-x-auto">
          <div className="min-w-[420px] space-y-3">
            {/* Días de la semana */}
            <div
              className={`grid grid-cols-6 gap-2 sticky top-0 z-20 py-2 ${
                theme === 'dark'
                  ? 'bg-slate-800/90 backdrop-blur'
                  : 'bg-white/95 backdrop-blur'
              }`}
            >
              {dayNames.map((dayName) => (
                <div
                  key={dayName}
                  className={`text-center text-xs font-semibold tracking-wide ${
                    theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Días del calendario */}
            <div className="grid grid-cols-6 gap-2">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const dayOfWeek = getDayOfWeek(day)
                const isSunday = dayOfWeek === 6

                if (isSunday) {
                  return <div key={`sunday-${day}`} className="aspect-square" />
                }

                const isToday = isCurrentMonth && day === todayDay
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                const isHoliday = isColombiaHoliday(date)
                const holidayName = isHoliday ? getHolidayName(date) : null
                const workoutInfo = hasWorkout(day)
                const workoutDate = workoutInfo.dayIndex !== null ? workoutDates[workoutInfo.dayIndex] : null
                const workoutDuration =
                  workoutInfo.dayIndex !== null && workoutDurations ? workoutDurations[workoutInfo.dayIndex] : undefined

                const hasWorkoutAssigned = workoutInfo.hasWorkout
                const isWorkoutDateMatch = Boolean(
                  workoutDate &&
                  workoutDate.getDate() === day &&
                  workoutDate.getMonth() === currentMonth.getMonth() &&
                  workoutDate.getFullYear() === currentMonth.getFullYear()
                )
                const isHolidayWithWorkout = isHoliday && hasWorkoutAssigned

                let paletteClasses = ''

                if (hasWorkoutAssigned) {
                  if (isWorkoutDateMatch) {
                    paletteClasses = theme === 'dark'
                      ? 'bg-green-600/25 border-2 border-green-500'
                      : 'bg-green-100 border-2 border-green-500'
                  } else if (isHolidayWithWorkout) {
                    paletteClasses = theme === 'dark'
                      ? 'bg-yellow-600/25 border border-yellow-500/70'
                      : 'bg-yellow-100 border border-yellow-300'
                  } else {
                    paletteClasses = theme === 'dark'
                      ? 'bg-primary-600/25 border border-primary-500/60 hover:bg-primary-600/35'
                      : 'bg-primary-50 border border-primary-200 hover:bg-primary-100'
                  }
                } else {
                  if (isHoliday) {
                    paletteClasses = theme === 'dark'
                      ? 'bg-yellow-500/15 border border-yellow-500/50'
                      : 'bg-yellow-50 border border-yellow-200'
                  } else {
                    paletteClasses = theme === 'dark'
                      ? 'bg-slate-700/40 border border-slate-600/50'
                      : 'bg-gray-50 border border-gray-200'
                  }
                }

                const exercisesCount =
                  workoutInfo.dayIndex !== null && workouts[workoutInfo.dayIndex]
                    ? workouts[workoutInfo.dayIndex].sections.reduce(
                        (acc, section) => acc + section.exercises.length,
                        0
                      )
                    : null

                return (
                  <motion.div
                    key={day}
                    whileHover={hasWorkoutAssigned || isCoach ? { scale: 1.05 } : {}}
                    whileTap={hasWorkoutAssigned || isCoach ? { scale: 0.95 } : {}}
                    onClick={() => {
                      if (workoutInfo.dayIndex !== null) {
                        onDayClick(workoutInfo.dayIndex)
                      }
                    }}
                    className={`group relative aspect-square rounded-lg p-2 flex overflow-hidden transition-all ${
                      workoutInfo.dayIndex !== null ? 'cursor-pointer' : 'cursor-default'
                    } ${paletteClasses} ${isToday ? 'ring-2 ring-primary-500' : ''}`}
                    title={isHoliday ? holidayName || 'Festivo' : undefined}
                  >
                    <div className="flex flex-col h-full w-full">
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-base sm:text-lg font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {day}
                        </span>
                        {isHoliday && (
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              theme === 'dark' ? 'bg-yellow-400' : 'bg-yellow-500'
                            }`}
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      {hasWorkoutAssigned && (
                        <div className="mt-auto w-full">
                          <div className="flex items-end justify-between gap-2">
                            <div className="flex flex-col gap-1">
                              {exercisesCount !== null && (
                                <span
                                  className={`text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                                    theme === 'dark' ? 'text-primary-200' : 'text-primary-700'
                                  }`}
                                >
                                  {exercisesCount} ej.
                                </span>
                              )}
                              {workoutDuration && (
                                <span
                                  className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                                    theme === 'dark' ? 'text-green-300' : 'text-green-700'
                                  }`}
                                >
                                  ⏱ {formatWorkoutDuration(workoutDuration)}
                                </span>
                              )}
                            </div>

                            {isCoach && workoutInfo.dayIndex !== null && (
                              <div className="flex gap-1">
                                {onEditWorkout && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onEditWorkout(workoutInfo.dayIndex!)
                                    }}
                                    className={`p-1 rounded transition-colors ${
                                      theme === 'dark'
                                        ? 'bg-white/15 hover:bg-white/25'
                                        : 'bg-gray-200 hover:bg-gray-300'
                                    }`}
                                    title="Editar entrenamiento"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                      />
                                    </svg>
                                  </button>
                                )}
                                {onResetDay && workoutDuration && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onResetDay(workoutInfo.dayIndex!)
                                    }}
                                    className={`p-1 rounded transition-colors ${
                                      theme === 'dark'
                                        ? 'bg-red-500/20 hover:bg-red-500/30'
                                        : 'bg-red-100 hover:bg-red-200'
                                    }`}
                                    title="Restablecer día"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkoutCalendar

