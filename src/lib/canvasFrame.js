/**
 * 프레임 Canvas 공통 유틸 (슬롯 계산 · 이동 제한 · 십자선)
 */

import { getFilterCss } from './imageFilters'

export function getBottomHeightRatio(frame) {
    if (frame.layout.bottomHeight === 0) return 0
    return frame.layout.bottomHeight ?? 0.08
}

/** 프레임 내부 영역 메트릭 */
export function computeFrameInner(frame, width, height, { scaleFrom200 = false } = {}) {
    const rawBorder = frame.layout.frameWidth || 15
    const frameBorderWidth = scaleFrom200 ? rawBorder * (width / 200) : rawBorder
    const bottomHeight = height * getBottomHeightRatio(frame)
    const symmetric = bottomHeight === 0
    const frameInnerX = frameBorderWidth
    const frameInnerY = frameBorderWidth
    const frameInnerWidth = width - frameBorderWidth * 2
    const frameInnerHeight = symmetric
        ? height - frameBorderWidth * 2
        : height - frameBorderWidth - bottomHeight
    const bottomY = symmetric ? height - frameBorderWidth : height - bottomHeight

    return {
        frameBorderWidth,
        bottomHeight,
        frameInnerX,
        frameInnerY,
        frameInnerWidth,
        frameInnerHeight,
        bottomY,
    }
}

/** 슬롯 index의 픽셀 좌표·크기 */
export function computeSlotRect(frame, slotIndex, width, height, options = {}) {
    const slot = frame.layout.slots[slotIndex]
    if (!slot) return null

    const metrics = computeFrameInner(frame, width, height, options)
    const {
        frameInnerX,
        frameInnerY,
        frameInnerWidth,
        frameInnerHeight,
    } = metrics

    let x = frameInnerX + slot.x * frameInnerWidth
    let y = frameInnerY + slot.y * frameInnerHeight
    let slotWidth = slot.width * frameInnerWidth
    let slotHeight = slot.height * frameInnerHeight

    if (slot.y + slot.height >= 1.0) {
        slotHeight = frameInnerY + frameInnerHeight - y
    }
    if (slot.x + slot.width >= 1.0) {
        slotWidth = frameInnerX + frameInnerWidth - x
    }
    if (slot.x === 0 && slot.y === 0) {
        x = frameInnerX
        y = frameInnerY
    }

    x = Math.floor(x)
    y = Math.floor(y)
    slotWidth = Math.ceil(slotWidth)
    slotHeight = Math.ceil(slotHeight)

    if (slot.x + slot.width >= 1.0) {
        slotWidth = frameInnerX + frameInnerWidth - x
    }
    if (slot.y + slot.height >= 1.0) {
        slotHeight = frameInnerY + frameInnerHeight - y
        if (slotHeight < 0) slotHeight = 0
    }
    if (x + slotWidth > frameInnerX + frameInnerWidth) {
        slotWidth = frameInnerX + frameInnerWidth - x
    }
    if (y + slotHeight > frameInnerY + frameInnerHeight) {
        slotHeight = frameInnerY + frameInnerHeight - y
    }

    if (slotWidth <= 0 || slotHeight <= 0) return null

    return { x, y, width: slotWidth, height: slotHeight }
}

export function getMoveLimits(img, slotWidth, slotHeight) {
    const imgAspect = img.width / img.height
    const slotAspect = slotWidth / slotHeight

    let drawWidth
    let drawHeight

    if (imgAspect > slotAspect) {
        drawHeight = slotHeight
        drawWidth = slotHeight * imgAspect
    } else {
        drawWidth = slotWidth
        drawHeight = slotWidth / imgAspect
    }

    return {
        minMoveX: slotWidth - drawWidth,
        maxMoveX: 0,
        minMoveY: slotHeight - drawHeight,
        maxMoveY: 0,
    }
}

export function clampMove(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

/** 테두리 링 그라데이션 채우기 */
function getBorderFillStyle(ctx, frame, width, height) {
    const grad = frame.layout.frameGradient
    if (grad && grad.length >= 2) {
        const dir = frame.layout.frameGradientDirection || 'diagonal'
        let g
        if (dir === 'vertical') {
            g = ctx.createLinearGradient(0, 0, 0, height)
        } else if (dir === 'horizontal') {
            g = ctx.createLinearGradient(0, 0, width, 0)
        } else {
            g = ctx.createLinearGradient(0, 0, width, height)
        }
        const stops = grad.length
        grad.forEach((color, i) => {
            g.addColorStop(i / (stops - 1), color)
        })
        return g
    }
    return frame.layout.frameColor
}

/** 상용 네컷 스타일 — 사진 영역을 둘러싼 테두리 링 */
function drawBorderRing(ctx, frame, width, height, metrics, options = {}) {
    const { scaleFrom200 = false, fillBackground = true } = options
    const bw = metrics.frameBorderWidth
    const fill = getBorderFillStyle(ctx, frame, width, height)

    if (fillBackground) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
    }

    ctx.fillStyle = fill
    ctx.fillRect(0, 0, width, bw)
    ctx.fillRect(0, height - bw, width, bw)
    ctx.fillRect(0, bw, bw, height - bw * 2)
    ctx.fillRect(width - bw, bw, bw, height - bw * 2)

    drawBorderRingPattern(ctx, frame, width, height, metrics, options)
    drawThemeDecoration(ctx, frame, width, height, metrics, options)

    if (frame.layout.accentColor && frame.layout.borderAccent) {
        const inset = bw * 0.45
        ctx.strokeStyle = frame.layout.accentColor
        ctx.lineWidth = scaleFrom200 ? Math.max(1, 2 * (width / 200)) : 2
        ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2)
    }
}

