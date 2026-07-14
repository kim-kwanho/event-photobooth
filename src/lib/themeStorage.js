import { assertSupabase } from './supabase'

const THEMES_BUCKET = 'themes'

export function getThemeFramesPublicUrl(themeId) {
    const supabase = assertSupabase()
    const { data } = supabase.storage.from(THEMES_BUCKET).getPublicUrl(`${themeId}/frames.json`)
    return data.publicUrl
}
