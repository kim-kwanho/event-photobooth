import { defaultEventConfig } from './defaults'
import { validateEventConfig } from './validateEventConfig'
import { loadThemeFrames } from '../lib/loadFrames'
import { preloadFrameAssets } from '../lib/canvasFrame'

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
        const { warnings } = validateEventConfig(config)
        for (const warning of warnings) {
            console.warn(`[event.json] ${warning}`)
        }
    } catch (error) {
        // 스키마 오류는 기본값으로 덮어쓰지 않고 화면에 표시
        if (error instanceof Error && error.message.startsWith('event.json 설정 오류')) {
            throw error
        }
        console.warn('event.json 로드 실패, 기본 설정 사용:', error)
        const { warnings } = validateEventConfig(config)
        for (const warning of warnings) {
            console.warn(`[event.json] ${warning}`)
        }
    }

    const { frames, sizes } = await loadThemeFrames(config.theme)
    await preloadFrameAssets(frames)
    return { ...config, frames, sizes }
}
