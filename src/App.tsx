import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import AddWork from '@/pages/AddWork'
import MyWorks from '@/pages/MyWorks'
import Projects from '@/pages/Projects'
import Admin from '@/pages/Admin'
import Reports from '@/pages/Reports'
import Profile from '@/pages/Profile'
import ReportDetailed from '@/pages/ReportDetailed'
import Gallery from '@/pages/Gallery'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Загрузка...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="add" element={<AddWork />} />
        <Route path="works" element={<MyWorks />} />
        <Route path="projects" element={<Projects />} />
        <Route path="admin" element={<Admin />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<Profile />} />
        <Route path="report/detailed" element={<ReportDetailed />} />
        <Route path="gallery" element={<Gallery />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
