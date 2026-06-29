import { useEffect, useRef, useCallback, useState } from 'react'
import QRCodeStyling from 'qr-code-styling'
import { savePhotoToServer } from '../lib/api'
import { getResultUrl } from '../config/appUrl'
import { useConfig } from '../config/ConfigContext'
import { drawPhotoInSlot, drawFrameOverlay } from '../lib/canvasFrame'
import SaveImageModal from './common/SaveImageModal'
import { saveImage, getSaveButtonLabel, createSaveFilename, isMobileDevice } from '../lib/saveImage'
import { initDB, savePhotoToDB } from '../lib/database'
import './ResultScreen.css'

function ResultScreen({ frame, selectedPhotos, photoTransforms, photoFilter = 'none', onPhotoSaved, onSave, onNewPhoto, outputSize, kioskMode = false }) {
    const config = useConfig()
    const qrShareEnabled = config.features?.qrShare !== false
    const canvasRef = useRef(null)
    const qrRef = useRef(null)
    const [qrModalOpen, setQrModalOpen] = useState(false)
    const [photoHash, setPhotoHash] = useState(null)
    const [isGeneratingQR, setIsGeneratingQR] = useState(false)
    
    // 자동 저장 상태 관리
    const [isAutoSaved, setIsAutoSaved] = useState(false)
    const [autoSaveHash, setAutoSaveHash] = useState(null)
    const [saveModalOpen, setSaveModalOpen] = useState(false)
    const [saveImageSrc, setSaveImageSrc] = useState(null)
    const isSavedRef = useRef(false)
    const saveTimeoutRef = useRef(null)

    const qrInlineRef = useRef(null)
    const finalHash = autoSaveHash || photoHash

    const renderQrTo = (container, hash) => {
        if (!container || !hash) return
        container.innerHTML = ''
        const qrCode = new QRCodeStyling({
            width: kioskMode ? 220 : 300,
            height: kioskMode ? 220 : 300,
            type: 'svg',
            data: getResultUrl(hash),
            dotsOptions: { color: '#000000', type: 'rounded' },
            backgroundOptions: { color: '#ffffff' },
        })
        qrCode.append(container)
    }

    useEffect(() => {
        if (!qrShareEnabled || !finalHash || !kioskMode) return
        const timer = setTimeout(() => {
            renderQrTo(qrInlineRef.current, finalHash)
        }, 300)
        return () => clearTimeout(timer)
    }, [finalHash, kioskMode, qrShareEnabled])

    const renderWidth = outputSize?.width ?? 1200
    const renderHeight = outputSize?.height ?? 1600

    const handleAutoSave = async () => {
        const canvas = canvasRef.current
        if (!canvas) return

        // 이미 저장 중이거나 저장 완료된 경우 중복 방지
        if (isSavedRef.current) {
            console.log('이미 저장되었거나 저장 중입니다. 중복 저장 방지.')
            return
        }

        // 저장 시작 표시
        isSavedRef.current = true

        try {
            console.log('자동 저장 시작...')
            // 고유 ID 생성
            const uniqueId = `lifecut_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

            // 현재 결과물을 이미지로 변환
            const imageData = canvas.toDataURL('image/png')

            // 서버에 저장
            const result = await savePhotoToServer({
                id: uniqueId,
                imageData: imageData,
                timestamp: new Date().toISOString()
            })

            // 해시값 저장
            setAutoSaveHash(result.hash)
            setPhotoHash(result.hash)
            setIsAutoSaved(true)

            // 로컬 IndexedDB에도 저장 (백업)
            const photoData = {
                id: uniqueId,
                data: imageData,
                timestamp: new Date().toISOString(),
            }

            try {
                const db = await initDB(config.event.id, config.storage.dbNamePrefix)
                await savePhotoToDB(db, photoData)
                onPhotoSaved?.(photoData)
            } catch (localError) {
                console.warn('로컬 저장 실패 (무시):', localError)
            }

            console.log('자동 저장 완료:', result.hash)

        } catch (error) {
            console.error('자동 저장 실패:', error)
            // 저장 실패 시 다시 시도할 수 있도록 플래그 리셋
            isSavedRef.current = false
            // 자동 저장 실패는 사용자에게 알리지 않고 조용히 넘어감 (QR 생성 시 다시 시도하므로)
        }
    }

    const composeLifecut = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const devicePixelRatio = window.devicePixelRatio || 2
        const displayWidth = 400
        const displayHeight = Math.round(displayWidth * (renderHeight / renderWidth))

        canvas.width = renderWidth * devicePixelRatio
        canvas.height = renderHeight * devicePixelRatio
        canvas.style.width = `${displayWidth}px`
        canvas.style.height = `${displayHeight}px`

        const ctx = canvas.getContext('2d')
        ctx.scale(devicePixelRatio, devicePixelRatio)

        const canvasWidth = renderWidth
        const canvasHeight = renderHeight

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        let loadedCount = 0
        const totalPhotos = selectedPhotos.filter((p) => p).length

        const finishComposition = () => {
            drawFrameOverlay(ctx, frame, canvasWidth, canvasHeight, { scaleFrom200: true })

            if (!isSavedRef.current && !saveTimeoutRef.current) {
                saveTimeoutRef.current = setTimeout(() => {
                    if (!isSavedRef.current) {
                        handleAutoSave()
                    }
                    saveTimeoutRef.current = null
                }, 500)
            }
        }

        if (totalPhotos === 0) {
            drawFrameOverlay(ctx, frame, canvasWidth, canvasHeight, { scaleFrom200: true })
            return
        }

        selectedPhotos.forEach((photoSrc, index) => {
            if (!photoSrc) {
                loadedCount++
                if (loadedCount === totalPhotos) finishComposition()
                return
            }

            const img = new Image()
            img.onload = () => {
                drawPhotoInSlot(
                    ctx,
                    img,
                    frame,
                    index,
                    canvasWidth,
                    canvasHeight,
                    photoTransforms[index],
                    { scaleFrom200: true, photoFilter }
                )
                loadedCount++
                if (loadedCount === totalPhotos) finishComposition()
            }
            img.onerror = () => {
                console.error(`사진 ${index + 1} 로드 실패`)
                loadedCount++
                if (loadedCount === totalPhotos) finishComposition()
            }
            img.src = photoSrc
        })
    }, [frame, selectedPhotos, photoTransforms, photoFilter, renderWidth, renderHeight])

    useEffect(() => {
        // composeLifecut 호출 전에 저장 플래그 리셋 (새로운 렌더링 시작)
        // 단, 이미 저장이 완료된 경우는 리셋하지 않음 (사용자가 새로 만들기를 누른 경우만)
        // isSavedRef.current = false // 이건 주석 처리 - 한 번 저장되면 계속 유지
        
        // 기존 타이머 취소
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
            saveTimeoutRef.current = null
        }
        
        composeLifecut()
        
        // 컴포넌트 언마운트 시 타이머 정리
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
                saveTimeoutRef.current = null
            }
        }
    }, [composeLifecut])

    const handleDownload = async () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const imageData = canvas.toDataURL('image/png')
        const filename = createSaveFilename()

        try {
            const result = await saveImage({ dataUrl: imageData, filename })

            if (result === 'manual') {
                setSaveImageSrc(imageData)
                setSaveModalOpen(true)
            }
        } catch (error) {
            console.error('저장 실패:', error)
            setSaveImageSrc(imageData)
            setSaveModalOpen(true)
        }
    }

    // QR 코드 생성 (이제 이미 저장된 해시 사용)
    const handleGenerateQR = async () => {
        const canvas = canvasRef.current
        if (!canvas) return

        // 자동 저장이 아직 안 끝났으면 잠시 대기
        if (!autoSaveHash && !photoHash) {
            setIsGeneratingQR(true)
            // 2초 정도 대기해보고 없으면 수동 저장 시도
            try {
                await new Promise(resolve => setTimeout(resolve, 2000))
                if (!autoSaveHash && !photoHash) {
                    await handleAutoSave() // 수동 저장 시도
                }
            } catch (e) {
                console.error(e)
            }
            setIsGeneratingQR(false)
        }

        const finalHash = autoSaveHash || photoHash
        if (!finalHash) {
            alert('아직 저장이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.')
            return
        }

        setQrModalOpen(true)

        const qrUrl = getResultUrl(finalHash)
        
        // 모달이 열린 후 QR 코드 생성 및 렌더링
        setTimeout(() => {
            if (qrRef.current) {
                qrRef.current.innerHTML = '' // 기존 QR 코드 제거
                
                const qrCode = new QRCodeStyling({
                    width: 300,
                    height: 300,
                    type: "svg",
                    data: qrUrl,
                    // image: "/favicon.svg", // 로고 제거
                    dotsOptions: {
                        color: "#000000",
                        type: "rounded"
                    },
                    backgroundOptions: {
                        color: "#ffffff",
                    },
                    imageOptions: {
                        crossOrigin: "anonymous",
                        margin: 10
                    }
                })
                
                qrCode.append(qrRef.current)
            }
        }, 100)
    }




    return (
        <div className={`result-booth${kioskMode ? ' result-booth--kiosk' : ''}`}>
            <div className="result-hero-grid">
                <div className="result-image">
                    <canvas ref={canvasRef} id="resultCanvas" />
                </div>

                {qrShareEnabled && kioskMode && (
                    <aside className="result-qr-hero">
                        <h3>📱 QR로 가져가기</h3>
                        <p>스마트폰으로 스캔하면 바로 저장할 수 있어요</p>
                        <div className="result-qr-inline" ref={qrInlineRef}>
                            {!finalHash && (
                                <div className="result-qr-loading">QR 생성 중...</div>
                            )}
                        </div>
                        {finalHash && (
                            <p className="result-qr-url">{getResultUrl(finalHash)}</p>
                        )}
                    </aside>
                )}
            </div>

            <div className="result-controls">
                <button type="button" className="booth-btn booth-btn-primary" onClick={onNewPhoto}>
                    새로 만들기
                </button>
                <button type="button" className="booth-btn booth-btn-secondary" onClick={handleDownload}>
                    {getSaveButtonLabel()}
                </button>
                {qrShareEnabled && !kioskMode && (
                    <button
                        type="button"
                        className="booth-btn booth-btn-secondary"
                        onClick={handleGenerateQR}
                    >
                        {isGeneratingQR ? '⏳ 처리 중...' : '📱 QR 보기'}
                    </button>
                )}
                {isMobileDevice() && (
                    <p className="result-save-hint">
                        저장: 「저장하기」→ 공유 시트에서 「사진에 저장」
                    </p>
                )}
            </div>

            {qrModalOpen && (
                <div className="qr-modal-overlay" onClick={() => setQrModalOpen(false)}>
                    <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="qr-modal-close"
                            onClick={() => setQrModalOpen(false)}
                        >
                            ✕
                        </button>
                        <h3>📱 QR 코드</h3>
                        <p style={{ marginBottom: '10px' }}>
                            이 QR 코드를 스캔하면<br />
                            <strong>다른 기기에서도 결과물을 다운로드</strong>할 수 있습니다.
                        </p>
                        <div className="qr-code-image" ref={qrRef} />
                        <p className="qr-url">{getResultUrl(photoHash || autoSaveHash)}</p>
                    </div>
                </div>
            )}

            <SaveImageModal
                isOpen={saveModalOpen}
                onClose={() => setSaveModalOpen(false)}
                imageSrc={saveImageSrc}
            />
        </div>
    )
}

export default ResultScreen
