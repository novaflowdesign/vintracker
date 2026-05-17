import { NavLink, Link, Outlet } from 'react-router-dom'
import InstallPrompt from './InstallPrompt'
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  TrendingUp,
  Settings,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../hooks/useAuth'

const links = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', end: true  },
  { to: '/inventory', icon: Package,         label: 'Magazyn',   end: false },
  { to: '/add',       icon: PlusCircle,      label: 'Dodaj',     end: false },
  { to: '/sales',     icon: TrendingUp,      label: 'Sprzedaż',  end: false },
  { to: '/settings',  icon: Settings,        label: 'Ustawienia',end: false },
]

export default function Layout() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-56 fixed inset-y-0 bg-white border-r border-gray-200 px-3 py-6">
        <Link to="/" className="flex items-center gap-2.5 px-4 mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="w-8 h-8 rounded-lg shrink-0" />
          <span className="text-base font-semibold text-slate-900">Vintracker</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {links.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={signOut}
          className="px-4 text-sm text-gray-400 hover:text-gray-600 text-left transition-colors"
        >
          Wyloguj
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-56 pb-20 md:pb-0">
        <Outlet />
      </main>

      <InstallPrompt />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50">
        {links.map(({ to, icon: Icon, label, end }) =>
          to === '/add' ? (
            <NavLink
              key={to}
              to={to}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <PlusCircle size={24} className="text-white" strokeWidth={2} />
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 text-xs font-medium transition-colors px-2 py-1',
                  isActive ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ),
        )}
      </nav>
    </div>
  )
}
