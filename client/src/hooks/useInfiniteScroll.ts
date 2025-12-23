import { useEffect } from 'react'

export const useInfiniteScroll = (
  ref: React.RefObject<HTMLElement>,
  callback: () => void,
  enabled = true
) => {
  useEffect(() => {
    if (!enabled || !ref.current) return

    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && callback(), {
      threshold: 1,
    })

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [callback, enabled, ref])
}
