/**
 * 레거시: Express 파일시스템 기반 photo API
 *
 * Sprint 1에서 Supabase 단일 저장소로 전환하며 server.js에서 제거됨.
 * 참고용으로만 보관합니다. 새 배포에서는 사용하지 마세요.
 *
 * 제거된 엔드포인트:
 * - POST /api/photos
 * - GET  /api/photos/:hash
 * - GET  /api/admin/photos
 * - /uploads 정적 서빙
 */

import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import chokidar from 'chokidar'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3002

const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}

function createHash(id) {
    return crypto.createHash('sha256').update(id).digest('hex').slice(0, 15)
}

chokidar.watch(uploadsDir, { persistent: true, ignoreInitial: true, depth: 1 })

app.use(cors())
app.use(express.json({ limit: '100mb' }))
app.use('/uploads', express.static(uploadsDir))

app.post('/api/photos', async (req, res) => {
    try {
        const { id, imageData, timestamp } = req.body
        if (!id || !imageData) {
            return res.status(400).json({ error: 'id와 imageData가 필요합니다.' })
        }

        const hash = createHash(id)
        const userDir = path.join(uploadsDir, hash)
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true })
        }

        const base64Data = imageData.replace(/^data:image\/png;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        fs.writeFileSync(path.join(userDir, 'photo.png'), buffer)

        const metadata = {
            id,
            hash,
            timestamp: timestamp || new Date().toISOString(),
            createdAt: new Date().toISOString(),
        }
        fs.writeFileSync(path.join(userDir, 'meta.json'), JSON.stringify(metadata, null, 2))

        res.json({ success: true, id, hash })
    } catch (error) {
        console.error('저장 실패:', error)
        res.status(500).json({ error: '저장 중 오류가 발생했습니다.' })
    }
})

app.get('/api/photos/:hash', (req, res) => {
    try {
        const { hash } = req.params
        const userDir = path.join(uploadsDir, hash)
        const imagePath = path.join(userDir, 'photo.png')
        const metadataPath = path.join(userDir, 'meta.json')

        if (!fs.existsSync(imagePath) || !fs.existsSync(metadataPath)) {
            return res.status(404).json({ error: '인생네컷을 찾을 수 없습니다.' })
        }

        const imageBuffer = fs.readFileSync(imagePath)
        const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))

        res.json({
            success: true,
            id: metadata.id,
            hash: metadata.hash,
            data: base64Image,
            timestamp: metadata.timestamp,
            createdAt: metadata.createdAt,
        })
    } catch (error) {
        console.error('조회 실패:', error)
        res.status(500).json({ error: '조회 중 오류가 발생했습니다.' })
    }
})

app.get('/api/admin/photos', (req, res) => {
    try {
        const dirs = fs.readdirSync(uploadsDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)

        const photos = dirs
            .map((hash) => {
                const metadataPath = path.join(uploadsDir, hash, 'meta.json')
                if (!fs.existsSync(metadataPath)) return null
                try {
                    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
                    return {
                        ...metadata,
                        imageUrl: `/uploads/${hash}/photo.png`,
                    }
                } catch {
                    return null
                }
            })
            .filter((p) => p !== null)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        res.json({ success: true, photos })
    } catch (error) {
        console.error('목록 조회 실패:', error)
        res.status(500).json({ error: '목록 조회 중 오류가 발생했습니다.' })
    }
})

app.listen(PORT, () => {
    console.log(`레거시 uploads API 서버: http://localhost:${PORT}`)
})