/** 테두리 링 안 패턴 */
function drawBorderRingPattern(ctx, frame, width, height, metrics, options = {}) {
    const pattern = frame.layout.borderPattern
    if (!pattern) return

    const { scaleFrom200 = false } = options
    const bw = metrics.frameBorderWidth
    const color = frame.layout.patternColor || 'rgba(255,255,255,0.35)'
    ctx.save()
    ctx.globalAlpha = 0.5

    if (pattern === 'dots') {
        ctx.fillStyle = color
        const step = scaleFrom200 ? Math.max(6, 10 * (width / 200)) : 10
        for (let y = step; y < height - step; y += step) {
            for (let x = step; x < width - step; x += step) {
                const inInner =
                    x > bw && x < width - bw && y > bw && y < height - bw
                if (!inInner) {
                    ctx.beginPath()
                    ctx.arc(x, y, 1.3, 0, Math.PI * 2)
                    ctx.fill()
                }
            }
        }
    }

    if (pattern === 'waves') {
        ctx.strokeStyle = color
        ctx.lineWidth = scaleFrom200 ? Math.max(1, 1.5 * (width / 200)) : 1.5
        const drawWave = (y0) => {
            ctx.beginPath()
            for (let x = 0; x <= width; x += 3) {
                const y = y0 + Math.sin(x * 0.08) * (bw * 0.25)
                if (x === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
            }
            ctx.stroke()
        }
        drawWave(bw * 0.55)
        drawWave(height - bw * 0.55)
    }

    if (pattern === 'film') {
        ctx.fillStyle = color
        const holeH = bw * 0.22
        const gap = holeH * 2.2
        for (let y = gap; y < height - gap; y += gap) {
            ctx.fillRect(2, y - holeH / 2, bw * 0.55, holeH)
            ctx.fillRect(width - bw * 0.55 - 2, y - holeH / 2, bw * 0.55, holeH)
        }
    }

    if (pattern === 'dash') {
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        const inset = bw * 0.55
        ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2)
        ctx.setLineDash([])
    }

    if (pattern === 'crosshatch') {
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, width, height)
        ctx.rect(bw, bw, width - bw * 2, height - bw * 2)
        ctx.clip('evenodd')
        ctx.strokeStyle = color
        ctx.lineWidth = 0.9
        const step = scaleFrom200 ? Math.max(6, 9 * (width / 200)) : 9
        for (let d = -height; d < width + height; d += step) {
            ctx.beginPath()
            ctx.moveTo(d, 0)
            ctx.lineTo(d + height, height)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(d + height, 0)
            ctx.lineTo(d, height)
            ctx.stroke()
        }
        ctx.restore()
    }

    if (pattern === 'sparkle') {
        ctx.fillStyle = color
        const drawSparkle = (cx, cy, r) => {
            ctx.beginPath()
            ctx.moveTo(cx, cy - r)
            ctx.lineTo(cx, cy + r)
            ctx.moveTo(cx - r, cy)
            ctx.lineTo(cx + r, cy)
            ctx.stroke()
        }
        ctx.lineWidth = 1.2
        ctx.strokeStyle = color
        const spots = [
            [bw * 0.4, bw * 0.35],
            [width * 0.5, bw * 0.5],
            [width - bw * 0.35, bw * 0.4],
            [bw * 0.45, height - bw * 0.4],
            [width - bw * 0.5, height - bw * 0.45],
        ]
        spots.forEach(([cx, cy]) => drawSparkle(cx, cy, 3 * (scaleFrom200 ? width / 200 : 1)))
    }

    ctx.restore()
}

