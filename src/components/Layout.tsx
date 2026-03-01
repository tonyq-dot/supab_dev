import { Outlet, NavLink, Link } from 'react-router-dom'
import './Layout.css'
import { useAuth } from '@/hooks/useAuth'
import { useUserRole } from '@/hooks/useUserRole'
import { supabase } from '@/lib/supabase'

export default function Layout() {
  const { user } = useAuth()
  const { isManager } = useUserRole(user?.id)

  const handleLogout = () => {
    supabase.auth.signOut()
  }

  return (
    <div className="layout">
      <header className="header">
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Дашборд
          </NavLink>
          <NavLink to="/add" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Добавить работу
          </NavLink>
          <NavLink to="/works" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Мои работы
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Проекты
          </NavLink>
          <NavLink to="/report/detailed" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Детальный отчёт
          </NavLink>
          <NavLink to="/gallery" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Галерея
          </NavLink>
          {isManager && (
            <>
              <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Настройки
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Отчёты
              </NavLink>
            </>
          )}
        </nav>
        <div className="header-right">
          <Link to="/profile" className="header-profile-link">
            {user?.email}
          </Link>
          <button type="button" onClick={handleLogout} className="btn btn-outline">
            Выйти
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
