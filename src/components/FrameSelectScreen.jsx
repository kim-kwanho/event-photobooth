import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import {
    computeSlotRect,
    drawFrameOverlay,
    drawPhotoInSlot,
} from '../lib/canvasFrame'
import './FrameSelectScreen.css'

/** 선택 화면 전용 — 흰 프레임 대비를 위한 슬롯 placeholder */
const PREVIEW_SLOT_FILL = '#c5cdd6'
const PREVIEW_CANVAS_FILL = '#dbe2ea'

function resolvePreviewSize(previewAspect) {
    if (!previewAspect?.width || !previewAspect?.height) {
        return { w: 280, h: 373 }
    }
    const ratio = previewAspect.width / previewAspect.height
    if (ratio < 0.5) {
        // 필름형 — 좁고 길게
        const w = 140
        return { w, h: Math.round(w / ratio) }
    }
    const w = 280
    return { w, h: Math.round(w / ratio) }
}

function resolveInitialFrameId(frames, defaultFrameId) {
    if (!frames?.length) return null
    if (defaultFrameId != null && frames.some((f) => f.id === defaultFrameId)) {
        return defaultFrameId
    }
    return frames[0].id
}

function FrameSelectScreen({
    frames,
    defaultFrameId,
    onFrameSelect,
    onBack,
    selectedPhotos = [],
    frameFirst = false,
    kioskMode = false,
    previewAspect = null,
}) {
    const canvasRefs = useRef({})
    const [pickedId, setPickedId] = useState(() => resolveInitialFrameId(frames, defaultFrameId))
    const listRef = useRef(null)
    const scrollRafRef = useRef(null)
    const { w: previewW, h: previewH } = useMemo(
        () => resolvePreviewSize(previewAspect),
        [previewAspect]
    )

    const pickedFrame = frames.find((f) => f.id === pickedId)
    const isStrip = previewAspect ? previewAspect.width / previewAspect.height < 0.5 : false

    const drawFramePreview = useCallback((frame) => {
        const canvas = canvasRefs.current[frame.id]
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        ctx.fillStyle = PREVIEW_CANVAS_FILL
        ctx.fillRect(0, 0, previewW, previewH)

        frame.layout.slots.forEach((_, index) => {
            const rect = computeSlotRect(frame, index, previewW, previewH)
            if (!rect) return
            ctx.fillStyle = PREVIEW_SLOT_FILL
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
        })

        drawFrameOverlay(ctx, frame, previewW, previewH, {
            onBottomImageDrawn: () => drawFramePreview(frame),
        })
    }, [previewW, previewH])

    const drawPhotoInPreview = useCallback((frame, slotIndex, photoSrc) => {
        const canvas = canvasRefs.current[frame.id]
        if (!canvas || !photoSrc) return

        const ctx = canvas.getContext('2d')
        const img = new Image()
        img.onload = () => {
            drawPhotoInSlot(ctx, img, frame, slotIndex, previewW, previewH)
            drawFrameOverlay(ctx, frame, previewW, previewH)
        }
        img.src = photoSrc
    }, [previewW, previewH])

    useEffect(() => {
        frames.forEach((frame) => {
            drawFramePreview(frame)

            if (!frameFirst && selectedPhotos?.length) {
                selectedPhotos.forEach((photo, index) => {
                    if (photo) {
                        setTimeout(() => drawPhotoInPreview(frame, index, photo), index * 40)
                    }
                })
            }
        })
    }, [frames, selectedPhotos, frameFirst, drawFramePreview, drawPhotoInPreview])

    const scrollToFrame = useCallback((frameId, smooth = true) => {
        setPickedId(frameId)
        const el = listRef.current?.querySelector(`[data-frame-id="${frameId}"]`)
        el?.scrollIntoView({
            behavior: smooth ? 'smooth' : 'auto',
            inline: 'center',
            block: 'nearest',
        })
    }, [])

    useEffect(() => {
        if (!frames.length) return

        const id = resolveInitialFrameId(frames, defaultFrameId)
        if (id == null) return

        const timer = setTimeout(() => scrollToFrame(id, false), 50)
        return () => clearTimeout(timer)
    }, [frames, defaultFrameId, scrollToFrame])

    const syncPickedFromScroll = useCallback(() => {
        const container = listRef.current
        if (!container) return

        const center = container.scrollLeft + container.clientWidth / 2
        let closestId = null
        let closestDist = Infinity

        container.querySelectorAll('[data-frame-id]').forEach((el) => {
            const itemCenter = el.offsetLeft + el.offsetWidth / 2
            const dist = Math.abs(center - itemCenter)
            if (dist < closestDist) {
                closestDist = dist
                closestId = Number(el.dataset.frameId)
            }
        })

        if (closestId == null) return

        setPickedId((current) => (current === closestId ? current : closestId))
    }, [])

    const handleCarouselScroll = () => {
        if (scrollRafRef.current) return
        scrollRafRef.current = requestAnimationFrame(() => {
            scrollRafRef.current = null
            syncPickedFromScroll()
        })
    }

    const handleConfirm = () => {
        if (pickedFrame) onFrameSelect(pickedFrame)
    }

    const confirmLabel = pickedFrame
        ? frameFirst
            ? `${pickedFrame.name} 프레임으로 촬영하기`
            : `${pickedFrame.name} 프레임으로 완성하기`
        : frameFirst
            ? '이 프레임으로 촬영하기'
            : '이 프레임으로 완성하기'

    return (
        <div className={`frame-select-booth${kioskMode ? ' frame-select-booth--immersive' : ''}${isStrip ? ' frame-select-booth--strip' : ''}`}>
            <div className="frame-carousel-wrap">
                <div className="frame-carousel-fade frame-carousel-fade--left" aria-hidden="true" />
                <div
                    className="frame-carousel"
                    ref={listRef}
                    onScroll={handleCarouselScroll}
                >
                    {frames.map((frame) => (
                        <button
                            key={frame.id}
                            type="button"
                            data-frame-id={frame.id}
                            className={`frame-carousel-item${pickedId === frame.id ? ' selected' : ''}`}
                            onClick={() => scrollToFrame(frame.id)}
                        >
                            <canvas
                                ref={(el) => {
                                    canvasRefs.current[frame.id] = el
                                }}
                                width={previewW}
                                height={previewH}
                            />
                            <span className="frame-carousel-name">{frame.name}</span>
                        </button>
                    ))}
                </div>
                <div className="frame-carousel-fade frame-carousel-fade--right" aria-hidden="true" />
            </div>

            <div className="frame-carousel-dots" role="tablist" aria-label="프레임 목록">
                {frames.map((frame) => (
                    <button
                        key={frame.id}
                        type="button"
                        role="tab"
                        aria-selected={pickedId === frame.id}
                        aria-label={frame.name}
                        className={`frame-carousel-dot${pickedId === frame.id ? ' active' : ''}`}
                        onClick={() => scrollToFrame(frame.id)}
                    />
                ))}
            </div>

            <div className="frame-select-footer">
                {onBack && (
                    <button type="button" className="booth-btn booth-btn-secondary" onClick={onBack}>
                        이전
                    </button>
                )}
                <button
                    type="button"
                    className="booth-btn booth-btn-primary frame-confirm-btn"
                    onClick={handleConfirm}
                    disabled={!pickedId}
                >
                    {confirmLabel}
                </button>
            </div>
        </div>
    )
}

export default FrameSelectScreen
