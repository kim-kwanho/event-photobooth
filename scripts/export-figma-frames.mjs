/**
 * Figma REST API로 프레임 overlay PNG export (MCP 없이 사용)
 *
 * 사용법:
 *   1. Figma → Settings → Personal access tokens 에서 토큰 발급
 *   2. FIGMA_ACCESS_TOKEN=figd_xxx npm run export:figma-frames
 *
 * Figma 준비: 4컷 placeholder 레이어는 숨기거나 fill을 투명하게 한 뒤 export
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const THEME_DIR = join(__dirname, '../public/themes/peace-attic-summer')
const MANIFEST_PATH = join(THEME_DIR, 'figma.json')

const token = process.env.FIGMA_ACCESS_TOKEN
if (!token) {
    console.error('FIGMA_ACCESS_TOKEN 환경 변수가 필요합니다.')
    console.error('Figma → Settings → Personal access tokens')
    process.exit(1)
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
const { fileKey, exportScale = 2, exportFormat = 'png', frames } = manifest

const nodeIds = frames.map((f) => f.nodeId).join(',')

const imagesUrl = new URL(`https://api.figma.com/v1/images/${fileKey}`)
imagesUrl.searchParams.set('ids', nodeIds)
imagesUrl.searchParams.set('format', exportFormat)
imagesUrl.searchParams.set('scale', String(exportScale))

console.log(`Figma export 요청: ${frames.length}개 프레임 (scale ${exportScale})`)

const res = await fetch(imagesUrl, {
    headers: { 'X-Figma-Token': token },
})

if (!res.ok) {
    console.error(`Figma API 오류 ${res.status}:`, await res.text())
    process.exit(1)
}

const { images, err } = await res.json()
if (err) {
    console.error('Figma API:', err)
    process.exit(1)
}

let saved = 0
for (const frame of frames) {
    const url = images[frame.nodeId]
    if (!url) {
        console.warn(`  ✗ ${frame.name} (${frame.nodeId}): URL 없음`)
        continue
    }

    const imgRes = await fetch(url)
    if (!imgRes.ok) {
        console.warn(`  ✗ ${frame.name}: 다운로드 실패 ${imgRes.status}`)
        continue
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const outPath = join(THEME_DIR, frame.output)
    await writeFile(outPath, buffer)
    console.log(`  ✓ ${frame.name} → ${frame.output}`)
    saved++
}

console.log(`\n완료: ${saved}/${frames.length}개 저장 → ${THEME_DIR}`)
if (saved < frames.length) process.exit(1)
