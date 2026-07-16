/**
 * 10-film.png → overlay 복사 + Supabase 업로드
 *
 * 사용법:
 *   node scripts/sync-film-overlay.mjs
 */

import { copyFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const THEME_DIR = join(ROOT, 'public/themes/peace-attic-summer')
const SRC = join(THEME_DIR, '10-film.png')
const DEST = join(THEME_DIR, '10-film-overlay.png')

async function exists(path) {
    try {
        await access(path, constants.F_OK)
        return true
    } catch {
        return false
    }
}

if (!(await exists(SRC))) {
    console.error(`파일 없음: ${SRC}`)
    console.error('Figma에서 PNG export 후 위 경로에 저장해 주세요.')
    process.exit(1)
}

await copyFile(SRC, DEST)
console.log('✓ 10-film.png → 10-film-overlay.png')

const result = spawnSync(
    process.execPath,
    ['scripts/upload-theme-overlays.mjs', 'peace-attic-summer', '10-film-overlay.png'],
    { cwd: ROOT, stdio: 'inherit' }
)

process.exit(result.status ?? 1)
