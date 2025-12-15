export const parseError = (error) => {
  if (!error) return 'An error occurred'

  return (
    error.response?.data?.message ||
    error.data?.message ||
    error.message ||
    error.error ||
    'An error occurred'
  )
}
