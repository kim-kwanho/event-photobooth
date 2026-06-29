import BoothProgress from './BoothProgress'
import { getBoothSteps } from '../../hooks/useBoothFlow'

function BoothShell({
    children,
    currentScreen,
    frameFirst,
    frameSelect,
    kioskMode,
    title,
    subtitle,
    bare = false,
}) {
    const steps = getBoothSteps({ frameFirst, frameSelect })
    const showProgress = steps.length > 1 && (kioskMode || currentScreen !== 'camera')

    return (
        <div className={`booth-shell${kioskMode ? ' booth-shell--kiosk' : ''}`}>
            {showProgress && (
                <BoothProgress steps={steps} currentScreen={currentScreen} />
            )}
            {(title || subtitle) && (
                <header className="booth-screen-header">
                    {title && <h2 className="booth-title">{title}</h2>}
                    {subtitle && <p className="booth-subtitle">{subtitle}</p>}
                </header>
            )}
            {bare ? (
                <div className="booth-bare-content">{children}</div>
            ) : (
                <div className="booth-stage-outer">
                    <div className="booth-stage">
                        <div className="booth-stage-inner">{children}</div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default BoothShell
