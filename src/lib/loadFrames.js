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

function normalizeThemePayload(data, theme) {
    const frames = data.frames ?? data
    if (!Array.isArray(frames) || frames.length === 0) {
        throw new Error('프레임 데이터가 비어 있습니다.')
    }

    const sizes = Array.isArray(data.sizes) && data.sizes.length > 0
        ? data.sizes
        : [{
            id: 'default',
            name: '기본',
            description: '',
            width: theme?.outputWidth || 1200,
            height: theme?.outputHeight || 1600,
        }]

    const defaultSizeId = sizes[0].id
    const normalizedFrames = frames.map((frame) => ({
        ...frame,
        sizeId: frame.sizeId || defaultSizeId,
    }))

    return { frames: normalizedFrames, sizes }
}

/** 테마 JSON에서 프레임·크기 카탈로그 로드 (실패 시 throw) */
export async function loadThemeFrames(theme) {
    const path = resolveFramesPath(theme)

    const response = await fetch(path, { cache: 'no-store' })
    if (!response.ok) {
        throw new Error(`프레임 로드 실패 (${path}): HTTP ${response.status}`)
    }

    const data = await response.json()
    try {
        return normalizeThemePayload(data, theme)
    } catch (error) {
        throw new Error(`${error.message} (${path})`)
    }
}
