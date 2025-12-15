import { Outlet } from 'react-router-dom'
import Navbar from '@/components/layouts/Navbar'
import AppSidebar from '@/components/layouts/Sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export default function Layout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <Navbar />
        <div className='p-4'>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
