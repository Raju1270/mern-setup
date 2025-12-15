import toast from 'react-hot-toast'

// Toast configuration
export const toastConfig = {
  duration: 3000,
  position: 'top-right',
  style: {
    borderRadius: '8px',
    background: '#fff',
    color: '#333',
  },
  success: {
    iconTheme: {
      primary: '#10B981',
      secondary: '#fff',
    },
  },
  error: {
    iconTheme: {
      primary: '#EF4444',
      secondary: '#fff',
    },
  },
}

// Custom toast functions with consistent styling
export const showSuccess = (message) => {
  toast.success(message, toastConfig)
}

export const showError = (message) => {
  toast.error(message, toastConfig)
}

export const showLoading = (message) => {
  return toast.loading(message, toastConfig)
}

export const dismissToast = (toastId) => {
  toast.dismiss(toastId)
}

export const dismissAllToasts = () => {
  toast.dismiss()
}

export default toast
