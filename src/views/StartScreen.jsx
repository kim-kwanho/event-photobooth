import { useNavigate } from 'react-router-dom'
import { useRef, useEffect, useCallback, useState } from 'react'
import { useConfig } from '../config/ConfigContext'
import './StartScreen.css'

const STEPS = ['프레임', '촬영', '완성']

function StartScreen() {
    const navigate = useNavigate()
    const config = useConfig()
    const buttonRef = useRef(null)
    const { name, tagline } = config.event
    const { startBackground, primaryColor, accentColor } = config.branding
    const appRoute = config.routes.app
    const kioskMode = config.features?.kioskMode
    const [pulse, setPulse] = useState(true)

    const hasBgImage = startBackground && startBackground.trim() !== ''

    const handleStart = useCallback(() => {
        navigate(appRoute)
    }, [navigate, appRoute])

    useEffect(() => {
        const interval = setInterval(() => setPulse((p) => !p), 2000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const button = buttonRef.current
        if (!button) return

        const handleTouchStart = (e) => {
            e.preventDefault()
            e.stopPropagation()
        }

        const handleTouchMove = (e) => {
            e.preventDefault()
            e.stopPropagation()
        }

        const handleTouchEnd = (e) => {
            e.preventDefault()
            e.stopPropagation()
            handleStart()
        }

        button.addEventListener('touchstart', handleTouchStart, { passive: false })
        button.addEventListener('touchmove', handleTouchMove, { passive: false })
        button.addEventListener('touchend', handleTouchEnd, { passive: false })

        return () => {
            button.removeEventListener('touchstart', handleTouchStart)
            button.removeEventListener('touchmove', handleTouchMove)
            button.removeEventListener('touchend', handleTouchEnd)
        }
    }, [handleStart])

    return (
        <div
            className={`start-screen-full${kioskMode ? ' start-screen--attract' : ''}${hasBgImage ? '' : ' start-screen--gradient'}`}
            style={{
                '--start-primary': primaryColor || '#7C3AED',
                '--start-accent': accentColor || '#F472B6',
            }}
            onClick={kioskMode ? handleStart : undefined}
            role={kioskMode ? 'button' : undefined}
            tabIndex={kioskMode ? 0 : undefined}
        >
            {!hasBgImage && <div className="start-bg-gradient" aria-hidden="true" />}
            {hasBgImage && (
                <div
                    className="start-screen-background loaded"
                    style={{ backgroundImage: `url(${startBackground})` }}
                />
            )}
            <div className="start-bg-orbs" aria-hidden="true" />

            <div className="start-screen-container">
                <header className="start-hero">
                    <p className="start-eyebrow">PHOTO BOOTH</p>
                    <h1 className="start-title">{name}</h1>
                    <p className="start-subtitle">{tagline}</p>
                </header>

                <div className="start-strip-mockup" aria-hidden="true">
                    <div className="start-strip-frame">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="start-strip-slot">
                                <span className="start-strip-icon">📷</span>
                            </div>
                        ))}
                        <div className="start-strip-footer" />
                    </div>
                </div>

                <nav className="start-steps" aria-label="진행 순서">
                    {STEPS.map((label, i) => (
                        <span key={label} className="start-step">
                            <span className="start-step-num">{i + 1}</span>
                            {label}
                        </span>
                    ))}
                </nav>

                <div className={`start-cta-wrap${pulse ? ' pulse' : ''}`}>
                    <button
                        ref={buttonRef}
                        type="button"
                        className="btn-start booth-touch-cta"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleStart()
                        }}
                    >
                        {kioskMode ? '화면을 터치하여 시작' : '시작하기'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default StartScreen
