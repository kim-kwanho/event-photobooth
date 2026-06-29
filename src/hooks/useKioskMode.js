import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 키오스크 모드: 유휴 타이머, 전체화면, 터치 활동 감지
 */
export function useKioskMode({ enabled, idleSeconds = 60, onIdle }) {
    const [secondsLeft, setSecondsLeft] = useState(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const lastActivityRef = useRef(Date.now())
    const onIdleRef = useRef(onIdle)

    onIdleRef.current = onIdle

    const touchActivity = useCallback(() => {
        lastActivityRef.current = Date.now()
        setSecondsLeft(null)
    }, [])

    const enterFullscreen = useCallback(async () => {
        try {
            const el = document.documentElement
            if (!document.fullscreenElement && el.requestFullscreen) {
                await el.requestFullscreen()
            }
        } catch (error) {
            console.warn('전체화면 진입 실패:', error)
        }
    }, [])

    useEffect(() => {
        if (!enabled) return undefined

        const events = ['touchstart', 'touchmove', 'mousedown', 'keydown', 'click', 'pointerdown']
        events.forEach((event) => {
            document.addEventListener(event, touchActivity, { passive: true })
        })

        const tick = setInterval(() => {
            const elapsed = (Date.now() - lastActivityRef.current) / 1000
            const remaining = idleSeconds - elapsed

            if (remaining <= 0) {
                onIdleRef.current?.()
                lastActivityRef.current = Date.now()
                setSecondsLeft(null)
            } else if (remaining <= 10) {
                setSecondsLeft(Math.ceil(remaining))
            } else {
                setSecondsLeft(null)
            }
        }, 500)

        return () => {
            events.forEach((event) => {
                document.removeEventListener(event, touchActivity)
            })
            clearInterval(tick)
        }
    }, [enabled, idleSeconds, touchActivity])

    useEffect(() => {
        if (!enabled) return undefined

        const onFsChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement))
        }

        document.addEventListener('fullscreenchange', onFsChange)
        onFsChange()

        return () => document.removeEventListener('fullscreenchange', onFsChange)
    }, [enabled])

    return { secondsLeft, isFullscreen, enterFullscreen, touchActivity }
}
