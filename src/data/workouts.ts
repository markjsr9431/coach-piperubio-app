export interface Exercise {
  name: string;
  sets: string;
  video: string;
}

export interface Section {
  name: string;
  exercises: Exercise[];
}

export interface Workout {
  day: string;
  sections: Section[];
}

// Función para obtener el próximo lunes desde hoy (o usar una fecha de inicio específica)
function getStartDate(): Date {
  const today = new Date();
  // Buscar el próximo lunes (o usar el lunes de esta semana si es lunes o antes)
  const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + daysUntilMonday);
  startDate.setHours(0, 0, 0, 0);
  return startDate;
}

// Función para formatear fecha
function formatDate(date: Date): string {
  const dayNumber = date.getDate();
  const monthNumber = date.getMonth() + 1;
  return `${dayNumber}/${monthNumber}`;
}

// Función para obtener nombre del día
function getDayName(date: Date): string {
  const weekDayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return weekDayNames[date.getDay()];
}

// Calcular fecha de inicio (próximo lunes)
const startDate = getStartDate();
let currentDate = new Date(startDate);

export const workouts: Workout[] = [
  {
    day: `Día 1 - ${getDayName(currentDate)} - ${formatDate(currentDate)}`,
    sections: [
      {
        name: "Calentamiento",
        exercises: [
          { name: "Jumping Jacks", sets: "3x20", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" },
          { name: "Stretch Squat", sets: "3x15", video: "https://www.youtube.com/shorts/lve-gs0br-g" },
          { name: "Arm Circles", sets: "2x30", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      },
      {
        name: "Fase Central",
        exercises: [
          { name: "EMOM 16' - 10 Burpees", sets: "1 min", video: "https://www.youtube.com/shorts/-p8c90FPnHg" },
          { name: "DB Snatch", sets: "2 min - 22 rep", video: "https://www.youtube.com/shorts/rGd8d3qOLTQ" },
          { name: "Push-ups", sets: "3x12", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      },
      {
        name: "Prevención de lesiones",
        exercises: [
          { name: "Hip Extensions", sets: "3x20", video: "https://www.youtube.com/shorts/YOagrfL4cZ8" },
          { name: "Shoulder Mobility", sets: "2x15", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      },
      {
        name: "Estiramiento",
        exercises: [
          { name: "Hamstring Stretch", sets: "3x30s", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" },
          { name: "Quad Stretch", sets: "3x30s", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      }
    ]
  },
  {
    day: (() => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + 1);
      return `Día 2 - ${getDayName(date)} - ${formatDate(date)}`;
    })(),
    sections: [
      {
        name: "Calentamiento",
        exercises: [
          { name: "Jumping Jacks", sets: "3x20", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" },
          { name: "Stretch Squat", sets: "3x15", video: "https://www.youtube.com/shorts/lve-gs0br-g" }
        ]
      },
      {
        name: "Fase Central",
        exercises: [
          { name: "Tabata - Squats", sets: "8 rounds", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" },
          { name: "Plank Hold", sets: "3x45s", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      },
      {
        name: "Prevención de lesiones",
        exercises: [
          { name: "Hip Extensions", sets: "3x20", video: "https://www.youtube.com/shorts/YOagrfL4cZ8" }
        ]
      },
      {
        name: "Estiramiento",
        exercises: [
          { name: "Full Body Stretch", sets: "5 min", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      }
    ]
  },
  {
    day: (() => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + 2);
      return `Día 3 - ${getDayName(date)} - ${formatDate(date)}`;
    })(),
    sections: [
      {
        name: "Calentamiento",
        exercises: [
          { name: "Jumping Jacks", sets: "3x20", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" },
          { name: "Stretch Squat", sets: "3x15", video: "https://www.youtube.com/shorts/lve-gs0br-g" }
        ]
      },
      {
        name: "Fase Central",
        exercises: [
          { name: "EMOM 16' - 10 Burpees", sets: "1 min", video: "https://www.youtube.com/shorts/-p8c90FPnHg" },
          { name: "DB Snatch", sets: "2 min - 22 rep", video: "https://www.youtube.com/shorts/rGd8d3qOLTQ" }
        ]
      },
      {
        name: "Prevención de lesiones",
        exercises: [
          { name: "Hip Extensions", sets: "3x20", video: "https://www.youtube.com/shorts/YOagrfL4cZ8" }
        ]
      }
    ]
  },
  {
    day: (() => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + 3);
      return `Día 4 - ${getDayName(date)} - ${formatDate(date)}`;
    })(),
    sections: [
      {
        name: "Calentamiento",
        exercises: [
          { name: "Dynamic Warm-up", sets: "5 min", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      },
      {
        name: "Fase Central",
        exercises: [
          { name: "Running", sets: "20 min", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" },
          { name: "Cool Down", sets: "5 min", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      }
    ]
  },
  {
    day: (() => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + 4);
      return `Día 5 - ${getDayName(date)} - ${formatDate(date)}`;
    })(),
    sections: [
      {
        name: "Calentamiento",
        exercises: [
          { name: "Jumping Jacks", sets: "3x20", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      },
      {
        name: "Fase Central",
        exercises: [
          { name: "Full Body Circuit", sets: "4 rounds", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      },
      {
        name: "Estiramiento",
        exercises: [
          { name: "Yoga Flow", sets: "10 min", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      }
    ]
  }
];

// Generate days 6-30 with placeholder data
// Basado en calendario real (sin domingos), sábados son opcionales
// Continuar desde el día 6 (que sería el sábado después del viernes del día 5)
let currentDateForGeneration = new Date(currentDate);
currentDateForGeneration.setDate(currentDateForGeneration.getDate() + 5); // Avanzar al día 6
let dayCounter = 6;
let workoutDaysGenerated = 0;

// Ya tenemos 5 días (Día 1-5), necesitamos generar 25 más para llegar a 30
while (workoutDaysGenerated < 25) {
  const dayOfWeek = currentDateForGeneration.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  
  // Saltar domingos (día 0)
  if (dayOfWeek === 0) {
    currentDateForGeneration.setDate(currentDateForGeneration.getDate() + 1);
    continue;
  }
  
  const dayName = getDayName(currentDateForGeneration);
  const isSaturday = dayOfWeek === 6; // Sábado es el día 6
  const dateStr = formatDate(currentDateForGeneration);
  
  workouts.push({
    day: isSaturday 
      ? `Día ${dayCounter} - ${dayName} (Opcional) - ${dateStr}` 
      : `Día ${dayCounter} - ${dayName} - ${dateStr}`,
    sections: [
      {
        name: "Calentamiento",
        exercises: [
          { name: "Warm-up Exercise", sets: "3x20", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      },
      {
        name: "Fase Central",
        exercises: [
          { name: "Main Exercise", sets: "3x12", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      },
      {
        name: "Estiramiento",
        exercises: [
          { name: "Cool Down", sets: "5 min", video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" }
        ]
      }
    ]
  });
  
  dayCounter++;
  workoutDaysGenerated++;
  // Avanzar al siguiente día (saltando domingos)
  currentDateForGeneration.setDate(currentDateForGeneration.getDate() + 1);
}

