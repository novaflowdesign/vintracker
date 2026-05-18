import { useState } from 'react'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import InstallPrompt from './InstallPrompt'
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  TrendingUp,
  Settings,
  FileText,
  Plus,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../hooks/useAuth'

const sidebarLinks = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', end: true  },
  { to: '/inventory', icon: Package,         label: 'Magazyn',   end: false },
  { to: '/add',       icon: PlusCircle,      label: 'Dodaj',     end: false },
  { to: '/opisy',     icon: FileText,        label: 'Opisy',     end: false },
  { to: '/sales',     icon: TrendingUp,      label: 'Sprzedaż',  end: false },
  { to: '/settings',  icon: Settings,        label: 'Ustawienia',end: false },
]

const mobileNavLinks = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard', end: true  },
  { to: '/inventory', icon: Package,         label: 'Magazyn',   end: false },
  { to: '/opisy',     icon: FileText,        label: 'Opisy',     end: false },
  { to: '/sales',     icon: TrendingUp,      label: 'Sprzedaż',  end: false },
  { to: '/settings',  icon: Settings,        label: 'Ustawienia',end: false },
]

function AddFab() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      <div
        className="md:hidden fixed z-50 flex flex-col items-end gap-2"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 0.875rem)', right: '1rem' }}
      >
        {open && (
          <>
            <button
              onClick={() => { navigate('/add?bundle=1'); setOpen(false) }}
              className="fab-option fab-option-1 flex items-center gap-2.5 bg-white dark:bg-slate-800 shadow-lg rounded-full pl-4 pr-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 border border-gray-100 dark:border-slate-700"
            >
              <Package size={16} className="text-violet-600 shrink-0" />
              Zestaw
            </button>
            <button
              onClick={() => { navigate('/add'); setOpen(false) }}
              className="fab-option fab-option-2 flex items-center gap-2.5 bg-white dark:bg-slate-800 shadow-lg rounded-full pl-4 pr-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 border border-gray-100 dark:border-slate-700"
            >
              <Plus size={16} className="text-emerald-600 shrink-0" />
              Jedna rzecz
            </button>
          </>
        )}

        <button
          onClick={() => setOpen(v => !v)}
          className="w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95"
          aria-label="Dodaj"
        >
          <Plus
            size={24}
            className={clsx('transition-transform duration-200', open && 'rotate-45')}
          />
        </button>
      </div>
    </>
  )
}

export default function Layout() {
  const { signOut } = useAuth()

  return (
    <>
    <div
      className="fixed top-0 inset-x-0 z-50 bg-gray-50 dark:bg-slate-950 pointer-events-none"
      style={{ height: 'env(safe-area-inset-top)' }}
    />
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 md:flex" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-56 fixed inset-y-0 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 px-3 py-6">
        <Link to="/" className="flex items-center gap-2.5 px-4 mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="w-8 h-8 rounded-lg shrink-0" />
          <span className="text-base font-semibold text-slate-900 dark:text-white">Vintracker</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {sidebarLinks.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700',
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
          className="px-4 text-sm text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 text-left transition-colors"
        >
          Wyloguj
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-56 md:pb-0" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <Outlet />
      </main>

      <InstallPrompt />
      <AddFab />

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex justify-around items-center z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        {mobileNavLinks.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-1 text-xs font-medium transition-colors px-2 py-1',
                isActive ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white',
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
        ))}
      </nav>
    </div>
    </>
  )
}
