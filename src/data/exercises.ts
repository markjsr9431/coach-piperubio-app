// Base de datos de ejercicios categorizados de CrossFit
// Videos del canal: https://www.youtube.com/@Coachpiperubio

export interface ExerciseData {
  id: string;
  name: string;
  category: string;
  video?: string; // URL del video de YouTube
  description?: string;
}

export const exerciseCategories = [
  'AMRAP',
  'Calentamiento',
  'Cardio',
  'EMOM',
  'Estiramiento',
  'For Time',
  'Fuerza',
  'Gimnásticos',
  'Levantamiento Olímpico',
  'Pesas',
  'Peso Corporal',
  'Prevención de Lesiones',
  'Tabata'
].sort(); // Ordenar alfabéticamente

export const exercises: ExerciseData[] = [
  // Calentamiento
  {
    id: 'warmup-1',
    name: 'Jumping Jacks',
    category: 'Calentamiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Salto con apertura de piernas y brazos'
  },
  {
    id: 'warmup-2',
    name: 'Stretch Squat',
    category: 'Calentamiento',
    video: 'https://www.youtube.com/shorts/lve-gs0br-g',
    description: 'Sentadilla con estiramiento'
  },
  {
    id: 'warmup-3',
    name: 'Arm Circles',
    category: 'Calentamiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Círculos con los brazos'
  },
  {
    id: 'warmup-4',
    name: 'Dynamic Warm-up',
    category: 'Calentamiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Calentamiento dinámico completo'
  },
  {
    id: 'warmup-5',
    name: 'Leg Swings',
    category: 'Calentamiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Balanceo de piernas'
  },
  {
    id: 'warmup-6',
    name: 'Hip Circles',
    category: 'Calentamiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Círculos de cadera'
  },
  {
    id: 'warmup-7',
    name: 'Shoulder Rotations',
    category: 'Calentamiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Rotaciones de hombros'
  },

  // Fuerza
  {
    id: 'strength-1',
    name: 'DB Snatch',
    category: 'Fuerza',
    video: 'https://www.youtube.com/shorts/rGd8d3qOLTQ',
    description: 'Arranque con mancuerna'
  },
  {
    id: 'strength-2',
    name: 'Back Squat',
    category: 'Fuerza',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Sentadilla trasera con barra'
  },
  {
    id: 'strength-3',
    name: 'Deadlift',
    category: 'Fuerza',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Peso muerto'
  },
  {
    id: 'strength-4',
    name: 'Bench Press',
    category: 'Fuerza',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Press de banca'
  },
  {
    id: 'strength-5',
    name: 'Overhead Press',
    category: 'Fuerza',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Press por encima de la cabeza'
  },
  {
    id: 'strength-6',
    name: 'Front Squat',
    category: 'Fuerza',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Sentadilla frontal'
  },
  {
    id: 'strength-7',
    name: 'Clean and Jerk',
    category: 'Fuerza',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Cargada y envión'
  },
  {
    id: 'strength-8',
    name: 'Snatch',
    category: 'Fuerza',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Arranque'
  },

  // Cardio
  {
    id: 'cardio-1',
    name: 'Burpees',
    category: 'Cardio',
    video: 'https://www.youtube.com/shorts/-p8c90FPnHg',
    description: 'Burpees completos'
  },
  {
    id: 'cardio-2',
    name: 'Running',
    category: 'Cardio',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Correr'
  },
  {
    id: 'cardio-3',
    name: 'Rowing',
    category: 'Cardio',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Remo en máquina'
  },
  {
    id: 'cardio-4',
    name: 'Assault Bike',
    category: 'Cardio',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Bicicleta de asalto'
  },
  {
    id: 'cardio-5',
    name: 'Double Unders',
    category: 'Cardio',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Saltos de cuerda dobles'
  },
  {
    id: 'cardio-6',
    name: 'Single Unders',
    category: 'Cardio',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Saltos de cuerda simples'
  },
  {
    id: 'cardio-7',
    name: 'Mountain Climbers',
    category: 'Cardio',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Escaladores'
  },
  {
    id: 'cardio-8',
    name: 'High Knees',
    category: 'Cardio',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Rodillas altas'
  },

  // Gimnásticos
  {
    id: 'gymnastics-1',
    name: 'Pull-ups',
    category: 'Gimnásticos',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Dominadas'
  },
  {
    id: 'gymnastics-2',
    name: 'Muscle-ups',
    category: 'Gimnásticos',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Muscle-ups'
  },
  {
    id: 'gymnastics-3',
    name: 'Handstand Push-ups',
    category: 'Gimnásticos',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Flexiones en parada de manos'
  },
  {
    id: 'gymnastics-4',
    name: 'Toes to Bar',
    category: 'Gimnásticos',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Pies a la barra'
  },
  {
    id: 'gymnastics-5',
    name: 'Ring Dips',
    category: 'Gimnásticos',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Fondos en anillas'
  },
  {
    id: 'gymnastics-6',
    name: 'Ring Muscle-ups',
    category: 'Gimnásticos',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Muscle-ups en anillas'
  },
  {
    id: 'gymnastics-7',
    name: 'Bar Muscle-ups',
    category: 'Gimnásticos',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Muscle-ups en barra'
  },
  {
    id: 'gymnastics-8',
    name: 'Handstand Walk',
    category: 'Gimnásticos',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Caminar en parada de manos'
  },

  // Peso Corporal
  {
    id: 'bodyweight-1',
    name: 'Push-ups',
    category: 'Peso Corporal',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Flexiones'
  },
  {
    id: 'bodyweight-2',
    name: 'Squats',
    category: 'Peso Corporal',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Sentadillas'
  },
  {
    id: 'bodyweight-3',
    name: 'Lunges',
    category: 'Peso Corporal',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Zancadas'
  },
  {
    id: 'bodyweight-4',
    name: 'Plank Hold',
    category: 'Peso Corporal',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Plancha isométrica'
  },
  {
    id: 'bodyweight-5',
    name: 'Mountain Climbers',
    category: 'Peso Corporal',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Escaladores'
  },
  {
    id: 'bodyweight-6',
    name: 'Box Jumps',
    category: 'Peso Corporal',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Saltos al cajón'
  },
  {
    id: 'bodyweight-7',
    name: 'Dips',
    category: 'Peso Corporal',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Fondos'
  },
  {
    id: 'bodyweight-8',
    name: 'Pistol Squats',
    category: 'Peso Corporal',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Sentadillas pistol'
  },
  {
    id: 'bodyweight-9',
    name: 'Hollow Body Hold',
    category: 'Peso Corporal',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Mantenimiento de cuerpo hueco'
  },
  {
    id: 'bodyweight-10',
    name: 'V-ups',
    category: 'Peso Corporal',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'V-ups abdominales'
  },

  // Pesas
  {
    id: 'weights-1',
    name: 'Kettlebell Swings',
    category: 'Pesas',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Balanceos con kettlebell'
  },
  {
    id: 'weights-2',
    name: 'Dumbbell Thrusters',
    category: 'Pesas',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Thrusters con mancuernas'
  },
  {
    id: 'weights-3',
    name: 'Wall Balls',
    category: 'Pesas',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Lanzamientos de balón medicinal'
  },
  {
    id: 'weights-4',
    name: 'Med Ball Slams',
    category: 'Pesas',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Golpes de balón medicinal'
  },
  {
    id: 'weights-5',
    name: 'Dumbbell Snatch',
    category: 'Pesas',
    video: 'https://www.youtube.com/shorts/rGd8d3qOLTQ',
    description: 'Arranque con mancuerna'
  },
  {
    id: 'weights-6',
    name: 'Kettlebell Goblet Squat',
    category: 'Pesas',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Sentadilla goblet con kettlebell'
  },
  {
    id: 'weights-7',
    name: 'Dumbbell Clean',
    category: 'Pesas',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Cargada con mancuerna'
  },
  {
    id: 'weights-8',
    name: 'Farmers Walk',
    category: 'Pesas',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Caminata del granjero'
  },

  // Prevención de Lesiones
  {
    id: 'injury-1',
    name: 'Hip Extensions',
    category: 'Prevención de Lesiones',
    video: 'https://www.youtube.com/shorts/YOagrfL4cZ8',
    description: 'Extensiones de cadera'
  },
  {
    id: 'injury-2',
    name: 'Shoulder Mobility',
    category: 'Prevención de Lesiones',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Movilidad de hombros'
  },
  {
    id: 'injury-3',
    name: 'Ankle Mobility',
    category: 'Prevención de Lesiones',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Movilidad de tobillos'
  },
  {
    id: 'injury-4',
    name: 'Thoracic Extension',
    category: 'Prevención de Lesiones',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Extensión torácica'
  },
  {
    id: 'injury-5',
    name: 'Hip Flexor Stretch',
    category: 'Prevención de Lesiones',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Estiramiento de flexores de cadera'
  },
  {
    id: 'injury-6',
    name: 'Scapular Wall Slides',
    category: 'Prevención de Lesiones',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Deslizamientos escapulares en pared'
  },
  {
    id: 'injury-7',
    name: 'Band Pull-aparts',
    category: 'Prevención de Lesiones',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Aperturas con banda'
  },

  // Estiramiento
  {
    id: 'stretch-1',
    name: 'Hamstring Stretch',
    category: 'Estiramiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Estiramiento de isquiotibiales'
  },
  {
    id: 'stretch-2',
    name: 'Quad Stretch',
    category: 'Estiramiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Estiramiento de cuádriceps'
  },
  {
    id: 'stretch-3',
    name: 'Full Body Stretch',
    category: 'Estiramiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Estiramiento completo del cuerpo'
  },
  {
    id: 'stretch-4',
    name: 'Yoga Flow',
    category: 'Estiramiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Flujo de yoga'
  },
  {
    id: 'stretch-5',
    name: 'Cool Down',
    category: 'Estiramiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Enfriamiento'
  },
  {
    id: 'stretch-6',
    name: 'Pigeon Pose',
    category: 'Estiramiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Postura de paloma'
  },
  {
    id: 'stretch-7',
    name: 'Child\'s Pose',
    category: 'Estiramiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Postura del niño'
  },
  {
    id: 'stretch-8',
    name: 'Downward Dog',
    category: 'Estiramiento',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Perro boca abajo'
  },

  // EMOM
  {
    id: 'emom-1',
    name: 'EMOM - Burpees',
    category: 'EMOM',
    video: 'https://www.youtube.com/shorts/-p8c90FPnHg',
    description: 'EMOM de burpees'
  },
  {
    id: 'emom-2',
    name: 'EMOM - Pull-ups',
    category: 'EMOM',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'EMOM de dominadas'
  },
  {
    id: 'emom-3',
    name: 'EMOM - Thrusters',
    category: 'EMOM',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'EMOM de thrusters'
  },
  {
    id: 'emom-4',
    name: 'EMOM - Snatch',
    category: 'EMOM',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'EMOM de arranque'
  },
  {
    id: 'emom-5',
    name: 'EMOM - Clean and Jerk',
    category: 'EMOM',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'EMOM de cargada y envión'
  },

  // Tabata
  {
    id: 'tabata-1',
    name: 'Tabata - Squats',
    category: 'Tabata',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Tabata de sentadillas'
  },
  {
    id: 'tabata-2',
    name: 'Tabata - Push-ups',
    category: 'Tabata',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Tabata de flexiones'
  },
  {
    id: 'tabata-3',
    name: 'Tabata - Burpees',
    category: 'Tabata',
    video: 'https://www.youtube.com/shorts/-p8c90FPnHg',
    description: 'Tabata de burpees'
  },
  {
    id: 'tabata-4',
    name: 'Tabata - Mountain Climbers',
    category: 'Tabata',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Tabata de escaladores'
  },
  {
    id: 'tabata-5',
    name: 'Tabata - High Knees',
    category: 'Tabata',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'Tabata de rodillas altas'
  },

  // AMRAP
  {
    id: 'amrap-1',
    name: 'AMRAP - Cindy',
    category: 'AMRAP',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'AMRAP Cindy (5 pull-ups, 10 push-ups, 15 squats)'
  },
  {
    id: 'amrap-2',
    name: 'AMRAP - Full Body',
    category: 'AMRAP',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'AMRAP cuerpo completo'
  },
  {
    id: 'amrap-3',
    name: 'AMRAP - Murph',
    category: 'AMRAP',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'AMRAP Murph'
  },
  {
    id: 'amrap-4',
    name: 'AMRAP - Fight Gone Bad',
    category: 'AMRAP',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'AMRAP Fight Gone Bad'
  },

  // For Time
  {
    id: 'fortime-1',
    name: 'For Time - Fran',
    category: 'For Time',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'For Time Fran (21-15-9 thrusters y pull-ups)'
  },
  {
    id: 'fortime-2',
    name: 'For Time - Murph',
    category: 'For Time',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'For Time Murph'
  },
  {
    id: 'fortime-3',
    name: 'For Time - Grace',
    category: 'For Time',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'For Time Grace (30 clean and jerks)'
  },
  {
    id: 'fortime-4',
    name: 'For Time - Isabel',
    category: 'For Time',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'For Time Isabel (30 snatches)'
  },
  {
    id: 'fortime-5',
    name: 'For Time - Diane',
    category: 'For Time',
    video: 'https://www.youtube.com/@Coachpiperubio',
    description: 'For Time Diane (21-15-9 deadlifts y handstand push-ups)'
  }
];

// Función para buscar ejercicios
export const searchExercises = (query: string, category?: string): ExerciseData[] => {
  const lowerQuery = query.toLowerCase();
  return exercises.filter(exercise => {
    const matchesQuery = !query || 
      exercise.name.toLowerCase().includes(lowerQuery) ||
      exercise.description?.toLowerCase().includes(lowerQuery);
    const matchesCategory = !category || exercise.category === category;
    return matchesQuery && matchesCategory;
  });
};

// Función para obtener ejercicios por categoría
export const getExercisesByCategory = (category: string): ExerciseData[] => {
  return exercises.filter(exercise => exercise.category === category);
};

// Función para obtener un ejercicio por ID
export const getExerciseById = (id: string): ExerciseData | undefined => {
  return exercises.find(exercise => exercise.id === id);
};

