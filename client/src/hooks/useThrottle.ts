import { useEffect, useRef, useState } from 'react'

export const useThrottle = <T>(value: T, limit = 300): T => {
  const [throttled, setThrottled] = useState(value)
  const lastRun = useRef(Date.now())

  useEffect(() => {
    if (Date.now() - lastRun.current >= limit) {
      setThrottled(value)
      lastRun.current = Date.now()
    }
  }, [value, limit])

  return throttled
}
