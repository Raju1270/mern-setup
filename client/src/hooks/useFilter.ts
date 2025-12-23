import { useState } from 'react'

export const useFilter = <T extends object>(initial: T) => {
  const [filters, setFilters] = useState<T>(initial)

  const update = <K extends keyof T>(key: K, value: T[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(initial)

  return { filters, update, reset }
}