/** 테마별 아이콘 장식 (테두리 코너) */
function drawSingleThemeDecor(ctx, theme, frame, width, height, bw, s) {
    const accent = frame.layout.accentColor || '#FFFFFF'

    ctx.strokeStyle = accent
    ctx.fillStyle = accent
    ctx.lineWidth = Math.max(1.5, 2 * s)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (theme === 'sun') {
        const cx = width - bw * 0.55
        const cy = bw * 0.55
        const r = bw * 0.22
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4
            ctx.beginPath()
            ctx.moveTo(cx + Math.cos(a) * (r + 2 * s), cy + Math.sin(a) * (r + 2 * s))
            ctx.lineTo(cx + Math.cos(a) * (r + 6 * s), cy + Math.sin(a) * (r + 6 * s))
            ctx.stroke()
        }
    }

    if (theme === 'cloud') {
        const cx = bw * 0.7
        const cy = bw * 0.5
        const r = bw * 0.14
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        ctx.arc(cx - r, cy, r, 0, Math.PI * 2)
        ctx.arc(cx, cy - r * 0.35, r * 1.1, 0, Math.PI * 2)
        ctx.arc(cx + r * 1.1, cy, r * 0.95, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
    }

    if (theme === 'stamp') {
        const cx = bw * 0.6
        const cy = height - bw * 0.6
        const r = bw * 0.28
        ctx.globalAlpha = 0.7
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
        const label = frame.layout.stampText || 'PA'
        ctx.font = `bold ${Math.round(7 * s)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, cx, cy)
        ctx.globalAlpha = 1
    }

    if (theme === 'star') {
        const drawStar = (cx, cy, r) => {
            ctx.beginPath()
            for (let i = 0; i < 5; i++) {
                const a = (i * 4 * Math.PI) / 5 - Math.PI / 2
                const px = cx + r * Math.cos(a)
                const py = cy + r * Math.sin(a)
                if (i === 0) ctx.moveTo(px, py)
                else ctx.lineTo(px, py)
            }
            ctx.closePath()
            ctx.fill()
        }
        drawStar(bw * 0.55, bw * 0.5, 4 * s)
        drawStar(width - bw * 0.5, height - bw * 0.55, 3 * s)
    }

    if (theme === 'sunset') {
        const cx = bw * 0.65
        const cy = height - bw * 0.55
        const r = bw * 0.32
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.arc(cx, cy + r * 0.55, r, Math.PI, 0)
        ctx.fill()
        for (let i = -2; i <= 2; i++) {
            const a = Math.PI + (i * Math.PI) / 8
            ctx.beginPath()
            ctx.moveTo(cx, cy + r * 0.55)
            ctx.lineTo(cx + Math.cos(a) * r * 1.35, cy + r * 0.55 + Math.sin(a) * r * 1.35)
            ctx.stroke()
        }
        ctx.globalAlpha = 1
    }

    if (theme === 'film-badge') {
        const cx = width - bw * 0.65
        const cy = height - bw * 0.55
        const w = bw * 0.55
        const h = bw * 0.28
        ctx.globalAlpha = 0.85
        ctx.fillStyle = 'rgba(40,40,40,0.75)'
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h)
        ctx.fillStyle = accent
        ctx.font = `bold ${Math.round(6 * s)}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('35mm', cx, cy)
        ctx.globalAlpha = 1
    }

    if (theme === 'wave-icon') {
        const cx = width - bw * 0.65
        const cy = height - bw * 0.55
        const wave = (offset) => {
            ctx.beginPath()
            ctx.moveTo(cx - 10 * s, cy + offset)
            ctx.quadraticCurveTo(cx - 5 * s, cy - 5 * s + offset, cx, cy + offset)
            ctx.quadraticCurveTo(cx + 5 * s, cy + 5 * s + offset, cx + 10 * s, cy + offset)
            ctx.stroke()
        }
        wave(0)
        wave(4 * s)
        wave(8 * s)
    }

    if (theme === 'bubbles') {
        const baseX = bw * 0.55
        const baseY = bw * 0.55
        ctx.globalAlpha = 0.55
        ;[
            [0, 0, 0.16],
            [bw * 0.22, -bw * 0.08, 0.11],
            [bw * 0.12, bw * 0.15, 0.08],
        ].forEach(([dx, dy, ratio]) => {
            ctx.beginPath()
            ctx.arc(baseX + dx, baseY + dy, bw * ratio, 0, Math.PI * 2)
            ctx.stroke()
        })
        ctx.globalAlpha = 1
    }

    if (theme === 'anchor') {
        const cx = bw * 0.6
        const cy = height - bw * 0.55
        ctx.beginPath()
        ctx.arc(cx, cy - 4 * s, 3 * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(cx, cy - 1 * s)
        ctx.lineTo(cx, cy + 8 * s)
        ctx.moveTo(cx - 5 * s, cy + 4 * s)
        ctx.quadraticCurveTo(cx, cy + 10 * s, cx + 5 * s, cy + 4 * s)
        ctx.stroke()
    }
}

function getThemeDecorList(frame) {
    if (frame.layout.themeDecors?.length) return frame.layout.themeDecors
    const list = []
    if (frame.layout.themeDecor) list.push(frame.layout.themeDecor)
    if (frame.layout.themeDecor2) list.push(frame.layout.themeDecor2)
    return list
}

/** 테마별 아이콘 장식 (테두리 코너) */
function drawThemeDecoration(ctx, frame, width, height, metrics, options = {}) {
    const decors = getThemeDecorList(frame)
    if (!decors.length) return

    const { scaleFrom200 = false } = options
    const bw = metrics.frameBorderWidth
    const s = scaleFrom200 ? width / 200 : 1

    ctx.save()
    decors.forEach((theme) => {
        drawSingleThemeDecor(ctx, theme, frame, width, height, bw, s)
    })
    ctx.restore()
}

/** 하단 바 채우기 (그라데이션 · 단색) */
function fillBottomBar(ctx, frame, width, metrics) {
    const { frameBorderWidth, bottomHeight, bottomY } = metrics
    const x = frameBorderWidth
    const w = width - frameBorderWidth * 2
    const h = bottomHeight
    const y = bottomY

    if (frame.layout.bottomImage && frame.layout.bottomImageCovers) {
        return
    }

    const grad = frame.layout.bottomGradient
    if (grad && grad.length >= 2) {
        const g = ctx.createLinearGradient(x, y, x, y + h)
        g.addColorStop(0, grad[0])
        g.addColorStop(1, grad[1])
        ctx.fillStyle = g
    } else {
        ctx.fillStyle = frame.layout.bottomColor || frame.layout.frameColor
    }
    ctx.fillRect(x, y, w, h)
}

/** 코너 장식 (L자 골드 라인) */
export function drawCornerOrnaments(ctx, frame, width, height, options = {}) {
    if (!frame.layout.cornerOrnaments) return

    const { scaleFrom200 = false } = options
    const metrics = computeFrameInner(frame, width, height, { scaleFrom200 })
    const { frameInnerX, frameInnerY, frameInnerWidth, frameInnerHeight, frameBorderWidth } = metrics
    const accent = frame.layout.accentColor || '#D4A853'
    const len = scaleFrom200 ? Math.max(12, 18 * (width / 200)) : 18
    const pad = scaleFrom200 ? Math.max(4, 6 * (width / 200)) : 6

    ctx.strokeStyle = accent
    ctx.lineWidth = scaleFrom200 ? Math.max(1.5, 2 * (width / 200)) : 2
    ctx.lineCap = 'round'

    const corners = [
        [frameInnerX + pad, frameInnerY + pad + len, frameInnerX + pad, frameInnerY + pad, frameInnerX + pad + len, frameInnerY + pad],
        [frameInnerX + frameInnerWidth - pad - len, frameInnerY + pad, frameInnerX + frameInnerWidth - pad, frameInnerY + pad, frameInnerX + frameInnerWidth - pad, frameInnerY + pad + len],
        [frameInnerX + pad, frameInnerY + frameInnerHeight - pad - len, frameInnerX + pad, frameInnerY + frameInnerHeight - pad, frameInnerX + pad + len, frameInnerY + frameInnerHeight - pad],
        [frameInnerX + frameInnerWidth - pad - len, frameInnerY + frameInnerHeight - pad, frameInnerX + frameInnerWidth - pad, frameInnerY + frameInnerHeight - pad, frameInnerX + frameInnerWidth - pad, frameInnerY + frameInnerHeight - pad - len],
    ]

    corners.forEach(([x1, y1, x2, y2, x3, y3]) => {
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.lineTo(x3, y3)
        ctx.stroke()
    })
}

/** 하단 바 상단 패턴 (물결 · 별) */
export function drawBottomPattern(ctx, frame, width, height, options = {}) {
    const pattern = frame.layout.bottomPattern
    if (!pattern) return

    const { scaleFrom200 = false } = options
    const metrics = computeFrameInner(frame, width, height, { scaleFrom200 })
    const { frameBorderWidth, bottomY, bottomHeight } = metrics
    const x0 = frameBorderWidth
    const w = width - frameBorderWidth * 2

    ctx.save()
    ctx.globalAlpha = 0.35

    if (pattern === 'waves') {
        ctx.strokeStyle = frame.layout.patternColor || '#FFFFFF'
        ctx.lineWidth = scaleFrom200 ? Math.max(1, 1.5 * (width / 200)) : 1.5
        ctx.beginPath()
        const amp = bottomHeight * 0.15
        const freq = 0.04
        for (let x = x0; x <= x0 + w; x += 2) {
            const y = bottomY + amp + Math.sin((x - x0) * freq) * amp * 0.6
            if (x === x0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
        }
        ctx.stroke()
    }

    if (pattern === 'stars') {
        const starColor = frame.layout.patternColor || '#FFFFFF'
        ctx.fillStyle = starColor
        const count = 8
        for (let i = 0; i < count; i++) {
            const sx = x0 + (w / (count + 1)) * (i + 1)
            const sy = bottomY + bottomHeight * (0.35 + (i % 3) * 0.2)
            const r = scaleFrom200 ? Math.max(1.5, 2 * (width / 200)) : 2
            ctx.beginPath()
            for (let j = 0; j < 5; j++) {
                const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2
                const px = sx + r * Math.cos(angle)
                const py = sy + r * Math.sin(angle)
                if (j === 0) ctx.moveTo(px, py)
                else ctx.lineTo(px, py)
            }
            ctx.closePath()
            ctx.fill()
        }
    }

    if (pattern === 'dots') {
        ctx.fillStyle = frame.layout.patternColor || 'rgba(255,255,255,0.4)'
        const step = scaleFrom200 ? Math.max(8, 12 * (width / 200)) : 12
        for (let x = x0 + step; x < x0 + w; x += step) {
            for (let y = bottomY + step; y < bottomY + bottomHeight - step / 2; y += step) {
                ctx.beginPath()
                ctx.arc(x, y, 1.2, 0, Math.PI * 2)
                ctx.fill()
            }
        }
    }

    if (pattern === 'paper') {
        ctx.strokeStyle = frame.layout.patternColor || 'rgba(120,80,50,0.08)'
        ctx.lineWidth = 0.6
        const step = scaleFrom200 ? Math.max(3, 4 * (width / 200)) : 4
        for (let y = bottomY + step; y < bottomY + bottomHeight; y += step) {
            ctx.beginPath()
            ctx.moveTo(x0, y)
            ctx.lineTo(x0 + w, y)
            ctx.stroke()
        }
    }

    ctx.restore()
}

/** 프레임 십자가 구분선 */
export function drawCrossLines(ctx, frame, width, height, options = {}) {
    const { scaleFrom200 = false } = options
    const metrics = computeFrameInner(frame, width, height, { scaleFrom200 })
    const {
        frameInnerX,
        frameInnerY,
        frameInnerWidth,
        frameInnerHeight,
    } = metrics

    const lineColor = frame.layout.crossLineColor || frame.layout.frameColor
    if (!lineColor) return

    ctx.strokeStyle = lineColor
    const baseWidth = frame.layout.crossLineWidth ?? 10
    ctx.lineWidth = scaleFrom200 ? baseWidth * (width / 200) : baseWidth

    const centerY = frameInnerY + frameInnerHeight / 2
    ctx.beginPath()
    ctx.moveTo(frameInnerX, centerY)
    ctx.lineTo(frameInnerX + frameInnerWidth, centerY)
    ctx.stroke()

    const centerX = frameInnerX + frameInnerWidth / 2
    ctx.beginPath()
    ctx.moveTo(centerX, frameInnerY)
    ctx.lineTo(centerX, frameInnerY + frameInnerHeight)
    ctx.stroke()
}

/** 프레임 테두리 + 하단 색 영역 (동기) */
export function drawFrameBorderSync(ctx, frame, width, height, options = {}) {
    const { scaleFrom200 = false, fillBackground = true } = options
    const metrics = computeFrameInner(frame, width, height, { scaleFrom200 })
    const { frameBorderWidth, bottomHeight, bottomY } = metrics

    if (fillBackground) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
    }

    const useRing = frame.layout.frameStyle === 'ring' || getBottomHeightRatio(frame) === 0

    if (useRing && frame.layout.frameColor) {
        drawBorderRing(ctx, frame, width, height, metrics, { scaleFrom200, fillBackground: false })
        return metrics
    }

    if (frame.layout.frameColor) {
        ctx.strokeStyle = frame.layout.frameColor
        ctx.lineWidth = scaleFrom200 ? frameBorderWidth : frame.layout.frameWidth || 15
        ctx.strokeRect(
            frameBorderWidth / 2,
            frameBorderWidth / 2,
            width - frameBorderWidth,
            height - frameBorderWidth
        )

        fillBottomBar(ctx, frame, width, metrics)
        drawBottomPattern(ctx, frame, width, height, { scaleFrom200 })

        if (frame.layout.accentColor && frame.layout.borderAccent) {
            const inset = frameBorderWidth * 0.55
            ctx.strokeStyle = frame.layout.accentColor
            ctx.lineWidth = scaleFrom200 ? Math.max(1, 2 * (width / 200)) : 2
            ctx.strokeRect(
                inset,
                inset,
                width - inset * 2,
                height - inset * 2
            )
        }
    }

    return metrics
}

/** 원형 입국 스탬프 */
function drawCircleStamp(ctx, cx, cy, r, lines, color, options = {}) {
    const { scaleFrom200 = false, width = 200, rotation = 0, fontSize = 7 } = options
    const s = scaleFrom200 ? width / 200 : 1

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotation)
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = Math.max(1.5, 2 * s)
    ctx.globalAlpha = 0.82

    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()

    ctx.setLineDash([3 * s, 2 * s])
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    const size = scaleFrom200 ? Math.round(fontSize * s) : fontSize
    ctx.font = `bold ${size}px ${options.fontFamily || 'Georgia, serif'}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const gap = size * 1.15
    const startY = -((lines.length - 1) * gap) / 2
    lines.forEach((line, i) => {
        ctx.fillText(line, 0, startY + i * gap)
    })

    ctx.restore()
}

/** 사각 공식 스탬프 */
function drawRectStamp(ctx, cx, cy, w, h, text, color, options = {}) {
    const { scaleFrom200 = false, width = 200, rotation = 0, fontSize = 6 } = options
    const s = scaleFrom200 ? width / 200 : 1

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotation)
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = Math.max(1.2, 1.8 * s)
    ctx.globalAlpha = 0.78
    ctx.strokeRect(-w / 2, -h / 2, w, h)

    const size = scaleFrom200 ? Math.round(fontSize * s) : fontSize
    ctx.font = `bold ${size}px ${options.fontFamily || 'Georgia, serif'}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 0)
    ctx.restore()
}

