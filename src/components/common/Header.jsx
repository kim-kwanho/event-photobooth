import { useConfig } from '../../config/ConfigContext'
import './Header.css'

function Header({ onMenuClick, showMenu = true, kioskMode = false, isFullscreen = false, onEnterFullscreen }) {
    const config = useConfig()

    return (
        <header className={`header${kioskMode ? ' header--kiosk' : ''}`}>
            {showMenu ? (
                <button className="menu-btn" onClick={onMenuClick} type="button">☰</button>
            ) : (
                <span className="menu-btn menu-btn--placeholder" aria-hidden="true" />
            )}
            <h1>{config.event.name}</h1>
            {kioskMode && !isFullscreen && (
                <button
                    type="button"
                    className="fullscreen-btn"
                    onClick={onEnterFullscreen}
                >
                    ⛶
                </button>
            )}
        </header>
    )
}

export default Header
