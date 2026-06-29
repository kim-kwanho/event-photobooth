import { useState, useEffect } from 'react'
import { useConfig } from '../../config/ConfigContext'
import './AdminGate.css'

const AUTH_KEY_PREFIX = 'photobooth_admin_auth_'

function AdminGate({ children }) {
    const config = useConfig()
    const eventId = config.event?.id || 'default'
    const adminPin = import.meta.env.VITE_ADMIN_PIN
    const authKey = `${AUTH_KEY_PREFIX}${eventId}`

    const [authed, setAuthed] = useState(false)
    const [pinInput, setPinInput] = useState('')
    const [error, setError] = useState('')

    const pinRequired = Boolean(adminPin && adminPin.trim())

    useEffect(() => {
        if (!pinRequired) {
            setAuthed(true)
            return
        }
        setAuthed(sessionStorage.getItem(authKey) === '1')
    }, [pinRequired, authKey])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (pinInput === adminPin) {
            sessionStorage.setItem(authKey, '1')
            setAuthed(true)
            setError('')
        } else {
            setError('비밀번호가 올바르지 않습니다.')
        }
    }

    if (authed) {
        return children
    }

    return (
        <div className="admin-gate-page">
            <div className="admin-gate-card">
                <h1>관리자 인증</h1>
                <p>관리 페이지에 접근하려면 비밀번호를 입력하세요.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        inputMode="numeric"
                        placeholder="관리자 PIN"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        autoFocus
                    />
                    {error && <p className="admin-gate-error">{error}</p>}
                    <button type="submit" className="btn btn-primary">
                        입장
                    </button>
                </form>
            </div>
        </div>
    )
}

export default AdminGate
