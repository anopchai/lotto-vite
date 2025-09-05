import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Ticket,
  FileText,
  Trophy,
  BarChart3,
  Settings,
  Users,
  X,
  Gamepad2
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import RoleGuard from './RoleGuard'
import clsx from 'clsx'

const Sidebar = ({ open, setOpen }) => {
  const location = useLocation()
  const { user } = useAuth()

  const navigation = [
    // เมนูสำหรับทุกคน (admin + user)
    { name: 'แดชบอร์ด', href: '/dashboard', icon: Home, roles: ['admin', 'user'] },
    { name: 'บันทึกหวย', href: '/ticket', icon: Ticket, roles: ['admin', 'user'] },
    { name: 'รายการบิล', href: '/bills', icon: FileText, roles: ['admin', 'user'] },
    { name: 'ผลรางวัล', href: '/results', icon: Trophy, roles: ['admin', 'user'] },
    { name: 'รายงาน', href: '/reports', icon: BarChart3, roles: ['admin', 'user'] },

    // เมนูสำหรับ Admin เท่านั้น
    { name: 'ตั้งค่า', href: '/settings', icon: Settings, roles: ['admin'] },
    { name: 'จัดการตัวแทน', href: '/agents', icon: Users, roles: ['admin'] },
  ]

  // กรองเมนูตาม role ของ user
  const userRole = user?.role
  const filteredNavigation = navigation.filter(item =>
    !item.roles || (userRole && item.roles.includes(userRole))
  )

  const isActive = (href) => {
    return location.pathname === href
  }

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4">
              <Gamepad2 className="w-8 h-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">LottoVite</span>
            </div>
            
            {/* Navigation */}
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'mr-3 flex-shrink-0 h-5 w-5',
                        isActive(item.href)
                          ? 'text-primary-600'
                          : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:hidden',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Gamepad2 className="w-8 h-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">LottoVite</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                    isActive(item.href)
                      ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon
                    className={clsx(
                      'mr-3 flex-shrink-0 h-5 w-5',
                      isActive(item.href)
                        ? 'text-primary-600'
                        : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}

export default Sidebar
