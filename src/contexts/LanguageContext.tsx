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
    'plan.client': 'CLIENTE',
    'workout.month': 'Entrenamiento del mes',
    'workout.interactive': 'Entrenamientos Interactivos',
    'exercise.count': 'ejercicios',
    'alert.title': 'DOLOR O MOLESTIA: REVISA ALTERNATIVAS DE EJERCICIOS.',
    'alert.text1': 'PARA PESO EN EJERCICIOS, ESCRIBEME.',
    'alert.text2': '',
    'alert.text3': '',
    'theme.toggle': 'Cambiar tema',
    'language.toggle': 'Cambiar idioma',
    'dashboard.welcome': 'Bienvenido',
    'dashboard.subtitle': 'Gestiona tus clientes y planes de entrenamiento',
    'dashboard.welcomeClient': '¡Bienvenido!',
    'dashboard.clientSubtitle': 'Tu rutina o entrenamiento',
    'dashboard.myRoutine': 'Mi Rutina',
    'dashboard.plan': 'Plan de Entrenamiento',
    'dashboard.noClientData': 'No se encontró información de tu plan. Por favor, contacta a tu coach.',
    'dashboard.addClient': 'Agregar Nuevo Cliente',
    'dashboard.clients': 'Clientes',
    'dashboard.noClients': 'No tienes clientes aún',
    'dashboard.addFirstClient': 'Agrega tu primer cliente para comenzar',
    'dashboard.active': 'Activo',
    'dashboard.inactive': 'Inactivo',
    'dashboard.online': 'En línea',
    'dashboard.disconnected': 'Desconectado',
    'dashboard.lastWorkout': 'Último entrenamiento',
    'dashboard.viewWorkouts': 'Ver entrenamientos',
    'dashboard.loadingClients': 'Cargando clientes...',
    'dashboard.loadingRoutine': '',
    'dashboard.deleteClient': 'Eliminar Cliente',
    'dashboard.deleteConfirm': '¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.',
    'dashboard.deleteError': 'Error al eliminar el cliente. Por favor, intenta de nuevo.',
    'dashboard.deleteSuccess': 'Cliente eliminado correctamente. Nota: El usuario de Auth debe eliminarse manualmente desde Firebase Console si es necesario.',
    'userMenu.updateProfile': 'Actualizar Datos',
    'userMenu.logout': 'Cerrar Sesión',
    'modal.updateProfile.title': 'Actualizar Perfil',
    'modal.updateProfile.subtitle': 'Modifica tu información personal',
    'modal.updateProfile.name': 'Nombre Completo',
    'modal.updateProfile.namePlaceholder': 'Ej: Juan Pérez',
    'modal.updateProfile.email': 'Correo Electrónico',
    'modal.updateProfile.emailPlaceholder': 'tu@email.com',
    'modal.updateProfile.emailHint': 'Si cambias el email, recibirás un correo de verificación',
    'modal.updateProfile.phone': 'Teléfono',
    'modal.updateProfile.phonePlaceholder': '+57 300 123 4567',
    'modal.updateProfile.cancel': 'Cancelar',
    'modal.updateProfile.update': 'Actualizar',
    'modal.updateProfile.updating': 'Actualizando...',
    'modal.updateProfile.success': '¡Perfil Actualizado!',
    'modal.updateProfile.successMessage': 'Tus datos se han actualizado correctamente.',
    'modal.addClient.title': 'Agregar Nuevo Cliente',
    'modal.addClient.subtitle': 'Completa la información para agregar un nuevo cliente',
    'modal.addClient.name': 'Nombre Completo',
    'modal.addClient.namePlaceholder': 'Ej: Juan Pérez',
    'modal.addClient.email': 'Correo Electrónico',
    'modal.addClient.emailPlaceholder': 'cliente@ejemplo.com',
    'modal.addClient.emailHint': 'El cliente recibirá un email para crear su contraseña. Funciona con cualquier email, no solo Gmail.',
    'modal.addClient.emailHintWithPassword': 'Funciona con cualquier email, no solo Gmail.',
    'modal.addClient.phone': 'Teléfono',
    'modal.addClient.phonePlaceholder': '+57 300 123 4567',
    'modal.addClient.password': 'Contraseña',
    'modal.addClient.passwordPlaceholder': 'Mínimo 6 caracteres',
    'modal.addClient.setCustomPassword': 'Asignar contraseña',
    'modal.addClient.useAutoPassword': 'Generar automática',
    'modal.addClient.autoPasswordHint': 'Se generará una contraseña automática y se enviará por email',
    'modal.addClient.plan': 'Plan de Entrenamiento',
    'modal.addClient.optional': 'Opcional',
    'modal.addClient.cancel': 'Cancelar',
    'modal.addClient.create': 'Crear Cliente',
    'modal.addClient.creating': 'Creando...',
    'modal.addClient.success': '¡Cliente Agregado!',
    'modal.addClient.successMessage': 'El cliente recibirá un email para configurar su contraseña.',
  },
  en: {
    'plan.title': 'TRAINING PLAN',
    'plan.level': 'LEVEL 2, ADAPTED TO:',
    'plan.client': 'CLIENT',
    'workout.month': 'Workout of the month',
    'workout.interactive': 'Interactive Workouts',
    'exercise.count': 'exercises',
    'alert.title': 'PAIN OR DISCOMFORT: CHECK ALTERNATIVE EXERCISES.',
    'alert.text1': 'FOR EXERCISE WEIGHT, MESSAGE ME.',
    'alert.text2': '',
    'alert.text3': '',
    'theme.toggle': 'Toggle theme',
    'language.toggle': 'Toggle language',
    'dashboard.welcome': 'Welcome',
    'dashboard.subtitle': 'Manage your clients and training plans',
    'dashboard.welcomeClient': 'Welcome!',
    'dashboard.clientSubtitle': 'Your routine or workout',
    'dashboard.myRoutine': 'My Routine',
    'dashboard.plan': 'Training Plan',
    'dashboard.noClientData': 'No plan information found. Please contact your coach.',
    'dashboard.addClient': 'Add New Client',
    'dashboard.clients': 'Clients',
    'dashboard.noClients': 'You have no clients yet',
    'dashboard.addFirstClient': 'Add your first client to get started',
    'dashboard.active': 'Active',
    'dashboard.inactive': 'Inactive',
    'dashboard.online': 'Online',
    'dashboard.disconnected': 'Disconnected',
    'dashboard.lastWorkout': 'Last workout',
    'dashboard.viewWorkouts': 'View workouts',
    'dashboard.loadingClients': 'Loading clients...',
    'dashboard.loadingRoutine': '',
    'dashboard.deleteClient': 'Delete Client',
    'dashboard.deleteConfirm': 'Are you sure you want to delete this client? This action cannot be undone.',
    'dashboard.deleteError': 'Error deleting client. Please try again.',
    'dashboard.deleteSuccess': 'Client deleted successfully. Note: The Auth user must be deleted manually from Firebase Console if needed.',
    'userMenu.updateProfile': 'Update Profile',
    'userMenu.logout': 'Logout',
    'modal.updateProfile.title': 'Update Profile',
    'modal.updateProfile.subtitle': 'Modify your personal information',
    'modal.updateProfile.name': 'Full Name',
    'modal.updateProfile.namePlaceholder': 'E.g: John Doe',
    'modal.updateProfile.email': 'Email Address',
    'modal.updateProfile.emailPlaceholder': 'your@email.com',
    'modal.updateProfile.emailHint': 'If you change your email, you will receive a verification email',
    'modal.updateProfile.phone': 'Phone',
    'modal.updateProfile.phonePlaceholder': '+1 234 567 8900',
    'modal.updateProfile.cancel': 'Cancel',
    'modal.updateProfile.update': 'Update',
    'modal.updateProfile.updating': 'Updating...',
    'modal.updateProfile.success': 'Profile Updated!',
    'modal.updateProfile.successMessage': 'Your data has been updated successfully.',
    'modal.addClient.title': 'Add New Client',
    'modal.addClient.subtitle': 'Complete the information to add a new client',
    'modal.addClient.name': 'Full Name',
    'modal.addClient.namePlaceholder': 'E.g: John Doe',
    'modal.addClient.email': 'Email Address',
    'modal.addClient.emailPlaceholder': 'client@example.com',
    'modal.addClient.emailHint': 'The client will receive an email to create their password. Works with any email, not just Gmail.',
    'modal.addClient.emailHintWithPassword': 'Works with any email, not just Gmail.',
    'modal.addClient.phone': 'Phone',
    'modal.addClient.phonePlaceholder': '+1 234 567 8900',
    'modal.addClient.password': 'Password',
    'modal.addClient.passwordPlaceholder': 'Minimum 6 characters',
    'modal.addClient.setCustomPassword': 'Set custom password',
    'modal.addClient.useAutoPassword': 'Use auto-generated',
    'modal.addClient.autoPasswordHint': 'An automatic password will be generated and sent by email',
    'modal.addClient.plan': 'Training Plan',
    'modal.addClient.optional': 'Optional',
    'modal.addClient.cancel': 'Cancel',
    'modal.addClient.create': 'Create Client',
    'modal.addClient.creating': 'Creating...',
    'modal.addClient.success': 'Client Added!',
    'modal.addClient.successMessage': 'The client will receive an email to set up their password.',
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
    const translation = translations[language][key as keyof typeof translations.es]
    // Si la traducción existe (incluso si está vacía), devolverla; si no existe, devolver la clave
    if (translation !== undefined) {
      return translation
    }
    return key
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

