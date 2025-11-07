import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'

type TimerMode = 'free' | 'tabata' | 'emom'

interface TimerContextType {
  mode: TimerMode
  setMode: (mode: TimerMode) => void
  isRunning: boolean
  setIsRunning: (running: boolean) => void
  time: number
  setTime: (time: number) => void
  rounds: number
  setRounds: (rounds: number) => void
  workTime: number
  setWorkTime: (time: number) => void
  restTime: number
  setRestTime: (time: number) => void
  currentRound: number
  setCurrentRound: (round: number) => void
  isWorkPhase: boolean
  setIsWorkPhase: (phase: boolean) => void
  resetTimer: () => void
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<TimerMode>('free')
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0)
  const [rounds, setRounds] = useState(8)
  const [workTime, setWorkTime] = useState(20)
  const [restTime, setRestTime] = useState(10)
  const [currentRound, setCurrentRound] = useState(1)
  const [isWorkPhase, setIsWorkPhase] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const beepRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    beepRef.current = new Audio('/sounds/beep.mp3')
  }, [])

  const playBeep = () => {
    const audio = beepRef.current
    if (!audio) return
    try {
      audio.currentTime = 0
      void audio.play()
    } catch (_) {
      // Ignorar errores de reproducción
    }
  }

  const resetTimer = () => {
    setIsRunning(false)
    setTime(0)
    setCurrentRound(1)
    setIsWorkPhase(true)
  }

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => {
          if (mode === 'free') {
            return prev + 1
          } else if (mode === 'tabata') {
            const phaseTime = isWorkPhase ? workTime : restTime
            if (prev >= phaseTime - 1) {
              if (isWorkPhase) {
                playBeep()
                setIsWorkPhase(false)
                setTime(0)
                return 0
              } else {
                playBeep()
                setIsWorkPhase(true)
                setTime(0)
                if (currentRound >= rounds) {
                  setIsRunning(false)
                  setCurrentRound(1)
                  return 0
                }
                setCurrentRound(prev => prev + 1)
                return 0
              }
            }
            return prev + 1
          } else if (mode === 'emom') {
            if (prev >= 59) {
              playBeep()
              setTime(0)
            }
            return prev + 1
          }
          return prev + 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, mode, isWorkPhase, workTime, restTime, rounds, currentRound])

  return (
    <TimerContext.Provider
      value={{
        mode,
        setMode,
        isRunning,
        setIsRunning,
        setCurrentRound,
        setIsWorkPhase,
        time,
        setTime,
        rounds,
        setRounds,
        workTime,
        setWorkTime,
        restTime,
        setRestTime,
        currentRound,
        //setCurrentRound,
        isWorkPhase,
        //setIsWorkPhase,
        resetTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}

export const useTimer = () => {
  const context = useContext(TimerContext)
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider')
  }
  return context
}



