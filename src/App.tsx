import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import AddItem from './pages/AddItem'
import Sales from './pages/Sales'
import Settings from './pages/Settings'
import Opisy from './pages/Opisy'

function ToasterPositioned() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  return isDesktop
    ? <Toaster richColors position="top-center"    duration={3000} offset="calc(env(safe-area-inset-top) + 0.5rem)" />
    : <Toaster richColors position="bottom-center" duration={3000} offset="calc(4rem + env(safe-area-inset-bottom) + 0.75rem)" />
}

export default function App() {
  return (
    <>
    <ToasterPositioned />
    <BrowserRouter basename="/vintracker">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="add" element={<AddItem />} />
            <Route path="sales" element={<Sales />} />
            <Route path="opisy" element={<Opisy />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </>
  )
}
