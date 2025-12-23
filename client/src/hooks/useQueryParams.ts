import { useSearchParams } from 'react-router-dom'

export const useQueryParams = <T extends Record<string, string>>() => {
  const [searchParams, setSearchParams] = useSearchParams()

  const getAll = (): T => {
    const params = {} as T
    searchParams.forEach((value, key) => {
      params[key as keyof T] = value as T[keyof T]
    })
    return params
  }

  const set = (key: string, value: string) => {
    searchParams.set(key, value)
    setSearchParams(searchParams)
  }

  const remove = (key: string) => {
    searchParams.delete(key)
    setSearchParams(searchParams)
  }

  return { getAll, set, remove }
}
