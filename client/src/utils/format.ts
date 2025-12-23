import { endOfDay, format, isValid, parseISO, startOfDay } from 'date-fns'

// FORMAT TIME AS MM:SS.
export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'

  const total = Math.floor(seconds)
  const mins = Math.floor(total / 60)
  const secs = total % 60

  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const formatDateForUI = (isoString: string): string => {
  if (!isoString) return ''

  const date = parseISO(isoString)
  if (!isValid(date)) return ''

  return format(date, 'dd/MM/yyyy hh:mm a').toUpperCase()
}

export const formatDateForBackend = (yyyyMmDd: string): { from: string; to: string } | null => {
  if (!yyyyMmDd) return null

  const date = new Date(`${yyyyMmDd}T00:00:00Z`)
  if (!isValid(date)) return null

  return {
    from: startOfDay(date).toISOString(),
    to: endOfDay(date).toISOString(),
  }
}
