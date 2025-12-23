'use client'

import { LogOut, Mail, Menu, Settings, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useAuthStore } from '@/store/AuthStore'
import { getInitials } from '@/utils/utils'

const Navbar = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const handleLogout = async () => {
    useAuthStore.getState().logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className='flex items-center justify-between border-b px-4 py-2'>
      <SidebarTrigger className='cursor-pointer p-2'>
        <Menu className='h-6 w-6' />
      </SidebarTrigger>

      <h1 className='text-lg font-bold'>LOGO</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className='h-8 w-8 cursor-pointer'>
            <AvatarImage
              src={user?.profilePhoto ? user.profilePhoto : 'https://github.com/shadcn.png'}
            />
            <AvatarFallback>
              {user?.userName ? getInitials(user.userName) : <User className='h-4 w-4' />}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className='mt-1 w-64 rounded-md border shadow-sm'
          align='end'
          sideOffset={8}
        >
          <div className='flex items-center gap-3 px-3 py-1.5'>
            <Avatar className='h-8 w-8'>
              <AvatarImage
                src={user?.profilePhoto ? user.profilePhoto : 'https://github.com/shadcn.png'}
              />
              <AvatarFallback>
                {user?.userName ? getInitials(user.userName) : <User className='h-5 w-5' />}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className='text-sm leading-none font-medium'>{user?.userName || 'User'}</p>
              <p className='text-muted-foreground flex items-center gap-1 text-xs'>
                <Mail className='h-3 w-3' /> {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className='text-muted-foreground px-3 text-xs'>
            Account
          </DropdownMenuLabel>
          <DropdownMenuItem className='cursor-pointer' onClick={() => navigate('/profile')}>
            <User className='mr-1 h-4 w-4' /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem className='cursor-pointer' onClick={() => navigate('/settings')}>
            <Settings className='mr-1 h-4 w-4' /> Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className='cursor-pointer text-red-600 focus:text-red-600'
            onClick={handleLogout}
          >
            <LogOut className='mr-1 h-4 w-4' /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

export default Navbar
