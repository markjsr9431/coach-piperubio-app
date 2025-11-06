# Coach Piperubio - Entrenamientos Interactivos

Una aplicación web moderna y responsive construida con React, Tailwind CSS y Framer Motion para seguir entrenamientos interactivos.

## 🚀 Características

- ✅ Selección de días de entrenamiento (Día 1-20)
- ✅ Secciones expandibles (Calentamiento, Fase Central, Prevención de lesiones, Estiramiento)
- ✅ Videos embebidos de YouTube para cada ejercicio
- ✅ Cronómetro con modos: Libre, Tabata y EMOM
- ✅ Seguimiento visual del progreso
- ✅ Navegación entre días
- ✅ Interfaz moderna y responsive

## 🛠️ Tecnologías

- **React** + **TypeScript**
- **Vite** - Build tool
- **React Router** - Navegación
- **Tailwind CSS** - Estilos
- **Framer Motion** - Animaciones

## 📦 Instalación

```bash
npm install
```

## 🏃 Ejecutar en desarrollo

```bash
npm run dev
```

## 🏗️ Build para producción

```bash
npm run build
```

## 📝 Editar Datos

Los entrenamientos se pueden editar directamente en `src/data/workouts.ts`. El archivo contiene un array de objetos `Workout` con la siguiente estructura:

```typescript
{
  day: "Día 1 - Lunes",
  sections: [
    {
      name: "Calentamiento",
      exercises: [
        { 
          name: "Jumping Jacks", 
          sets: "3x20", 
          video: "https://www.youtube.com/shorts/Abc_8tIHbiQ" 
        }
      ]
    }
  ]
}
```

## 🎯 Estructura del Proyecto

```
src/
├── components/       # Componentes reutilizables
│   ├── ExerciseItem.tsx
│   ├── ProgressBar.tsx
│   ├── TimerModal.tsx
│   └── VideoModal.tsx
├── data/            # Datos estáticos
│   └── workouts.ts
├── pages/           # Páginas principales
│   ├── HomePage.tsx
│   └── WorkoutPage.tsx
├── App.tsx          # Componente principal con rutas
└── main.tsx         # Punto de entrada
```

## 📱 Rutas

- `/` - Página principal con lista de días
- `/workout/:day` - Detalle del entrenamiento del día

## 🎨 Características del Cronómetro

- **Modo Libre**: Cronómetro continuo sin límites
- **Tabata**: Intervalos de trabajo/descanso configurables
- **EMOM**: Every Minute On the Minute - resetea cada minuto

