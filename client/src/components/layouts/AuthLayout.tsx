import { Outlet } from 'react-router-dom'

function AuthLayout() {
  return (
    <div className='relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gray-50 px-4'>
      <div className='w-96 md:w-108'>
        <Outlet />
      </div>
    </div>
  )
}

export default AuthLayout
