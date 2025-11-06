import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { TimerProvider } from './contexts/TimerContext'
import HomePage from './pages/HomePage'
import WorkoutPage from './pages/WorkoutPage'

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TimerProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/workout/:day" element={<WorkoutPage />} />
            </Routes>
          </Router>
        </TimerProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App

