import { Routes, Route } from 'react-router'
import App from './App'
import CheckInPage from './pages/CheckInPg'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/check-in/:token" element={<CheckInPage />} />
      <Route path="*" element={<App />} />
    </Routes>
  )
}