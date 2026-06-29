import { assertSupabase } from './supabase'
import { dataUrlToBlob } from './frameDesigner'

const THEMES_BUCKET = 'themes'

export function getThemeFramesPublicUrl(themeId) {
    const supabase = assertSupabase()
    const { data } = supabase.storage.from(THEMES_BUCKET).getPublicUrl(`${themeId}/frames.json`)
    return data.publicUrl
}

/** 로고 이미지 업로드 → public URL */
export async function uploadThemeLogo(themeId, frameId, file) {
    const supabase = assertSupabase()
    const ext = (file.name?.split('.').pop() || 'png').toLowerCase()
    const path = `${themeId}/logos/${frameId}.${ext}`

    const { error } = await supabase.storage.from(THEMES_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/png',
    })
    if (error) throw error

    const { data } = supabase.storage.from(THEMES_BUCKET).getPublicUrl(path)
    return data.publicUrl
}

/** data URL 로고가 있으면 먼저 업로드 후 URL로 치환 */
export async function prepareFramesForUpload(themeId, frames) {
    const prepared = []

    for (const frame of frames) {
        const layout = { ...frame.layout }
        const bottomImage = layout.bottomImage

        if (bottomImage?.startsWith('data:')) {
            const blob = dataUrlToBlob(bottomImage)
            const file = new File([blob], `logo-${frame.id}.png`, { type: blob.type })
            layout.bottomImage = await uploadThemeLogo(themeId, frame.id, file)
        }

        prepared.push({ ...frame, layout })
    }

    return prepared
}

/** 프레임 JSON을 Supabase themes 버킷에 저장 */
export async function saveThemeFramesToSupabase(themeId, frames) {
    const supabase = assertSupabase()
    const uploadReady = await prepareFramesForUpload(themeId, frames)
    const payload = JSON.stringify({ frames: uploadReady }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })

    const { error } = await supabase.storage.from(THEMES_BUCKET).upload(`${themeId}/frames.json`, blob, {
        upsert: true,
        contentType: 'application/json',
    })
    if (error) throw error

    return {
        success: true,
        publicUrl: getThemeFramesPublicUrl(themeId),
        frames: uploadReady,
    }
}
