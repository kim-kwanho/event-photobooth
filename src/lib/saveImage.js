/** iPad(데스크톱 모드 포함) · iPhone 등 터치 기기 감지 */
export function isMobileDevice() {
    const ua = navigator.userAgent
    const isClassicMobile = /Android|webOS|iPhone|iPad|iPod/i.test(ua)
    const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
    return isClassicMobile || isIpadOs
}

export function isIOS() {
    const ua = navigator.userAgent
    const isClassicIos = /iPhone|iPad|iPod/i.test(ua)
    const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
    return isClassicIos || isIpadOs
}

export function getSaveButtonLabel() {
    return isMobileDevice() ? '📥 저장하기' : '📥 다운로드'
}

export function createSaveFilename(prefix = '인생네컷') {
    return `${prefix}_${Date.now()}.png`
}

export function canvasToBlob(canvas, type = 'image/png', quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type, quality)
    })
}

export async function dataUrlToBlob(dataUrl) {
    const response = await fetch(dataUrl)
    return response.blob()
}

export async function tryShareImage(blob, filename) {
    if (!navigator.share || !navigator.canShare) {
        return { ok: false, cancelled: false }
    }

    const file = new File([blob], filename, { type: blob.type || 'image/png' })
    if (!navigator.canShare({ files: [file] })) {
        return { ok: false, cancelled: false }
    }

    try {
        await navigator.share({
            title: '인생네컷',
            text: '나만의 인생네컷',
            files: [file],
        })
        return { ok: true, cancelled: false }
    } catch (error) {
        const cancelled = error?.name === 'AbortError'
        return { ok: false, cancelled }
    }
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = filename
    link.href = url
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 200)
}

/**
 * 이미지 저장 (기기별 최적 경로)
 * @returns {'shared' | 'downloaded' | 'manual'} 처리 방식
 */
export async function saveImage({ blob, dataUrl, filename }) {
    const imageBlob = blob || (dataUrl ? await dataUrlToBlob(dataUrl) : null)
    if (!imageBlob) {
        throw new Error('저장할 이미지가 없습니다.')
    }

    const saveFilename = filename || createSaveFilename()

    if (isMobileDevice()) {
        const { ok, cancelled } = await tryShareImage(imageBlob, saveFilename)
        if (ok) return 'shared'
        if (!cancelled) {
            // 공유 API 미지원 → 수동 저장 모달로 안내
            return 'manual'
        }
        // 사용자가 공유 시트를 닫음 → 수동 저장 안내
        return 'manual'
    }

    downloadBlob(imageBlob, saveFilename)
    return 'downloaded'
}

export function getSaveInstructions() {
    if (isIOS()) {
        return {
            title: '사진에 저장하는 방법',
            steps: [
                '아래 이미지를 길게 누르세요',
                '「사진에 저장」 또는 「이미지 저장」을 선택하세요',
            ],
            hint: '또는 「공유하기」 버튼 → 「사진에 저장」',
        }
    }

    return {
        title: '사진에 저장하는 방법',
        steps: [
            '아래 이미지를 길게 누르세요',
            '「이미지 다운로드」 또는 「갤러리에 저장」을 선택하세요',
        ],
        hint: '또는 「공유하기」 버튼을 이용하세요',
    }
}
