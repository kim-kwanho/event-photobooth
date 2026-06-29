/** 배포 URL (QR·공유 링크용). VITE_APP_URL 미설정 시 현재 origin 사용 */
export function getAppUrl() {
    const envUrl = import.meta.env.VITE_APP_URL
    if (envUrl && envUrl.trim()) {
        return envUrl.trim().replace(/\/$/, '')
    }
    if (typeof window !== 'undefined') {
        return window.location.origin
    }
    return ''
}

export function getResultUrl(hash) {
    return `${getAppUrl()}/result/${hash}`
}

/** API 베이스 URL (프록시 또는 절대 URL) */
export function getApiBaseUrl() {
    return (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
}

export function getPrintApiUrl() {
    return `${getApiBaseUrl()}/print`
}
