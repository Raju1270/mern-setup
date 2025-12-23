// import { useEffect, useRef } from 'react'
// import { io, Socket } from 'socket.io-client'

// export const useSocket = (url: string) => {
//   const socketRef = useRef<Socket | null>(null)

//   useEffect(() => {
//     socketRef.current = io(url)
//     return () => socketRef.current?.disconnect()
//   }, [url])

//   return socketRef
// }