/** 여권 하단 바 (스탬프 · MRZ) */
function drawPassportBottom(ctx, frame, width, height, options = {}) {
    const { scaleFrom200 = false } = options
    const metrics = computeFrameInner(frame, width, height, { scaleFrom200 })
    const { frameBorderWidth, bottomHeight, bottomY } = metrics
    const barX = frameBorderWidth
    const barW = width - frameBorderWidth * 2
    const s = scaleFrom200 ? width / 200 : 1

    const accent = frame.layout.accentColor || frame.layout.textColor || '#B45309'
    const fontFamily = frame.layout.fontFamily || 'Georgia, "Noto Serif KR", serif'

    const stampLines = (frame.layout.stampText || 'ENTRY\nKOR').split('\n')
    const stampDate = frame.layout.stampDate || '2025'
    const centerStamp = frame.layout.passportSeal || 'PASSPORT'

    const midY = bottomY + bottomHeight * 0.46
    const stampR = bottomHeight * 0.3

    drawCircleStamp(ctx, barX + barW * 0.16, midY, stampR, stampLines, accent, {
        scaleFrom200,
        width,
        rotation: -0.12,
        fontSize: 6,
        fontFamily,
    })

    drawRectStamp(
        ctx,
        barX + barW * 0.5,
        midY,
        barW * 0.22,
        bottomHeight * 0.34,
        centerStamp,
        accent,
        { scaleFrom200, width, rotation: -0.04, fontSize: 6, fontFamily }
    )

    drawCircleStamp(ctx, barX + barW * 0.84, midY, stampR * 0.9, [stampDate], accent, {
        scaleFrom200,
        width,
        rotation: 0.15,
        fontSize: 7,
        fontFamily,
    })

    const mrzLines = Array.isArray(frame.layout.passportMrz)
        ? frame.layout.passportMrz
        : (frame.layout.passportMrz || 'P<KOR<<<<<<<<<<<<<<<<<<<<<<<<<<<<\nA0<<<<20250629<<<<<<<<<<<<<<<<<<<').split('\n')

    const mrzSize = scaleFrom200 ? Math.round(4.2 * s) : 4.2
    const lineGap = mrzSize * 1.45
    const mrzStartY = bottomY + bottomHeight * 0.72

    ctx.save()
    ctx.font = `${mrzSize}px monospace`
    ctx.fillStyle = 'rgba(40,30,20,0.42)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    mrzLines.forEach((line, i) => {
        ctx.fillText(line, barX + barW / 2, mrzStartY + i * lineGap)
    })
    ctx.restore()
}

