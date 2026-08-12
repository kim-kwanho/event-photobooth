import { useEffect } from 'react'
import './Toast.css'

function Toast({ message, variant = 'error', durationMs = 3200, onClose }) {
    useEffect(() => {
        const timer = window.setTimeout(() => onClose?.(), durationMs)
        return () => window.clearTimeout(timer)
    }, [durationMs, onClose])

    return (
        <div
            className={`app-toast app-toast--${variant}`}
            role="alert"
            aria-live="assertive"
        >
            {message}
        </div>
    )
}

export default Toast
