import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useConfig } from './config/ConfigContext'
import StartScreen from './views/StartScreen'
import MainApp from './views/MainApp'
import AdminPage from './pages/admin/AdminPage'
import AdminLayout from './pages/admin/AdminLayout'
import FrameDesignerPage from './pages/admin/FrameDesignerPage'
import AdminGate from './pages/admin/AdminGate'
import ResultViewPage from './pages/ResultViewPage'

function AppRoutes() {
    const config = useConfig()
    const { landing, app, admin } = config.routes

    return (
        <Routes>
            <Route path={landing} element={<StartScreen />} />
            <Route path={app} element={<MainApp />} />
            {config.features.admin ? (
                <Route
                    path={admin}
                    element={
                        <AdminGate>
                            <AdminLayout />
                        </AdminGate>
                    }
                >
                    <Route index element={<AdminPage />} />
                    <Route path="frames" element={<FrameDesignerPage />} />
                </Route>
            ) : (
                <Route path={admin} element={<Navigate to={landing} replace />} />
            )}
            <Route path="/result/:id" element={<ResultViewPage />} />
            <Route path="/advent" element={<Navigate to={landing} replace />} />
            <Route path="*" element={<Navigate to={landing} replace />} />
        </Routes>
    )
}

function App() {
    return (
        <BrowserRouter
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
            }}
        >
            <AppRoutes />
        </BrowserRouter>
    )
}

export default App
