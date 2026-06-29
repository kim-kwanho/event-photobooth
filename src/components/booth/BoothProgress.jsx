import { BOOTH_STEP_META } from '../../hooks/useBoothFlow'
import './BoothProgress.css'

function BoothProgress({ steps, currentScreen }) {
    const currentIndex = steps.indexOf(currentScreen)

    return (
        <nav className="booth-progress" aria-label="진행 단계">
            {steps.map((stepId, index) => {
                const meta = BOOTH_STEP_META[stepId] || { label: stepId }
                const isActive = index === currentIndex
                const isDone = index < currentIndex

                return (
                    <div key={stepId} className="booth-progress-group">
                        {index > 0 && <div className="booth-progress-line" />}
                        <div
                            className={`booth-progress-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}
                        >
                            <span className="booth-progress-dot">{index + 1}</span>
                            <span className="booth-progress-label">{meta.label}</span>
                        </div>
                    </div>
                )
            })}
        </nav>
    )
}

export default BoothProgress
