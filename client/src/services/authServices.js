import { apiService } from '@/services/apiService'
import { showError, showSuccess } from '@/utils/toast'
import { useAuthStore } from '../store/AuthStore'
import { parseError } from '../utils/parseError'

// LOGIN SERVICE.
export const LoginService = async (payload) => {
  try {
    const response = await apiService.post('api/v1/auth/login', payload)

    if (response?.success && response?.accessToken) {
      useAuthStore.getState().login(response)
      showSuccess('Login successful!')
      return response
    }

    showError('Invalid response from server')
    throw new Error('Invalid login response')
  } catch (error) {
    showError(parseError(error))
    throw error
  }
}

// SIGNUP SERVICE.
export const SignupService = async (payload) => {
  try {
    const response = await apiService.post('api/v1/auth/signup', payload)

    if (response?.success && response?.accessToken) {
      useAuthStore.getState().login(response)
      showSuccess('Account created successfully!')
      return response
    }

    showError('Invalid response from server')
    throw new Error('Invalid signup response')
  } catch (error) {
    showError(parseError(error))
    throw error
  }
}

// LOGOUT SERVICE.
export const LogoutService = async () => {
  try {
    await apiService.post('api/v1/auth/logout')
    useAuthStore.getState().logout()
    showSuccess('Logged out successfully')
  } catch (error) {
    // LOGOUT CLIENT-SIDE EVEN IF API FAILS.
    useAuthStore.getState().logout()
    showError(parseError(error))
  }
}

// VERIFY TOKEN SERVICE.
export const VerifyTokenService = async () => {
  try {
    const response = await apiService.get('api/v1/auth/verify')

    if (response?.success) {
      return response
    }

    throw new Error('Token verification failed')
  } catch (error) {
    useAuthStore.getState().logout()
    throw error
  }
}

// GET CURRENT USER SERVICE.
export const GetCurrentUserService = async () => {
  try {
    const response = await apiService.get('api/v1/auth/me')

    if (response?.success) {
      return response.user
    }

    throw new Error('Failed to fetch user')
  } catch (error) {
    showError(parseError(error))
    throw error
  }
}
