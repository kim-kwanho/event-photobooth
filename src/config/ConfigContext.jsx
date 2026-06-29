import { createContext, useContext, useEffect, useState } from 'react'
import { loadEventConfig } from './loadConfig'

const ConfigContext = createContext(null)

export function ConfigProvider({ children }) {
    const [config, setConfig] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadEventConfig()
            .then(setConfig)
            .finally(() => setLoading(false))
    }, [])

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