/** 여권 페이지 여백선 · 비자 스티커 */
function drawPassportFrameMarks(ctx, frame, width, height, options = {}) {
    const { scaleFrom200 = false } = options
    const metrics = computeFrameInner(frame, width, height, { scaleFrom200 })
    const {
        frameInnerX,
        frameInnerY,
        frameInnerWidth,
        frameInnerHeight,
        frameBorderWidth,
    } = metrics
    const s = scaleFrom200 ? width / 200 : 1
    const accent = frame.layout.accentColor || '#C45C4A'
    const pad = scaleFrom200 ? Math.max(5, 8 * (width / 200)) : 8

    ctx.save()
    const topLabelSize = scaleFrom200 ? Math.round(6.5 * s) : 6.5
    ctx.fillStyle = 'rgba(255,248,235,0.75)'
    ctx.font = `bold ${topLabelSize}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('PASSPORT', width / 2, frameBorderWidth * 0.52)

    ctx.strokeStyle = accent
    ctx.lineWidth = Math.max(1, 1.2 * s)
    ctx.globalAlpha = 0.35
    ctx.setLineDash([5 * s, 4 * s])
    ctx.strokeRect(
        frameInnerX + pad,
        frameInnerY + pad,
        frameInnerWidth - pad * 2,
        frameInnerHeight - pad * 2
    )
    ctx.setLineDash([])
    ctx.globalAlpha = 0.55

    const visaW = frameInnerWidth * 0.18
    const visaH = frameInnerHeight * 0.09
    const visaX = frameInnerX + frameInnerWidth - visaW - pad
    const visaY = frameInnerY + pad
    ctx.strokeRect(visaX, visaY, visaW, visaH)
    ctx.fillStyle = accent
    const visaSize = scaleFrom200 ? Math.round(5 * s) : 5
    ctx.font = `bold ${visaSize}px Georgia, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('VISA', visaX + visaW / 2, visaY + visaH / 2)

    const notch = frameBorderWidth * 0.55
    ctx.globalAlpha = 0.25
    ctx.fillStyle = frame.layout.frameColor || accent
    for (let y = frameInnerY + notch * 2; y < frameInnerY + frameInnerHeight - notch; y += notch * 2.2) {
        ctx.beginPath()
        ctx.arc(frameInnerX - notch * 0.15, y, notch * 0.35, 0, Math.PI * 2)
        ctx.fill()
    }

    ctx.restore()
}

