import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { loadEventConfig } from './loadConfig'

const ConfigContext = createContext(null)

export function ConfigProvider({ children }) {
    const [config, setConfig] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const reload = useCallback(() => {
        setLoading(true)
        setError(null)

        return loadEventConfig()
            .then(setConfig)
            .catch((err) => {
                console.error('설정 로드 실패:', err)
                setConfig(null)
                setError(err)
            })
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        reload()
    }, [reload])

    useEffect(() => {
        if (!config) return

        document.title = config.event.name

        const description = document.querySelector('meta[name="description"]')
        if (description) {
            description.setAttribute('content', config.event.tagline)
        }

        const bg = config.branding.startBackground
        if (bg) {
            document.documentElement.style.setProperty('--app-bg-image', `url(${bg})`)
        }

        if (config.branding.primaryColor) {
            document.documentElement.style.setProperty('--app-primary', config.branding.primaryColor)
        }

        if (config.branding.accentColor) {
            document.documentElement.style.setProperty('--app-accent', config.branding.accentColor)
        }

        if (config.branding.fontFamily) {
            document.documentElement.style.setProperty('--app-font', config.branding.fontFamily)
        }
    }, [config])

    if (loading) {
        return (
            <div className="config-loading">
                <p>로딩 중...</p>
            </div>
        )
    }

    if (error || !config) {
        return (
            <div className="config-error">
                <div className="config-error-card">
                    <h1 className="config-error-title">설정을 불러오지 못했습니다</h1>
                    <p className="config-error-message">
                        {error?.message || '프레임 또는 행사 설정을 확인해 주세요.'}
                    </p>
                    <p className="config-error-hint">
                        event.json의 framesPath, Supabase themes 버킷, overlay PNG URL을 확인한 뒤
                        다시 시도하세요.
                    </p>
                    <button type="button" className="config-error-retry" onClick={reload}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    return (
        <ConfigContext.Provider value={config}>
            {children}
        </ConfigContext.Provider>
    )
}

export function useConfig() {
    const context = useContext(ConfigContext)
    if (!context) {
        throw new Error('useConfig는 ConfigProvider 안에서 사용해야 합니다.')
    }
    return context
}
