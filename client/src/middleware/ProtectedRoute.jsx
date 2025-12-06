import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/AuthStore'

// PROTECTED ROUTE WRAPPER.
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, checkAuth } = useAuthStore()
  const location = useLocation()

  // CHECK AUTH STATUS.
  if (!checkAuth()) {
    return <Navigate to='/login' state={{ from: location }} replace />
  }

  // PUBLIC ROUTE - ALLOW ALL.
  if (allowedRoles.includes('Public')) {
    return children
  }

  // NOT AUTHENTICATED.
  if (!isAuthenticated || !user) {
    return <Navigate to='/login' state={{ from: location }} replace />
  }

  // CHECK ROLE AUTHORIZATION.
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to='/unauthorized' replace />
  }

  return children
}
