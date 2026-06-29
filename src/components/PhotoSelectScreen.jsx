import { useEffect, useRef, useState, useCallback } from 'react'
import {
    computeSlotRect,
    getMoveLimits,
    clampMove,
    drawFrameOverlay,
} from '../lib/canvasFrame'
import { getFilterCss } from '../lib/imageFilters'
import FilterSelector from './common/FilterSelector'
import { useConfig } from '../config/ConfigContext'
import './PhotoSelectScreen.css'

function PhotoSelectScreen({
    frame,
    selectedPhotos,
    photoTransforms,
    photoFilter = 'none',
    onPhotoFilterChange,
    filtersEnabled = true,
    onPhotoSelect,
    onPhotoRemove,
    onPhotoTransformChange,
    onBack,
    onCompose,
    allowPhotoChange = true,
    photoDrag = false,
    showFrameBack = true,
    kioskMode = false,
}) {
    const config = useConfig()
    const eventName = config.event.name
    const frameCanvasRef = useRef(null)
    const slotCanvasRefs = useRef([null, null, null, null])
    const dragRef = useRef(null)
    const [isComposing, setIsComposing] = useState(false)
    const [slotPositions, setSlotPositions] = useState([null, null, null, null])

    const redrawFrameOverlay = useCallback(() => {
        const canvas = frameCanvasRef.current
        if (!canvas || !frame) return

        const ctx = canvas.getContext('2d')
        const width = canvas.width
        const height = canvas.height
        if (!width || !height) return

        drawFrameOverlay(ctx, frame, width, height, { scaleFrom200: false })
    }, [frame])

    const drawFrameBackground = useCallback(() => {
        const canvas = frameCanvasRef.current
        if (!canvas || !frame) return

        const ctx = canvas.getContext('2d')
        const rect = canvas.getBoundingClientRect()
        const width = rect.width
        const height = rect.height

        if (width === 0 || height === 0) return

        canvas.width = width
        canvas.height = height
        ctx.clearRect(0, 0, width, height)
        drawFrameOverlay(ctx, frame, width, height, { scaleFrom200: false })
    }, [frame])

    const calculateSlotPositions = useCallback(() => {
        if (!frameCanvasRef.current || !frame) return

        const frameRect = frameCanvasRef.current.getBoundingClientRect()
        const frameWidth = frameRect.width
        const frameHeight = frameRect.height
        if (frameWidth === 0 || frameHeight === 0) return

        const positions = frame.layout.slots
            .map((_, index) => computeSlotRect(frame, index, frameWidth, frameHeight))
            .filter((p) => p !== null)

        if (positions.length > 0) {
            setSlotPositions(positions)
        }
    }, [frame])

    const handleSlotPointerDown = (index, event) => {
        if (!photoDrag || !selectedPhotos[index]) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = {
            index,
            startX: event.clientX,
            startY: event.clientY,
            base: { ...(photoTransforms[index] || { x: 0, y: 0 }) },
        }
    }

    const handleSlotPointerMove = (index, event) => {
        if (!photoDrag || !dragRef.current || dragRef.current.index !== index) return
        const dx = event.clientX - dragRef.current.startX
        const dy = event.clientY - dragRef.current.startY
        onPhotoTransformChange(index, {
            x: dragRef.current.base.x + dx,
            y: dragRef.current.base.y + dy,
        })
    }

    const handleSlotPointerUp = (index) => {
        if (dragRef.current?.index === index) {
            dragRef.current = null
        }
    }

    const drawPhotoInSlot = useCallback((index, photoSrc) => {
        const canvas = slotCanvasRefs.current[index]
        if (!canvas || !frameCanvasRef.current || !frame) return

        const slot = frame.layout.slots[index]
        if (!slot) return

        // canvas의 부모 요소(.photo-slot) 찾기
        const slotElement = canvas.closest('.photo-slot')
        if (!slotElement) return

        // 부모 요소의 크기 사용 (이미 올바른 위치에 배치되어 있음)
        const slotRect = slotElement.getBoundingClientRect()
        const width = slotRect.width
        const height = slotRect.height

        if (width === 0 || height === 0) return

        const devicePixelRatio = window.devicePixelRatio || 2
        const canvasWidth = width * devicePixelRatio
        const canvasHeight = height * devicePixelRatio

        // Canvas 크기 설정 (부모 요소 기준으로 위치 설정)
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        canvas.style.width = width + 'px'
        canvas.style.height = height + 'px'
        canvas.style.left = '0px'
        canvas.style.top = '0px'
        canvas.style.position = 'absolute'

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 초기화
        ctx.clearRect(0, 0, canvasWidth, canvasHeight)
        ctx.scale(devicePixelRatio, devicePixelRatio)

        const img = new Image()
        // data URL이나 같은 도메인 이미지인 경우 crossOrigin 설정 불필요
        if (photoSrc && !photoSrc.startsWith('data:')) {
            img.crossOrigin = 'anonymous'
        }
        
        img.onload = () => {
            // 다시 한번 확인 (컴포넌트가 언마운트되었을 수 있음)
            if (!canvas) return

            // 부모 요소의 크기 재확인
            const slotElement = canvas.closest('.photo-slot')
            if (!slotElement) return

            const slotRect = slotElement.getBoundingClientRect()
            const currentWidth = slotRect.width
            const currentHeight = slotRect.height

            if (currentWidth === 0 || currentHeight === 0) return

            // Canvas 크기 재설정
            const currentCanvasWidth = currentWidth * devicePixelRatio
            const currentCanvasHeight = currentHeight * devicePixelRatio

            canvas.width = currentCanvasWidth
            canvas.height = currentCanvasHeight
            canvas.style.width = currentWidth + 'px'
            canvas.style.height = currentHeight + 'px'
            canvas.style.left = '0px'
            canvas.style.top = '0px'

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Context 초기화
            ctx.setTransform(1, 0, 0, 1, 0, 0) // Transform 리셋
            ctx.clearRect(0, 0, currentCanvasWidth, currentCanvasHeight)
            ctx.scale(devicePixelRatio, devicePixelRatio)

            // 슬롯 배경색 그리기 (흰색 여백 방지, 약간 크게 그려서 확실히 채우기)
            ctx.fillStyle = frame.layout.slotColor || '#ffffff'
            ctx.fillRect(-1, -1, currentWidth + 2, currentHeight + 2)

            ctx.save()
            ctx.beginPath()
            ctx.rect(0, 0, currentWidth, currentHeight)
            ctx.clip()

            // ResultScreen과 동일한 로직 사용
            const imgAspect = img.width / img.height
            const slotAspect = currentWidth / currentHeight
            const transform = photoTransforms[index] || { x: 0, y: 0 }

            // 이동 범위 계산 (ResultScreen과 동일)
            const limits = getMoveLimits(img, currentWidth, currentHeight)

            // 이동 값 제한 (ResultScreen과 동일)
            const offsetX = clampMove(transform.x || 0, limits.minMoveX, limits.maxMoveX)
            const offsetY = clampMove(transform.y || 0, limits.minMoveY, limits.maxMoveY)

            // 이미지 소스 영역 계산 (크롭) - ResultScreen과 동일
            let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height

            if (imgAspect > slotAspect) {
                const cropWidth = img.height * slotAspect
                sourceX = (img.width - cropWidth) / 2
                sourceWidth = cropWidth
            } else {
                const cropHeight = img.width / slotAspect
                sourceY = (img.height - cropHeight) / 2
                sourceHeight = cropHeight
            }

            // 이동에 따른 소스 영역 조정 - ResultScreen과 동일
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

            // 이미지 그리기 (ResultScreen과 동일) - 슬롯을 완전히 채우도록, 하단 슬롯이 잘리지 않도록
            const isBottomSlot = index >= 2
            const drawWidth = currentWidth + 2
            // 하단 슬롯의 경우 높이를 더 크게 그려서 슬롯을 완전히 채우기
            const drawHeight = isBottomSlot ? currentHeight + 3 : currentHeight + 2
            const drawX = -1
            // 하단 슬롯의 경우 y 위치를 약간 위로 조정하여 슬롯을 완전히 채우기
            const drawY = isBottomSlot ? -1 : -1
            ctx.filter = getFilterCss(photoFilter)
            ctx.drawImage(
                img,
                sourceX, sourceY, sourceWidth, sourceHeight,
                drawX, drawY, drawWidth, drawHeight
            )
            ctx.filter = 'none'
            ctx.restore()

            // 사진을 그린 후 십자가 선 다시 그리기 (사진 위에 표시)
            if (frameCanvasRef.current && frame) {
                setTimeout(() => {
                    redrawFrameOverlay()
                }, 50)
            }
        }
        
        img.onerror = (error) => {
            console.error('이미지 로드 실패:', photoSrc, error)
            // 에러 발생 시 빈 캔버스로 표시
            if (canvas) {
                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.fillStyle = '#f0f0f0'
                    ctx.fillRect(0, 0, canvas.width, canvas.height)
                    ctx.fillStyle = '#999'
                    ctx.font = '14px sans-serif'
                    ctx.textAlign = 'center'
                    ctx.fillText('이미지 로드 실패', canvas.width / 2, canvas.height / 2)
                }
            }
        }
        
        // 이미지 소스 설정 (에러 핸들러 설정 후)
        if (photoSrc) {
            img.src = photoSrc
        } else {
            console.warn('사진 소스가 없습니다:', index)
        }
    }, [frame, photoTransforms, photoFilter, redrawFrameOverlay])

    useEffect(() => {
        if (!frame) return
        
        // 프레임 배경 그리기
        drawFrameBackground()
        
        // 프레임이 그려진 후 슬롯 위치 계산
        const timer1 = setTimeout(() => {
            calculateSlotPositions()
        }, 100)
        
        // 윈도우 리사이즈 시 위치 재계산
        const handleResize = () => {
            drawFrameBackground()
            setTimeout(() => {
                calculateSlotPositions()
            }, 50)
        }
        
        window.addEventListener('resize', handleResize)
        
        return () => {
            clearTimeout(timer1)
            window.removeEventListener('resize', handleResize)
        }
    }, [frame, calculateSlotPositions, drawFrameBackground])


    useEffect(() => {
        if (!frame) return
        
        // 프레임이 완전히 그려진 후 사진을 그리기 위해 약간의 딜레이
        const timer = setTimeout(() => {
            // 프레임이 제대로 그려졌는지 확인
            if (!frameCanvasRef.current) return
            
            const frameRect = frameCanvasRef.current.getBoundingClientRect()
            if (frameRect.width === 0 || frameRect.height === 0) {
                // 프레임이 아직 그려지지 않았으면 재시도
                setTimeout(() => {
                    selectedPhotos.forEach((photo, index) => {
                        if (photo) {
                            drawPhotoInSlot(index, photo)
                        }
                    })
                }, 200)
                return
            }
            
            // 각 슬롯에 사진 배치
            selectedPhotos.forEach((photo, index) => {
                if (photo) {
                    // 각 사진을 약간의 간격을 두고 그리기
                    setTimeout(() => {
                        drawPhotoInSlot(index, photo)
                    }, index * 100)
                }
            })
        }, 600) // 프레임 렌더링 후 충분한 시간 대기
        
        return () => {
            clearTimeout(timer)
        }
    }, [selectedPhotos, photoTransforms, photoFilter, frame, drawPhotoInSlot])

    // 모든 사진이 로드된 후 십자가 선 다시 그리기
    useEffect(() => {
        if (!frame || !frameCanvasRef.current) return
        
        // 사진이 모두 선택되었는지 확인
        const hasAllPhotos = selectedPhotos.every(photo => photo !== null)
        if (!hasAllPhotos) return
        
        // 사진 로딩을 기다린 후 십자가 선 다시 그리기
        const timer = setTimeout(() => {
            redrawFrameOverlay()
        }, 1000)
        
        return () => {
            clearTimeout(timer)
        }
    }, [selectedPhotos, frame, redrawFrameOverlay])

    const handleFileSelect = (index, event) => {
        const file = event.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            onPhotoSelect(index, e.target.result)
        }
        reader.readAsDataURL(file)
    }

    const allPhotosSelected = selectedPhotos.every(photo => photo !== null)

    // 슬롯 위치 스타일 계산
    const getSlotStyle = (index) => {
        const position = slotPositions[index]
        if (!position) {
            return { visibility: 'hidden' }
        }
        
        return {
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${position.width}px`,
            height: `${position.height}px`
        }
    }

    return (
        <div className="photo-select-booth">
            <p className="photo-select-hint">
                {photoDrag && !allowPhotoChange
                    ? '사진을 드래그하여 위치를 조정하세요'
                    : allowPhotoChange
                      ? '각 슬롯을 클릭하여 사진을 추가하세요'
                      : '필터와 위치를 확인하세요'}
            </p>

            <div className="photo-select-body">
                <div className="frame-preview-background">
                    <canvas
                        ref={frameCanvasRef}
                        id="frameOverlayCanvas"
                        className="frame-overlay"
                    />
                    <div className="photo-slots-container">
                        {[0, 1, 2, 3].map((index) => {
                            const slotStyle = getSlotStyle(index)
                            return (
                                <div
                                    key={index}
                                    className={`photo-slot${photoDrag && selectedPhotos[index] ? ' photo-slot--draggable' : ''}`}
                                    data-index={index}
                                    style={slotStyle}
                                    onPointerDown={(e) => handleSlotPointerDown(index, e)}
                                    onPointerMove={(e) => handleSlotPointerMove(index, e)}
                                    onPointerUp={() => handleSlotPointerUp(index)}
                                    onPointerCancel={() => handleSlotPointerUp(index)}
                                >
                                    {allowPhotoChange && (
                                        <input
                                            type="file"
                                            id={`photoInput${index}`}
                                            accept="image/*"
                                            capture="environment"
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleFileSelect(index, e)}
                                        />
                                    )}
                                    <label
                                        htmlFor={allowPhotoChange ? `photoInput${index}` : undefined}
                                        className="photo-slot-label"
                                        style={{ cursor: allowPhotoChange ? 'pointer' : 'default' }}
                                    >
                                        {!selectedPhotos[index] ? (
                                            allowPhotoChange ? (
                                                <div className="slot-placeholder">
                                                    <span className="slot-number">{index + 1}</span>
                                                    <span className="slot-text">사진 선택</span>
                                                </div>
                                            ) : null
                                        ) : (
                                            <canvas
                                                ref={(el) => (slotCanvasRefs.current[index] = el)}
                                                className="slot-canvas"
                                            />
                                        )}
                                    </label>
                                    {selectedPhotos[index] && allowPhotoChange && (
                                        <button
                                            type="button"
                                            className="slot-remove"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onPhotoRemove(index)
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <aside className="photo-select-sidebar">
                    {filtersEnabled && onPhotoFilterChange && (
                        <FilterSelector
                            value={photoFilter}
                            onChange={onPhotoFilterChange}
                            kioskMode={kioskMode}
                        />
                    )}
                    <div className="photo-select-controls">
                        <button type="button" className="booth-btn booth-btn-secondary photo-select-back" onClick={onBack}>
                            {showFrameBack ? '프레임 다시 선택' : '다시 촬영'}
                        </button>
                        <button
                            type="button"
                            className="booth-btn booth-btn-primary"
                            disabled={!allPhotosSelected || isComposing}
                            onClick={() => {
                                setIsComposing(true)
                                onCompose()
                            }}
                        >
                            {isComposing ? '처리 중...' : `${eventName} 만들기`}
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default PhotoSelectScreen

