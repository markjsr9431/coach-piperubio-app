import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

interface AvatarSelectorProps {
  selectedAvatar: string | null
  onSelect: (avatar: string) => void
  gender: 'male' | 'female' | null
  onGenderChange: (gender: 'male' | 'female') => void
}

const AvatarSelector = ({ selectedAvatar, onSelect, gender, onGenderChange }: AvatarSelectorProps) => {
  const { theme } = useTheme()

  // Avatares masculinos
  const maleAvatars = [
    '👨', '👨‍💼', '👨‍🔬', '👨‍🎓', '👨‍🏫', '👨‍⚕️', '👨‍⚖️', '👨‍🎤',
    '🧑', '🧑‍💼', '🧑‍🔬', '🧑‍🎓', '🧑‍🏫', '🧑‍⚕️', '🧑‍⚖️', '🧑‍🎤',
    '👨‍🦱', '👨‍🦰', '👨‍🦳', '👨‍🦲', '🧔', '🧔‍♂️', '👨‍💻', '👨‍🎨'
  ]

  // Avatares femeninos
  const femaleAvatars = [
    '👩', '👩‍💼', '👩‍🔬', '👩‍🎓', '👩‍🏫', '👩‍⚕️', '👩‍⚖️', '👩‍🎤',
    '👩‍🦱', '👩‍🦰', '👩‍🦳', '👩‍🦲', '👩‍💻', '👩‍🎨', '👩‍🚀', '👩‍🚒',
    '👩‍🏭', '👩‍🌾', '👩‍🍳', '👩‍🔧', '👩‍🏗️', '👩‍💼', '👩‍🎤', '👩‍🎨'
  ]

  const avatars = gender === 'male' ? maleAvatars : gender === 'female' ? femaleAvatars : []

  return (
    <div className="space-y-4">
      {/* Selector de género */}
      <div>
        <label className={`block text-sm font-semibold mb-3 ${
          theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
        }`}>
          Selecciona tu género
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => onGenderChange('male')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              gender === 'male'
                ? 'bg-primary-600 text-white'
                : theme === 'dark'
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            👨 Masculino
          </button>
          <button
            type="button"
            onClick={() => onGenderChange('female')}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
              gender === 'female'
                ? 'bg-primary-600 text-white'
                : theme === 'dark'
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            👩 Femenino
          </button>
        </div>
      </div>

      {/* Selector de avatar */}
      {gender && (
        <div>
          <label className={`block text-sm font-semibold mb-3 ${
            theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
          }`}>
            Selecciona tu avatar
          </label>
          <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 rounded-lg ${
            theme === 'dark' ? 'bg-slate-700/50' : 'bg-gray-100'
          }">
            {avatars.map((avatar, index) => (
              <motion.button
                key={index}
                type="button"
                onClick={() => onSelect(avatar)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`text-4xl p-2 rounded-lg transition-all ${
                  selectedAvatar === avatar
                    ? 'bg-primary-500 ring-2 ring-primary-400'
                    : theme === 'dark'
                      ? 'bg-slate-600 hover:bg-slate-500'
                      : 'bg-white hover:bg-gray-200'
                }`}
              >
                {avatar}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AvatarSelector

