import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        'Supabase 환경변수가 없습니다. .env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정하세요.'
    )
}

export const supabase =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null

export function assertSupabase() {
    if (!supabase) {
        throw new Error('Supabase가 설정되지 않았습니다. .env 파일을 확인하세요.')
    }
    return supabase
}

export function isSupabaseConfigured() {
    return Boolean(supabaseUrl && supabaseAnonKey)
}
