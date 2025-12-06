import { Route, Routes, Navigate } from 'react-router-dom'
import AuthLayout from '@/components/layouts/AuthLayout'
import MainLayout from '@/components/layouts/MainLayout'
import { ProtectedRoute } from '@/middleware/ProtectedRoute'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/Dashboard'
import Home from '@/pages/Home'
import Signup from './pages/auth/Signup'

// APP ROOT COMPONENT.
const App = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<Signup />} />
      </Route>

      <Route element={<MainLayout />}>
        <Route path='/' element={<Home />} />
        <Route
          path='/dashboard'
          element={
            <ProtectedRoute allowedRoles={['user', 'admin']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path='/unauthorized' element={<div>Unauthorized Access</div>} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  )
}

export default App
