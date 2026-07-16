/**
 * overlay PNG → Supabase themes 버킷 업로드
 *
 * 사용법:
 *   node scripts/upload-theme-overlays.mjs
 *   node scripts/upload-theme-overlays.mjs peace-attic-summer
 *   node scripts/upload-theme-overlays.mjs peace-attic-summer 10-film-overlay.png
 */

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

async function loadEnv() {
    const raw = await readFile(join(ROOT, '.env'), 'utf8')
    const env = {}
    for (const line of raw.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const i = trimmed.indexOf('=')
        if (i === -1) continue
        env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim()
    }
    return env
}

const themeId = process.argv[2] || 'peace-attic-summer'
const onlyFile = process.argv[3]
const THEME_DIR = join(ROOT, 'public/themes', themeId)
const BUCKET = 'themes'

const env = await loadEnv()
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('.env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY가 필요합니다.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const files = (await readdir(THEME_DIR))
    .filter((name) => name.endsWith('-overlay.png'))
    .filter((name) => !onlyFile || name === onlyFile)

if (files.length === 0) {
    console.error(`overlay PNG가 없습니다: ${THEME_DIR}`)
    process.exit(1)
}

console.log(`업로드: ${themeId} → Supabase themes (${files.length}개)\n`)

for (const filename of files) {
    const buffer = await readFile(join(THEME_DIR, filename))
    const storagePath = `${themeId}/${filename}`

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        upsert: true,
        contentType: 'image/png',
    })

    if (error) {
        console.error(`  ✗ ${filename}: ${error.message}`)
        process.exit(1)
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    console.log(`  ✓ ${filename}`)
    console.log(`    ${data.publicUrl}`)
}

console.log('\n완료.')
