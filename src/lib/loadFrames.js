import { frames as fallbackFrames } from './frames.js'
import { getThemeFramesPublicUrl } from './themeStorage'

function resolveFramesPath(theme) {
    if (theme?.framesStorage === 'supabase' && theme?.id) {
        try {
            return getThemeFramesPublicUrl(theme.id)
        } catch {
            console.warn('Supabase URL 생성 실패, framesPath 사용')
        }
    }
    return theme?.framesPath || '/themes/default/frames.json'
}

/** 테마 JSON에서 프레임 목록 로드 */
export async function loadThemeFrames(theme) {
    const path = resolveFramesPath(theme)

    try {
        const response = await fetch(path, { cache: 'no-store' })
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        const frames = data.frames ?? data
        if (!Array.isArray(frames) || frames.length === 0) {
            throw new Error('프레임 데이터가 비어 있습니다.')
        }
        return frames
    } catch (error) {
        console.warn(`프레임 로드 실패 (${path}), 기본 frames.js 사용:`, error)
        return fallbackFrames
    }
}
