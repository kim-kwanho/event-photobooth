import { useState, useEffect, useRef } from 'react'
import './CameraScreen.css'

// 모바일 디바이스 감지
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && 'ontouchstart' in window)
}

// Safari 브라우저 감지
const isSafari = () => {
    const ua = navigator.userAgent
    return /^((?!chrome|android).)*safari/i.test(ua) ||
           /iPhone|iPad|iPod/.test(ua) ||
           (ua.includes('Safari') && !ua.includes('Chrome'))
}

// getUserMedia (Safari 호환) - pica 부스 스타일
const getUserMedia = async (constraints) => {
    // 최신 API 우선
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints)
        } catch (error) {
            console.error('mediaDevices.getUserMedia 실패:', error)
            throw error
        }
    }
    
    // 구버전 브라우저 지원
    const getUserMediaLegacy = navigator.getUserMedia || 
                               navigator.webkitGetUserMedia || 
                               navigator.mozGetUserMedia || 
                               navigator.msGetUserMedia
    
    if (getUserMediaLegacy) {
        return new Promise((resolve, reject) => {
            getUserMediaLegacy.call(navigator, constraints, resolve, reject)
        })
    }
    
    throw new Error('getUserMedia is not supported in this browser')
}

function CameraScreen({
    onCaptureComplete,
    photoCount = 4,
    countdownSeconds = 6,
    captureQuality = 0.9,
    kioskMode = false,
    autoStart = false,
    onBack,
    selectedFrame = null,
}) {
    const [countdown, setCountdown] = useState(null)
    const [capturedPhotos, setCapturedPhotos] = useState([])
    const [isCapturing, setIsCapturing] = useState(false)
    const [cameraStatus, setCameraStatus] = useState('idle') // 'idle', 'requesting', 'active', 'error'
    const [errorMessage, setErrorMessage] = useState('')
    const [isMobile, setIsMobile] = useState(false)
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const canvasRef = useRef(null)

    // 모바일 디바이스 확인
    useEffect(() => {
        setIsMobile(isMobileDevice())
    }, [])

    // 키오스크: 진입 시 카메라 자동 시작
    useEffect(() => {
        if (!autoStart || cameraStatus !== 'idle') return
        initCamera()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStart])

    // 카메라 정리
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [])

    // 카메라 초기화 함수 (pica 부스 스타일 - 매우 간단하게)
    const initCamera = async () => {
        console.log('=== 카메라 초기화 시작 ===')
        console.log('isSafari:', isSafari())
        console.log('isMobile:', isMobile)
        console.log('navigator.mediaDevices:', navigator.mediaDevices)
        console.log('navigator.getUserMedia:', navigator.getUserMedia)
        console.log('navigator.webkitGetUserMedia:', navigator.webkitGetUserMedia)
        
        setCameraStatus('requesting')
        setErrorMessage('')

        // 비디오 요소 확인
        const video = videoRef.current
        if (!video) {
            console.error('비디오 요소를 찾을 수 없음')
            setCameraStatus('error')
            setErrorMessage('비디오 요소를 찾을 수 없습니다.')
            return false
        }

        console.log('비디오 요소 확인됨:', video)

        try {
            // iOS Safari: 전면 카메라 지정 (video: true만 쓰면 비율/방향이 어긋날 수 있음)
            const constraints = (isMobileDevice() || isSafari())
                ? { video: { facingMode: 'user' }, audio: false }
                : { video: true }
            
            console.log('카메라 제약 조건:', constraints)
            console.log('getUserMedia 호출 전...')
            
            let stream
            try {
                stream = await getUserMedia(constraints)
            } catch (firstError) {
                const usedFacingMode = constraints.video?.facingMode
                if (usedFacingMode) {
                    console.warn('전면 카메라 제약 실패, 기본 설정으로 재시도:', firstError)
                    stream = await getUserMedia({ video: true })
                } else {
                    throw firstError
                }
            }
            
            if (!stream) {
                throw new Error('스트림을 가져올 수 없습니다.')
            }
            
            console.log('스트림 획득 성공:', stream)
            console.log('스트림 active:', stream.active)
            console.log('스트림 tracks:', stream.getTracks())
            
            // 기존 스트림 정리
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
            
            streamRef.current = stream
            
            // 스트림을 비디오에 할당
            video.srcObject = stream
            video.muted = true
            video.playsInline = true
            
            console.log('비디오 srcObject 설정 완료')
            
            // 비디오 재생 (Safari에서 중요)
            try {
                await video.play()
                console.log('비디오 재생 성공')
            } catch (playError) {
                console.error('비디오 재생 실패:', playError)
                // 재생 실패해도 스트림이 있으면 계속 진행
            }
            
            // 포토부스 스타일: 간단한 로드 대기
            return new Promise((resolve) => {
                let resolved = false
                
                const onReady = () => {
                    if (!resolved) {
                        resolved = true
                        setCameraStatus('active')
                        resolve(true)
                    }
                }
                
                const onError = (e) => {
                    console.error('비디오 에러:', e)
                    if (!resolved) {
                        resolved = true
                        setCameraStatus('error')
                        setErrorMessage('비디오 로드에 실패했습니다.')
                        resolve(false)
                    }
                }
                
                // 여러 이벤트로 확인
                video.addEventListener('loadedmetadata', () => {
                    console.log('비디오 메타데이터 로드됨')
                }, { once: true })
                
                video.addEventListener('loadeddata', () => {
                    console.log('비디오 데이터 로드됨')
                }, { once: true })
                
                video.addEventListener('canplay', () => {
                    console.log('비디오 재생 가능')
                }, { once: true })
                
                video.addEventListener('playing', onReady, { once: true })
                video.addEventListener('error', onError, { once: true })
                
                // 이미 재생 중이면 바로 완료
                if (video.readyState >= 3) {
                    console.log('비디오 이미 준비됨')
                    onReady()
                }
                
                // 타임아웃: 스트림이 활성화되어 있으면 바로 active로 설정 (pica 부스 방식)
                setTimeout(() => {
                    if (!resolved) {
                        console.log('타임아웃 체크')
                        console.log('- stream active:', streamRef.current?.active)
                        console.log('- video readyState:', video.readyState)
                        console.log('- video videoWidth:', video.videoWidth)
                        console.log('- video videoHeight:', video.videoHeight)
                        
                        if (streamRef.current && streamRef.current.active) {
                            // 스트림이 활성화되어 있으면 바로 active로 설정
                            resolved = true
                            setCameraStatus('active')
                            // 비디오 재생 재시도
                            video.play().catch(err => {
                                console.error('재생 재시도 실패:', err)
                            })
                            resolve(true)
                        } else if (video.videoWidth > 0 && video.videoHeight > 0) {
                            // 비디오 크기가 있으면 활성화된 것으로 간주
                            resolved = true
                            setCameraStatus('active')
                            resolve(true)
                        } else {
                            resolved = true
                            setCameraStatus('error')
                            setErrorMessage('비디오 로드 시간이 초과되었습니다. 페이지를 새로고침해주세요.')
                            resolve(false)
                        }
                    }
                }, 3000) // 타임아웃을 3초로 증가
            })
        } catch (error) {
            console.error('카메라 접근 실패:', error)
            setCameraStatus('error')
            
            let errorMsg = '카메라 접근에 실패했습니다.'
            
            // Safari 특화 에러 처리
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                if (isSafari()) {
                    errorMsg = '카메라 권한이 필요합니다. Safari 설정 > 사이트 설정에서 카메라 권한을 허용해주세요.'
                } else {
                    errorMsg = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.'
                }
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMsg = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.'
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMsg = '카메라가 다른 앱에서 사용 중일 수 있습니다.'
            } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
                // 제약 조건 문제 시 더 간단한 설정으로 재시도 (pica 부스 방식)
                console.log('제약 조건 오류, 간단한 설정으로 재시도...')
                try {
                    const simpleStream = await getUserMedia({ video: true })
                    streamRef.current = simpleStream
                    const video = videoRef.current
                    if (video) {
                        video.srcObject = simpleStream
                        const playPromise = video.play()
                        if (playPromise !== undefined) {
                            playPromise.catch(err => console.error('재생 실패:', err))
                        }
                        setCameraStatus('active')
                        return true
                    }
                } catch (retryError) {
                    console.error('재시도 실패:', retryError)
                    errorMsg = '카메라 설정을 지원하지 않습니다. 브라우저 설정을 확인해주세요.'
                }
            } else if (error.message && error.message.includes('not supported')) {
                // getUserMedia 미지원 시 더 자세한 안내
                if (isSafari()) {
                    errorMsg = 'Safari에서 카메라를 사용하려면 HTTPS 또는 localhost에서 접속해야 합니다.'
                } else {
                    errorMsg = '이 브라우저는 카메라를 지원하지 않습니다. 최신 브라우저를 사용해주세요.'
                }
            } else {
                errorMsg = `카메라 오류: ${error.message || error.name}`
                console.error('카메라 에러 상세:', error)
            }
            
            // 모바일/Safari에서의 추가 안내
            if (isMobile && isSafari()) {
                errorMsg += ' (Safari에서 카메라를 사용하려면 HTTPS 또는 localhost에서 접속해야 합니다)'
            }
            
            setErrorMessage(errorMsg)
            return false
        }
    }

    // 화면 캡처 함수
    const captureScreen = () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            return null
        }

        const videoWidth = video.videoWidth
        const videoHeight = video.videoHeight

        canvas.width = videoWidth
        canvas.height = videoHeight

        const ctx = canvas.getContext('2d')
        // 미리보기와 동일하게 좌우 반전 (셀피)
        ctx.translate(videoWidth, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight)

        return canvas.toDataURL('image/jpeg', captureQuality)
    }

    const captureSinglePhoto = () => {
        return new Promise((resolve) => {
            setCountdown(countdownSeconds)
            
            const countdownInterval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdownInterval)
                        setTimeout(() => {
                            const photoData = captureScreen()
                            resolve(photoData || null)
                        }, 200)
                        return null
                    }
                    return prev - 1
                })
            }, 1000)
        })
    }

    // 연속 촬영 시작
    const startCapture = async () => {
        if (isCapturing || capturedPhotos.length >= photoCount) return

        // 카메라가 활성화되지 않은 경우
        if (!streamRef.current || cameraStatus !== 'active') {
            alert('카메라를 먼저 시작해주세요.')
            return
        }

        // 비디오가 준비되었는지 확인
        if (!videoRef.current || videoRef.current.readyState < 2) {
            alert('카메라가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.')
            return
        }

        setIsCapturing(true)
        const newPhotos = [...capturedPhotos]

        try {
            for (let i = 0; i < photoCount; i++) {
                const photoData = await captureSinglePhoto()
                
                if (photoData) {
                    newPhotos.push(photoData)
                    setCapturedPhotos([...newPhotos])
                } else {
                    alert(`${i + 1}번째 사진 촬영에 실패했습니다.`)
                    break
                }

                if (i < photoCount - 1) {
                    setCountdown(null)
                    await new Promise(resolve => setTimeout(resolve, 500))
                }
            }

            setIsCapturing(false)
            setCountdown(null)

            if (newPhotos.length === photoCount) {
                setTimeout(() => {
                    onCaptureComplete(newPhotos)
                }, 500)
            }
        } catch (error) {
            console.error('촬영 중 오류:', error)
            setIsCapturing(false)
            setCountdown(null)
            alert('촬영 중 오류가 발생했습니다.')
        }
    }

    // 다시 촬영
    const handleRetake = async () => {
        setCapturedPhotos([])
        setCountdown(null)
        setIsCapturing(false)
        
        // 카메라가 비활성화된 경우 다시 시작
        if (cameraStatus !== 'active' || !streamRef.current) {
            await initCamera()
        }
    }

    const remainingPhotos = photoCount - capturedPhotos.length
    const showStartCamera = !autoStart && (cameraStatus === 'idle' || cameraStatus === 'error')

    return (
        <div className={`camera-screen${kioskMode ? ' camera-screen--kiosk' : ''}`}>
            <div className="camera-container">
                <div className="camera-header">
                    {onBack && (
                        <button type="button" className="camera-back-btn" onClick={onBack}>
                            ← 프레임
                        </button>
                    )}
                    <h2>{kioskMode ? '촬영 준비' : '사진 촬영'}</h2>
                    <p className="camera-subtitle">
                        {capturedPhotos.length > 0 
                            ? `${capturedPhotos.length}/${photoCount}장 촬영 완료` 
                            : `${photoCount}장 · ${countdownSeconds}초 카운트다운`}
                    </p>
                    {selectedFrame && (
                        <p className="camera-frame-badge">프레임: {selectedFrame.name}</p>
                    )}
                </div>

                <div className="camera-preview-wrapper">
                    {/* Safari: transform은 video가 아닌 wrapper에 적용해야 object-fit이 유지됨 */}
                    <div
                        className={`camera-preview-mirror${cameraStatus !== 'active' ? ' hidden' : ''}`}
                    >
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="camera-preview"
                        />
                    </div>
                    
                    {/* 카메라가 활성화되지 않았을 때 placeholder 표시 */}
                    {cameraStatus !== 'active' && (
                        <div className="camera-placeholder">
                            {cameraStatus === 'requesting' ? (
                                <div className="camera-loading">
                                    <div className="loading-spinner"></div>
                                    <p>카메라 권한 요청 중...</p>
                                </div>
                            ) : cameraStatus === 'error' ? (
                                <div className="camera-error">
                                    <div className="error-icon">📷</div>
                                    <p>{errorMessage || '카메라를 사용할 수 없습니다.'}</p>
                                </div>
                            ) : (
                                <div className="camera-idle">
                                    <div className="camera-icon">📷</div>
                                    <p>
                                        {isMobile 
                                            ? '모바일에서는 카메라 시작 버튼을 눌러주세요'
                                            : '카메라를 시작하려면 아래 버튼을 클릭하세요'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {countdown !== null && (
                        <div className="countdown-overlay">
                            <div className="countdown-number">{countdown}</div>
                        </div>
                    )}

                    {capturedPhotos.length > 0 && (
                        <div className="captured-indicator">
                            <div className="captured-badge">
                                {capturedPhotos.length}/{photoCount}
                            </div>
                        </div>
                    )}
                </div>

                <div className="camera-controls">
                    {showStartCamera && (
                        <button
                            className="btn btn-primary btn-start-camera"
                            onClick={initCamera}
                            disabled={cameraStatus === 'requesting'}
                        >
                            {cameraStatus === 'error' ? '카메라 다시 시작' : '카메라 시작'}
                        </button>
                    )}
                    
                    {capturedPhotos.length > 0 && !isCapturing && (
                        <button 
                            className="btn btn-secondary"
                            onClick={handleRetake}
                            disabled={isCapturing}
                        >
                            다시 촬영
                        </button>
                    )}
                    
                    <button
                        className={`btn btn-primary btn-capture${kioskMode ? ' btn-capture--hero' : ''}`}
                        onClick={startCapture}
                        disabled={isCapturing || capturedPhotos.length >= photoCount || cameraStatus !== 'active'}
                    >
                        {isCapturing 
                            ? `촬영 중... ${countdown || ''}초` 
                            : capturedPhotos.length >= photoCount
                            ? '촬영 완료'
                            : cameraStatus !== 'active'
                            ? cameraStatus === 'requesting'
                            ? '카메라 준비 중...'
                            : autoStart
                            ? '카메라 연결 중...'
                            : '카메라를 먼저 시작하세요'
                            : kioskMode
                            ? '터치하여 촬영 시작'
                            : '촬영 시작'
                        }
                    </button>
                </div>
            </div>

            {/* 숨겨진 캔버스 (캡처용) */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    )
}

export default CameraScreen

