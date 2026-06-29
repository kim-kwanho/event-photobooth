import { useRef, useEffect, useCallback } from 'react'
import { computeSlotRect, computeFrameInner, drawFrameOverlay } from '../../../lib/canvasFrame'
import { moveSlot, resizeSlot, getDefaultSlots } from '../../../lib/frameDesigner'
import './SlotEditor.css'

function SlotEditor({
    frame,
    width,
    height,
    selectedSlotIndex,
    onSelectSlot,
    onSlotsChange,
    onDraw,
}) {
    const wrapRef = useRef(null)
    const canvasRef = useRef(null)
    const dragRef = useRef(null)

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas || !frame) return

        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)

        frame.layout.slots.forEach((_, index) => {
            const rect = computeSlotRect(frame, index, width, height)
            if (!rect) return
            ctx.fillStyle = frame.layout.slotColor || '#e8e8e8'
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
        })

        drawFrameOverlay(ctx, frame, width, height)
        onDraw?.(ctx)
    }, [frame, width, height, onDraw])

    useEffect(() => {
        drawCanvas()
    }, [drawCanvas])

    const getNormDelta = (clientX, clientY, startX, startY) => {
        const inner = computeFrameInner(frame, width, height)
        return {
            dx: (clientX - startX) / inner.frameInnerWidth,
            dy: (clientY - startY) / inner.frameInnerHeight,
        }
    }

    const updateSlot = (index, nextSlot) => {
        const slots = frame.layout.slots.map((s, i) => (i === index ? nextSlot : { ...s }))
        onSlotsChange(slots)
    }

    const handlePointerDown = (e, index, mode) => {
        e.preventDefault()
        e.stopPropagation()
        onSelectSlot(index)
        e.currentTarget.setPointerCapture(e.pointerId)

        dragRef.current = {
            index,
            mode,
            startX: e.clientX,
            startY: e.clientY,
            initialSlot: { ...frame.layout.slots[index] },
        }
    }

    const handlePointerMove = (e) => {
        const drag = dragRef.current
        if (!drag) return

        const { dx, dy } = getNormDelta(e.clientX, e.clientY, drag.startX, drag.startY)
        const next =
            drag.mode === 'move'
                ? moveSlot(drag.initialSlot, dx, dy)
                : resizeSlot(drag.initialSlot, dx, dy)

        updateSlot(drag.index, next)
    }

    const handlePointerUp = () => {
        dragRef.current = null
    }

    const handleResetSlots = () => {
        if (!confirm('슬롯을 기본 2×2 배치로 되돌릴까요?')) return
        onSlotsChange(getDefaultSlots())
    }

    return (
        <div
            className="slot-editor"
            ref={wrapRef}
            style={{ width, height }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <canvas ref={canvasRef} width={width} height={height} className="slot-editor-canvas" />

            {frame.layout.slots.map((_, index) => {
                const rect = computeSlotRect(frame, index, width, height)
                if (!rect) return null

                return (
                    <div
                        key={index}
                        className={`slot-editor-handle${selectedSlotIndex === index ? ' active' : ''}`}
                        style={{
                            left: rect.x,
                            top: rect.y,
                            width: rect.width,
                            height: rect.height,
                        }}
                        onPointerDown={(e) => handlePointerDown(e, index, 'move')}
                    >
                        <span className="slot-editor-label">{index + 1}</span>
                        <button
                            type="button"
                            className="slot-editor-resize"
                            aria-label={`슬롯 ${index + 1} 크기 조절`}
                            onPointerDown={(e) => handlePointerDown(e, index, 'resize')}
                        />
                    </div>
                )
            })}

            <button type="button" className="slot-editor-reset" onClick={handleResetSlots}>
                2×2 초기화
            </button>
        </div>
    )
}

export default SlotEditor
