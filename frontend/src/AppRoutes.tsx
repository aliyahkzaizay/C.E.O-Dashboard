import { Routes, Route } from 'react-router'
import App from './App'
import CheckInPage from './pages/CheckIn'
import SharePanelDemo from './pages/SharePanelDemo'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/check-in/:token" element={<CheckInPage />} />
      {import.meta.env.DEV && <Route path="/share-panel/" element={<SharePanelDemo />} />}
      {/* <Route path="/share-panel-demo" element={<SharePanelDemo />} /> */}
      <Route path="*" element={<App />} />
    </Routes>
  )
}