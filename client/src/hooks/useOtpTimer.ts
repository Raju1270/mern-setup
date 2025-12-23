import { useEffect, useState } from 'react'

export const useOtpTimer = (initialSeconds = 300) => {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (timeLeft <= 0) return

    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(t - 1, 0))
    }, 1000)

    return () => clearInterval(id)
  }, [timeLeft])

  return {
    timeLeft,
    canResend: timeLeft === 0,
    start: () => setTimeLeft(initialSeconds),
    reset: () => setTimeLeft(0),
  }
}
