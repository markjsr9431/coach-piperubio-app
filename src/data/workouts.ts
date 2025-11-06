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

export const workouts: Workout[] = [
  {
    day: "Día 1 - Lunes",
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
    day: "Día 2 - Martes",
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
    day: "Día 3 - Miércoles",
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
    day: "Día 4 - Jueves",
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
    day: "Día 5 - Viernes",
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

// Generate days 6-20 with placeholder data
for (let i = 6; i <= 20; i++) {
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const dayName = days[(i - 1) % 7];
  
  workouts.push({
    day: `Día ${i} - ${dayName}`,
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
}

