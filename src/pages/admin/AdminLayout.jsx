import { NavLink, Outlet } from 'react-router-dom'
import { useConfig } from '../../config/ConfigContext'
import './AdminLayout.css'

function AdminLayout() {
    const config = useConfig()
    const adminBase = config.routes.admin

    return (
        <div className="admin-layout">
            <header className="admin-layout-header">
                <div>
                    <h1>{config.event.name} · 관리</h1>
                    <p>사진 관리(Supabase Storage)</p>
                </div>
                <nav className="admin-layout-nav">
                    <NavLink to={adminBase} end className={({ isActive }) => (isActive ? 'active' : '')}>
                        사진 관리
                    </NavLink>
                </nav>
            </header>
            <main className="admin-layout-main">
                <Outlet />
            </main>
        </div>
    )
}

export default AdminLayout
