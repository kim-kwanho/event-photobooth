import { defaultEventConfig } from './defaults'
import { loadThemeFrames } from '../lib/loadFrames'

function deepMerge(target, source) {
    const result = { ...target }
    for (const key of Object.keys(source)) {
        const value = source[key]
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = deepMerge(target[key] || {}, value)
        } else {
            result[key] = value
        }
    }
    return result
}

/** public/config/event.json + 테마 프레임 로드 후 기본값과 병합 */
export async function loadEventConfig() {
    let config = defaultEventConfig

    try {
        const response = await fetch('/config/event.json')
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }
        const remote = await response.json()
        config = deepMerge(defaultEventConfig, remote)
    } catch (error) {
        console.warn('event.json 로드 실패, 기본 설정 사용:', error)
    }

    const frames = await loadThemeFrames(config.theme)
    return { ...config, frames }
}
