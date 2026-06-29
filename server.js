import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ptp from 'pdf-to-printer'
import axios from 'axios'
import sharp from 'sharp'
import PDFDocument from 'pdfkit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ limit: '100mb', extended: true }))
app.use(express.static('dist'))

// 프린트 API (Canon Selphy CP1300) — features.print=true 일 때 로컬 키오스크용
app.post('/api/print', async (req, res) => {
    try {
        const { imageUrl, quantity = 1, printerName } = req.body

        if (!imageUrl) {
            return res.status(400).json({ error: '이미지 URL이 필요합니다.' })
        }

        const printQuantity = parseInt(quantity) || 1
        if (printQuantity < 1 || printQuantity > 100) {
            return res.status(400).json({ error: '수량은 1~100 사이여야 합니다.' })
        }

        console.log(`프린트 요청: ${imageUrl}, 수량: ${printQuantity}`)

        let imageBuffer
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
            imageBuffer = Buffer.from(response.data)
        } else {
            const imagePath = path.join(__dirname, imageUrl.replace(/^\//, ''))
            if (!fs.existsSync(imagePath)) {
                return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' })
            }
            imageBuffer = fs.readFileSync(imagePath)
        }

        const pdfPath = path.join(__dirname, 'temp', `print_${Date.now()}.pdf`)
        const tempDir = path.join(__dirname, 'temp')
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true })
        }

        const resizedImage = await sharp(imageBuffer)
            .resize(1200, 1800, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255 },
            })
            .png()
            .toBuffer()

        const tempImagePath = path.join(tempDir, `print_${Date.now()}.png`)
        fs.writeFileSync(tempImagePath, resizedImage)

        const printer = printerName || 'Canon SELPHY CP1300'

        try {
            const pdfDoc = new PDFDocument({
                size: [612, 792],
                margin: 0,
            })

            pdfDoc.pipe(fs.createWriteStream(pdfPath))
            pdfDoc.image(resizedImage, 0, 0, { width: 612, height: 792 })
            pdfDoc.end()

            await new Promise((resolve) => {
                pdfDoc.on('end', resolve)
            })

            for (let i = 0; i < printQuantity; i++) {
                await ptp.print(pdfPath, {
                    printer,
                    pages: '1',
                })
                console.log(`프린트 ${i + 1}/${printQuantity} 완료`)

                if (i < printQuantity - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                }
            }

            setTimeout(() => {
                if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath)
                if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath)
            }, 5000)

            res.json({
                success: true,
                message: `${printQuantity}장이 프린트되었습니다.`,
                printed: printQuantity,
            })
        } catch (printError) {
            console.error('프린트 오류:', printError)
            if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath)
            if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath)
            throw printError
        }
    } catch (error) {
        console.error('프린트 API 오류:', error)
        res.status(500).json({
            error: '프린트 중 오류가 발생했습니다.',
            details: error.message,
        })
    }
})

app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/dist')) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'))
    } else {
        next()
    }
})

app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`)
    console.log(`http://localhost:${PORT}`)
})

