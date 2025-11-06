import { createContext, useContext, useState, ReactNode } from 'react'

type Language = 'es' | 'en'

interface LanguageContextType {
  language: Language
  toggleLanguage: () => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations = {
  es: {
    'plan.title': 'PLAN DE ENTRENAMIENTO',
    'plan.level': 'NIVEL 2, ADAPTADO A:',
    'workout.month': 'Entrenamiento del mes',
    'workout.interactive': 'Entrenamientos Interactivos',
    'exercise.count': 'ejercicios',
    'alert.title': 'CUALQUIER DOLOR O MOLESTIA CON ALGUN EJERCICIO,REVISA LA',
    'alert.text1': 'CARPETA CON ALTERNATIVA DE EJERCICIOS PARA CAMBIARLO.',
    'alert.text2': 'CON RESPECTO AL PESO EN LOS EJERCICIOS, ESCRIBEME PARA',
    'alert.text3': 'INDICARTE LOS KILOS',
    'theme.toggle': 'Cambiar tema',
    'language.toggle': 'Cambiar idioma',
    'workout.complete.title': '¡Entrenamiento Finalizado!',
    'workout.complete.subtitle': 'Recuerda descansar y comer bien',
    'workout.complete.button': 'Cerrar',
  },
  en: {
    'plan.title': 'TRAINING PLAN',
    'plan.level': 'LEVEL 2, ADAPTED TO:',
    'workout.month': 'Workout of the month',
    'workout.interactive': 'Interactive Workouts',
    'exercise.count': 'exercises',
    'alert.title': 'ANY PAIN OR DISCOMFORT WITH ANY EXERCISE, CHECK THE',
    'alert.text1': 'FOLDER WITH ALTERNATIVE EXERCISES TO CHANGE IT.',
    'alert.text2': 'REGARDING THE WEIGHT IN THE EXERCISES, MESSAGE ME TO',
    'alert.text3': 'INDICATE THE KILOS',
    'theme.toggle': 'Toggle theme',
    'language.toggle': 'Toggle language',
    'workout.complete.title': 'Workout Completed!',
    'workout.complete.subtitle': 'Remember to rest and eat well',
    'workout.complete.button': 'Close',
  },
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language')
    return (saved as Language) || 'es'
  })

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es'
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.es] || key
  }

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

