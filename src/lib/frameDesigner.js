const DEFAULT_SLOTS = [
    { x: 0, y: 0, width: 0.5, height: 0.5 },
    { x: 0.5, y: 0, width: 0.5, height: 0.5 },
    { x: 0, y: 0.5, width: 0.5, height: 0.5 },
    { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
]

const MIN_SLOT_SIZE = 0.12

export function createDefaultFrame(nextId) {
    return {
        id: nextId,
        name: `프레임 ${nextId}`,
        layout: {
            slots: DEFAULT_SLOTS.map((s) => ({ ...s })),
            frameColor: '#6B46C1',
            frameWidth: 18,
            slotColor: '#F5F5F0',
            bottomText: 'PHOTO BOOTH',
            textColor: '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
        },
    }
}

export function getDefaultSlots() {
    return DEFAULT_SLOTS.map((s) => ({ ...s }))
}

export function getNextFrameId(frames) {
    if (!frames.length) return 1
    return Math.max(...frames.map((f) => f.id)) + 1
}

export function clampSlot(slot) {
    let { x, y, width, height } = slot
    width = Math.max(MIN_SLOT_SIZE, Math.min(width, 1))
    height = Math.max(MIN_SLOT_SIZE, Math.min(height, 1))
    x = Math.max(0, Math.min(x, 1 - width))
    y = Math.max(0, Math.min(y, 1 - height))
    return { x, y, width, height }
}

export function moveSlot(slot, dx, dy) {
    return clampSlot({
        ...slot,
        x: slot.x + dx,
        y: slot.y + dy,
    })
}

export function resizeSlot(slot, dw, dh) {
    return clampSlot({
        ...slot,
        width: slot.width + dw,
        height: slot.height + dh,
    })
}

export function exportFramesPayload(frames) {
    return { frames }
}

export function downloadFramesJson(frames, filename = 'frames.json') {
    const blob = new Blob([JSON.stringify(exportFramesPayload(frames), null, 2)], {
        type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
}

export function copyFramesJson(frames) {
    return navigator.clipboard.writeText(JSON.stringify(exportFramesPayload(frames), null, 2))
}

export const FRAME_DRAFT_KEY = (themeId) => `photobooth-frame-draft-${themeId}`

export function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(';base64,')
    const contentType = parts[0].split(':')[1] || 'image/png'
    const raw = window.atob(parts[1])
    const arr = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
    return new Blob([arr], { type: contentType })
}
