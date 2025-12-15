import { Navigate, Route, Routes } from 'react-router-dom'
import AuthLayout from '@/components/layouts/AuthLayout'
import MainLayout from '@/components/layouts/MainLayout'
import { ProtectedRoute } from '@/middleware/ProtectedRoute'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/Dashboard'
import Home from '@/pages/Home'
import Profile from '@/pages/Profile'
import Settings from '@/pages/Settings'
import ForgetPassword from './pages/auth/ForgetPassword'
import Signup from './pages/auth/Signup'

// APP ROOT COMPONENT.
const App = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<Signup />} />
        <Route path='/forgot-password' element={<ForgetPassword />} />
      </Route>

      <Route element={<MainLayout />}>
        <Route path='/dashboard' element={<Dashboard />} />
        <Route
          path='/'
          element={
            <ProtectedRoute allowedRoles={['user', 'admin']}>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path='/profile'
          element={
            <ProtectedRoute allowedRoles={['user', 'admin']}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path='/settings'
          element={
            <ProtectedRoute allowedRoles={['user', 'admin']}>
              <Settings />
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
