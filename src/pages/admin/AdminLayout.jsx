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
                    <p>사진 관리와 프레임 디자인을 한곳에서</p>
                </div>
                <nav className="admin-layout-nav">
                    <NavLink to={adminBase} end className={({ isActive }) => (isActive ? 'active' : '')}>
                        사진 관리
                    </NavLink>
                    <NavLink to={`${adminBase}/frames`} className={({ isActive }) => (isActive ? 'active' : '')}>
                        프레임 디자인
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
