import './KioskIdleOverlay.css'

function KioskIdleOverlay({ secondsLeft }) {
    if (!secondsLeft || secondsLeft > 10) return null

    return (
        <div className="kiosk-idle-overlay" role="status" aria-live="polite">
            <div className="kiosk-idle-card">
                <p className="kiosk-idle-title">잠시 활동이 없습니다</p>
                <p className="kiosk-idle-count">{secondsLeft}초 후 처음 화면으로 돌아갑니다</p>
                <p className="kiosk-idle-hint">화면을 터치하면 계속 이용할 수 있어요</p>
            </div>
        </div>
    )
}

export default KioskIdleOverlay
