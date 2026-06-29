import { useEffect, useRef, useCallback, useState } from 'react'
import {
    computeSlotRect,
    drawFrameOverlay,
    drawPhotoInSlot,
} from '../lib/canvasFrame'
import './FrameSelectScreen.css'

const PREVIEW_W = 200
const PREVIEW_H = 267

function FrameSelectScreen({
    frames,
    onFrameSelect,
    onBack,
    selectedPhotos = [],
    frameFirst = false,
}) {
    const canvasRefs = useRef({})
    const [pickedId, setPickedId] = useState(frames[0]?.id ?? null)
    const listRef = useRef(null)

    const drawFramePreview = useCallback((frame) => {
        const canvas = canvasRefs.current[frame.id]
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H)

        frame.layout.slots.forEach((_, index) => {
            const rect = computeSlotRect(frame, index, PREVIEW_W, PREVIEW_H)
            if (!rect) return
            ctx.fillStyle = frame.layout.slotColor || '#e8e8e8'
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
        })

        drawFrameOverlay(ctx, frame, PREVIEW_W, PREVIEW_H)
    }, [])

    const drawPhotoInPreview = useCallback((frame, slotIndex, photoSrc) => {
        const canvas = canvasRefs.current[frame.id]
        if (!canvas || !photoSrc) return

        const ctx = canvas.getContext('2d')
        const img = new Image()
        img.onload = () => {
            drawPhotoInSlot(ctx, img, frame, slotIndex, PREVIEW_W, PREVIEW_H)
            drawFrameOverlay(ctx, frame, PREVIEW_W, PREVIEW_H)
        }
        img.src = photoSrc
    }, [])

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

    const handleConfirm = () => {
        const frame = frames.find((f) => f.id === pickedId)
        if (frame) onFrameSelect(frame)
    }

    const scrollToFrame = (frameId) => {
        setPickedId(frameId)
        const el = listRef.current?.querySelector(`[data-frame-id="${frameId}"]`)
        el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }

    return (
        <div className="frame-select-booth">
            <div className="frame-carousel" ref={listRef}>
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
                            width={PREVIEW_W}
                            height={PREVIEW_H}
                        />
                        <span className="frame-carousel-name">{frame.name}</span>
                    </button>
                ))}
            </div>

            <div className="frame-select-actions">
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
                    {frameFirst ? '이 프레임으로 촬영하기' : '이 프레임으로 완성하기'}
                </button>
            </div>
        </div>
    )
}

export default FrameSelectScreen
