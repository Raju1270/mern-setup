import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router-dom'
import { toastConfig } from '@/utils/toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // DATA FRESH FOR 5 MINUTES
      gcTime: 30 * 60 * 1000, // CACHE STAYS IN MEMORY FOR 30 MINUTES
      refetchOnWindowFocus: false, // DON'T REFETCH WHEN USER SWITCHES BACK TO TAB
      refetchOnReconnect: false, // DON'T REFETCH IF INTERNET RECONNECTS
      retry: 1, // RETRY FAILED REQUESTS TWICE
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster toastOptions={toastConfig} />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
