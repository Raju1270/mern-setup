import axios from 'axios'
import { useAuthStore } from '../store/AuthStore'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const apiCall = async ({
  endpoint,
  method = 'GET',
  payload = null,
  onUploadProgress = null,
}) => {
  try {
    const { token } = useAuthStore.getState()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const config = {
      url: `${baseURL}/${endpoint}`,
      method: method.toUpperCase(),
      headers,
      ...(payload && { data: payload }),
      ...(onUploadProgress && { onUploadProgress }),
    }

    const response = await axios(config)

    return response.data
  } catch (error) {
    if (error?.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    throw error
  }
}

export const apiService = {
  get: (endpoint, config = {}) => apiCall({ endpoint, method: 'GET', ...config }),

  post: (endpoint, data = {}, config = {}) =>
    apiCall({ endpoint, method: 'POST', payload: data, ...config }),

  put: (endpoint, data = {}, config = {}) =>
    apiCall({ endpoint, method: 'PUT', payload: data, ...config }),

  patch: (endpoint, data = {}, config = {}) =>
    apiCall({ endpoint, method: 'PATCH', payload: data, ...config }),

  delete: (endpoint, config = {}) => apiCall({ endpoint, method: 'DELETE', ...config }),

  upload: (endpoint, formData, onUploadProgress = null) =>
    apiCall({ endpoint, method: 'POST', payload: formData, onUploadProgress }),
}