/** 하단 텍스트 (동기 부분) */
export function drawBottomText(ctx, frame, width, height, options = {}) {
    if (frame.layout.bottomStyle === 'passport') {
        drawPassportBottom(ctx, frame, width, height, options)
        return
    }

    const { scaleFrom200 = false } = options
    const metrics = computeFrameInner(frame, width, height, { scaleFrom200 })
    const { bottomHeight, bottomY } = metrics

    if (!frame.layout.bottomText) return

    ctx.fillStyle = frame.layout.textColor || '#ffffff'
    const fontFamily = frame.layout.fontFamily || 'Inter, sans-serif'

    if (frame.layout.logoStyle) {
        const lines = frame.layout.bottomText.split('\n')
        const centerX = width / 2
        const centerY = bottomY + bottomHeight * 0.55
        const hopeFontSize = scaleFrom200 ? Math.round(10 * (width / 200)) : 10

        ctx.font = `bold ${hopeFontSize}px ${fontFamily}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const hopeMetrics = ctx.measureText(lines[0])
        const hopeWidth = hopeMetrics.width
        const hopeHeight = hopeFontSize

        ctx.strokeStyle = ctx.fillStyle
        ctx.lineWidth = scaleFrom200 ? Math.max(1, Math.round(2 * (width / 200))) : 1.5
        const ellipseWidth = hopeWidth * 1.3
        const ellipseHeight = hopeHeight * 1.8
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, ellipseWidth / 2, ellipseHeight / 2, 0, 0, 2 * Math.PI)
        ctx.stroke()

        const starSize = scaleFrom200 ? Math.max(3, Math.round(4 * (width / 200))) : 3
        const drawStar = (x, y, size) => {
            ctx.beginPath()
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
                const px = x + size * Math.cos(angle)
                const py = y + size * Math.sin(angle)
                if (i === 0) ctx.moveTo(px, py)
                else ctx.lineTo(px, py)
            }
            ctx.closePath()
            ctx.fill()
        }
        drawStar(centerX - ellipseWidth / 2 - starSize * 2, centerY - hopeHeight * 0.4, starSize)
        drawStar(centerX + ellipseWidth / 2 + starSize * 2, centerY + hopeHeight * 0.4, starSize)
        ctx.fillText(lines[0], centerX, centerY)

        if (lines[1]) {
            const buildersFontSize = scaleFrom200 ? Math.round(6 * (width / 200)) : 6
            ctx.font = `bold ${buildersFontSize}px ${fontFamily}`
            ctx.fillText(lines[1], centerX, centerY + hopeHeight * 0.3)
        }
        return
    }

    const baseFontSize = frame.layout.fontFamily ? (scaleFrom200 ? 9 : 14) : (scaleFrom200 ? 12 : 20)
    const fontSize = scaleFrom200 ? Math.round(baseFontSize * (width / 200)) : baseFontSize
    ctx.font = `bold ${fontSize}px ${fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const lines = frame.layout.bottomText.split('\n')
    const lineHeight = fontSize * 1.3
    const totalHeight = lines.length * lineHeight
    const startY = bottomY + (bottomHeight - totalHeight) / 2 + lineHeight / 2

    lines.forEach((line, index) => {
        ctx.fillText(line, width / 2, startY + index * lineHeight)
    })
}

/** 하단 이미지 (비동기) */
export function drawBottomImage(ctx, frame, width, height, options = {}) {
    const { scaleFrom200 = false } = options
    if (!frame.layout.bottomImage) return

    const metrics = computeFrameInner(frame, width, height, { scaleFrom200 })
    const { frameBorderWidth, bottomHeight, bottomY } = metrics

    const logoImg = new Image()
    logoImg.crossOrigin = 'anonymous'
    logoImg.onload = () => {
        const barX = frameBorderWidth
        const barW = width - frameBorderWidth * 2
        const barH = bottomHeight
        const barY = bottomY

        let drawWidth, drawHeight, drawX, drawY

        if (frame.layout.bottomImageCovers) {
            drawX = barX
            drawY = barY
            drawWidth = barW
            drawHeight = barH
        } else {
            const imgAspect = logoImg.width / logoImg.height
            const bottomAspect = width / bottomHeight

            if (imgAspect > bottomAspect) {
                drawWidth = width * 0.9
                drawHeight = drawWidth / imgAspect
            } else {
                drawHeight = bottomHeight * 0.8
                drawWidth = drawHeight * imgAspect
            }

            drawX = (width - drawWidth) / 2
            drawY = bottomY + (bottomHeight - drawHeight) / 2
        }

        ctx.drawImage(logoImg, drawX, drawY, drawWidth, drawHeight)
    }
    logoImg.src = frame.layout.bottomImage
}

/** 프레임 테두리 + 십자선 + 하단 장식 (사진 위에 그리기) */
export function drawFrameOverlay(ctx, frame, width, height, options = {}) {
    const { scaleFrom200 = false } = options

    drawFrameBorderSync(ctx, frame, width, height, {
        scaleFrom200,
        fillBackground: false,
    })
    drawCrossLines(ctx, frame, width, height, { scaleFrom200 })

    drawCornerOrnaments(ctx, frame, width, height, { scaleFrom200 })

    if (frame.layout.bottomStyle === 'passport') {
        drawPassportFrameMarks(ctx, frame, width, height, { scaleFrom200 })
    }

    if (frame.layout.bottomImage) {
        drawBottomImage(ctx, frame, width, height, { scaleFrom200 })
    } else {
        drawBottomText(ctx, frame, width, height, { scaleFrom200 })
    }
}

/** 슬롯에 사진 그리기 (크롭·이동 반영) */
export function drawPhotoInSlot(ctx, img, frame, slotIndex, width, height, transform = {}, options = {}) {
    const { scaleFrom200 = true, photoFilter = 'none' } = options
    const rect = computeSlotRect(frame, slotIndex, width, height, { scaleFrom200 })
    if (!rect) return

    const { x, y, width: slotWidth, height: slotHeight } = rect
    const slot = frame.layout.slots[slotIndex]

    ctx.fillStyle = frame.layout.slotColor || '#ffffff'
    ctx.fillRect(x, y, slotWidth, slotHeight)

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, slotWidth, slotHeight)
    ctx.clip()

    const imgAspect = img.width / img.height
    const slotAspect = slotWidth / slotHeight
    const limits = getMoveLimits(img, slotWidth, slotHeight)
    const offsetX = clampMove(transform.x || 0, limits.minMoveX, limits.maxMoveX)
    const offsetY = clampMove(transform.y || 0, limits.minMoveY, limits.maxMoveY)

    let sourceX = 0
    let sourceY = 0
    let sourceWidth = img.width
    let sourceHeight = img.height

    if (imgAspect > slotAspect) {
        const cropWidth = img.height * slotAspect
        sourceX = (img.width - cropWidth) / 2
        sourceWidth = cropWidth
    } else {
        const cropHeight = img.width / slotAspect
        sourceY = (img.height - cropHeight) / 2
        sourceHeight = cropHeight
    }

    if (limits.maxMoveX > 0) {
        const moveRatio = offsetX / limits.maxMoveX
        const maxCropX = (img.width - sourceWidth) / 2
        sourceX = (img.width - sourceWidth) / 2 - moveRatio * maxCropX
        sourceX = Math.max(0, Math.min(img.width - sourceWidth, sourceX))
    }

    if (limits.maxMoveY > 0) {
        const moveRatio = offsetY / limits.maxMoveY
        const maxCropY = (img.height - sourceHeight) / 2
        sourceY = (img.height - sourceHeight) / 2 - moveRatio * maxCropY
        sourceY = Math.max(0, Math.min(img.height - sourceHeight, sourceY))
    }

    const isBottomSlot = slot.y + slot.height >= 1.0
    const drawWidth = slotWidth + 2
    const drawHeight = isBottomSlot ? slotHeight + 3 : slotHeight + 2
    const drawX = x - 1
    const drawY = y - 1

    ctx.filter = getFilterCss(photoFilter)
    ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        drawX, drawY, drawWidth, drawHeight
    )
    ctx.filter = 'none'

    ctx.restore()
}

/** config.theme.defaultFrameId 로 기본 프레임 찾기 */
export function getDefaultFrame(frames, defaultFrameId) {
    if (!frames?.length) return null
    return frames.find((f) => f.id === defaultFrameId) || frames[0]
}

