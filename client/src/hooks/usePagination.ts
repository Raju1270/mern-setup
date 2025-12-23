import { useState } from 'react'

export const usePagination = (initialPage = 1, pageSize = 10) => {
  const [page, setPage] = useState(initialPage)

  const next = () => setPage((p) => p + 1)
  const prev = () => setPage((p) => Math.max(p - 1, 1))
  const reset = () => setPage(initialPage)

  return { page, pageSize, next, prev, reset, setPage }
}
