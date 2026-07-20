import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { initDB, savePhotoToDB, loadPhotosFromDB, deletePhotoFromDB } from '../lib/database'
import { useConfig } from '../config/ConfigContext'
import { getDefaultFrame } from '../lib/canvasFrame'
import { useKioskMode } from '../hooks/useKioskMode'
import {
    getInitialScreen,
    getPrevScreen,
} from '../hooks/useBoothFlow'
import BoothShell from '../components/booth/BoothShell'
import CameraScreen from '../components/CameraScreen'
import SizeSelectScreen from '../components/SizeSelectScreen'
import FrameSelectScreen from '../components/FrameSelectScreen'
import PhotoSelectScreen from '../components/PhotoSelectScreen'
import ResultScreen from '../components/ResultScreen'
import SideMenu from '../components/common/SideMenu'
import Header from '../components/common/Header'
import KioskIdleOverlay from '../components/common/KioskIdleOverlay'
import './MainApp.css'

const emptyTransforms = () => [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
]

function MainApp() {
    const config = useConfig()
    const navigate = useNavigate()
    const frames = config.frames || []
    const sizes = config.sizes || []
    const { frameSelect, photoDrag, gallery, kioskMode, filters } = config.features
    const frameFirst = config.flow?.frameFirst ?? false
    const sizeSelectEnabled = frameSelect && sizes.length > 1
    const flowOptions = useMemo(
        () => ({ frameFirst, frameSelect, sizeSelect: sizeSelectEnabled }),
        [frameFirst, frameSelect, sizeSelectEnabled]
    )
    const defaultFrameId = config.theme?.defaultFrameId
    const idleSeconds = config.kiosk?.idleSeconds ?? 60
    const showGallery = gallery && !kioskMode
    const photoCount = config.camera?.photoCount ?? 4
    const countdownSeconds = config.camera?.countdownSeconds ?? 6
    const captureQuality = config.camera?.quality ?? 0.9
    const startBackground = config.branding?.startBackground?.trim() || ''
    const hasStartBgImage = Boolean(startBackground)

    const [currentScreen, setCurrentScreen] = useState(() =>
        getInitialScreen(flowOptions)
    )
    const [selectedPhotos, setSelectedPhotos] = useState(
        () => Array(photoCount).fill(null)
    )
    const [selectedSize, setSelectedSize] = useState(() =>
        sizeSelectEnabled ? null : (sizes[0] || null)
    )
    const [selectedFrame, setSelectedFrame] = useState(null)
    const [photoTransforms, setPhotoTransforms] = useState(emptyTransforms)
    const [photoFilter, setPhotoFilter] = useState('none')
    const [savedPhotos, setSavedPhotos] = useState([])
    const [db, setDb] = useState(null)
    const [sideMenuOpen, setSideMenuOpen] = useState(false)

    const framesForSize = useMemo(() => {
        if (!selectedSize) return frames
        return frames.filter((f) => f.sizeId === selectedSize.id)
    }, [frames, selectedSize])

    const outputSize = useMemo(() => {
        if (selectedSize?.width && selectedSize?.height) {
            return { width: selectedSize.width, height: selectedSize.height }
        }
        return config.output
    }, [selectedSize, config.output])

    const resetToStart = useCallback(() => {
        setSideMenuOpen(false)
        setCurrentScreen(getInitialScreen(flowOptions))
        setSelectedPhotos(Array(photoCount).fill(null))
        setSelectedSize(sizeSelectEnabled ? null : (sizes[0] || null))
        setSelectedFrame(null)
        setPhotoTransforms(emptyTransforms())
        setPhotoFilter('none')
    }, [flowOptions, photoCount, sizeSelectEnabled, sizes])

    const handleKioskIdle = useCallback(() => {
        resetToStart()
        if (kioskMode) {
            navigate(config.routes.landing)
        }
    }, [resetToStart, kioskMode, navigate, config.routes.landing])

    const { secondsLeft, isFullscreen, enterFullscreen } = useKioskMode({
        enabled: kioskMode,
        idleSeconds,
        onIdle: handleKioskIdle,
    })

    useEffect(() => {
        if (!kioskMode || !config.kiosk?.fullscreen) return undefined

        const tryFullscreen = () => {
            enterFullscreen()
        }

        window.addEventListener('pointerdown', tryFullscreen, { once: true })
        return () => window.removeEventListener('pointerdown', tryFullscreen)
    }, [kioskMode, config.kiosk?.fullscreen, enterFullscreen])

    useEffect(() => {
        const { id } = config.event
        const { dbNamePrefix } = config.storage

        initDB(id, dbNamePrefix)
            .then((database) => {
                setDb(database)
                return loadPhotosFromDB(database)
            })
            .then((photos) => {
                setSavedPhotos(photos)
            })
            .catch((error) => {
                console.error('IndexedDB 초기화 실패:', error)
            })
    }, [config.event.id, config.storage.dbNamePrefix])

    const handleSizeSelect = (size) => {
        setSelectedSize(size)
        setSelectedFrame(null)
        setCurrentScreen('frameSelect')
    }

    const handleCaptureComplete = (photos) => {
        if (!photos || photos.length !== photoCount) return

        const newSelectedPhotos = [...photos]
        while (newSelectedPhotos.length < photoCount) {
            newSelectedPhotos.push(null)
        }

        setSelectedPhotos(newSelectedPhotos.slice(0, photoCount))
        setPhotoTransforms(emptyTransforms())
        setPhotoFilter('none')

        if (frameFirst && frameSelect) {
            setCurrentScreen('photoSelect')
            return
        }

        if (frameSelect) {
            setSelectedFrame(null)
            if (sizeSelectEnabled && !selectedSize) {
                setCurrentScreen('sizeSelect')
            } else {
                setCurrentScreen('frameSelect')
            }
        } else {
            setSelectedFrame(getDefaultFrame(frames, defaultFrameId))
            setCurrentScreen('photoSelect')
        }
    }

    const handleFrameSelect = (frame) => {
        setSelectedFrame(frame)

        if (frameFirst) {
            setCurrentScreen('camera')
        } else {
            setCurrentScreen('photoSelect')
        }
    }

    const handlePhotoSelect = (index, photoSrc) => {
        const newPhotos = [...selectedPhotos]
        newPhotos[index] = photoSrc
        setSelectedPhotos(newPhotos)
    }

    const handlePhotoRemove = (index) => {
        const newPhotos = [...selectedPhotos]
        newPhotos[index] = null
        setSelectedPhotos(newPhotos)

        const newTransforms = [...photoTransforms]
        newTransforms[index] = { x: 0, y: 0 }
        setPhotoTransforms(newTransforms)
    }

    const handleCompose = () => {
        if (!selectedFrame || selectedPhotos.some((photo) => !photo)) {
            alert('모든 사진을 선택해주세요.')
            return
        }
        setCurrentScreen('result')
    }

    const handleSave = async () => {
        if (!db) return

        try {
            const resultCanvas = document.getElementById('resultCanvas')
            if (!resultCanvas) return

            const imageData = resultCanvas.toDataURL('image/png')
            const photoData = {
                id: Date.now(),
                data: imageData,
                timestamp: new Date().toISOString(),
            }

            await savePhotoToDB(db, photoData)
            setSavedPhotos([...savedPhotos, photoData])
            alert(`${config.event.name}이 저장되었습니다! 📸`)
        } catch (error) {
            console.error('저장 실패:', error)
            alert('저장 중 오류가 발생했습니다: ' + error.message)
        }
    }

    const handleGalleryPhotoSaved = (photoData) => {
        if (!showGallery) return
        setSavedPhotos((prev) => {
            if (prev.some((p) => p.id === photoData.id)) return prev
            return [photoData, ...prev]
        })
    }

    const handleGalleryPhotoDelete = async (photo) => {
        if (!db) return
        await deletePhotoFromDB(db, photo.id)
        setSavedPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    }

    const handleNewPhoto = () => {
        resetToStart()
    }

    const handlePhotoSelectBack = () => {
        const prev = getPrevScreen('photoSelect', flowOptions)
        if (prev) setCurrentScreen(prev)
    }

    const boothProps = {
        currentScreen,
        frameFirst,
        frameSelect,
        sizeSelect: sizeSelectEnabled,
        kioskMode,
    }

    return (
        <div className={`main-container${kioskMode ? ' kiosk-mode photobooth-bg-host' : ''}`}>
            {kioskMode && !hasStartBgImage && (
                <div className="photobooth-bg-gradient" aria-hidden="true" />
            )}
            {kioskMode && hasStartBgImage && (
                <div
                    className="photobooth-bg-image"
                    style={{ backgroundImage: `url(${startBackground})` }}
                    aria-hidden="true"
                />
            )}
            {kioskMode && (
                <div
                    className={`photobooth-bg-orbs${hasStartBgImage ? ' photobooth-bg-orbs--hidden' : ''}`}
                    aria-hidden="true"
                />
            )}

            <Header
                onMenuClick={showGallery ? () => setSideMenuOpen(true) : undefined}
                showMenu={showGallery}
                kioskMode={kioskMode}
                isFullscreen={isFullscreen}
                onEnterFullscreen={enterFullscreen}
            />

            {kioskMode && <KioskIdleOverlay secondsLeft={secondsLeft} />}

            {showGallery && (
                <SideMenu
                    isOpen={sideMenuOpen}
                    onClose={() => setSideMenuOpen(false)}
                    savedPhotos={savedPhotos}
                    onDeletePhoto={handleGalleryPhotoDelete}
                />
            )}

            {currentScreen === 'sizeSelect' && (
                <BoothShell
                    {...boothProps}
                    immersive={kioskMode}
                    title={kioskMode ? undefined : '크기를 골라주세요'}
                    subtitle={kioskMode ? undefined : '카드형 또는 필름형 중 선택하세요'}
                >
                    <SizeSelectScreen
                        sizes={sizes}
                        onSizeSelect={handleSizeSelect}
                        kioskMode={kioskMode}
                        title="크기를 골라주세요"
                    />
                </BoothShell>
            )}

            {currentScreen === 'frameSelect' && (!sizeSelectEnabled || selectedSize) && (
                <BoothShell
                    {...boothProps}
                    immersive={kioskMode}
                    title="프레임을 골라주세요"
                    subtitle="마음에 드는 디자인을 선택한 뒤 촬영을 시작합니다"
                >
                    <FrameSelectScreen
                        frames={framesForSize}
                        defaultFrameId={defaultFrameId}
                        onFrameSelect={handleFrameSelect}
                        onBack={sizeSelectEnabled ? () => {
                            setSelectedFrame(null)
                            setCurrentScreen('sizeSelect')
                        } : (frameFirst ? undefined : () => {
                            const prev = getPrevScreen('frameSelect', flowOptions)
                            if (prev) setCurrentScreen(prev)
                        })}
                        selectedPhotos={frameFirst ? [] : selectedPhotos}
                        frameFirst={frameFirst}
                        kioskMode={kioskMode}
                        previewAspect={
                            selectedSize
                                ? { width: selectedSize.width, height: selectedSize.height }
                                : null
                        }
                    />
                </BoothShell>
            )}

            {currentScreen === 'camera' && (
                <BoothShell {...boothProps} immersive={kioskMode} bare={!kioskMode}>
                    <CameraScreen
                        onCaptureComplete={handleCaptureComplete}
                        photoCount={photoCount}
                        countdownSeconds={countdownSeconds}
                        captureQuality={captureQuality}
                        kioskMode={kioskMode}
                        autoStart={kioskMode}
                        onBack={
                            frameFirst && frameSelect
                                ? () => {
                                      const prev = getPrevScreen('camera', flowOptions)
                                      if (prev) setCurrentScreen(prev)
                                  }
                                : undefined
                        }
                        selectedFrame={frameFirst ? selectedFrame : null}
                        selectedSize={selectedSize}
                    />
                </BoothShell>
            )}

            {currentScreen === 'photoSelect' && selectedFrame && (
                <BoothShell
                    {...boothProps}
                    title="사진 확인"
                    subtitle="필터와 위치를 조정한 뒤 완성하세요"
                >
                    <PhotoSelectScreen
                        frame={selectedFrame}
                        selectedPhotos={selectedPhotos}
                        photoTransforms={photoTransforms}
                        photoFilter={photoFilter}
                        onPhotoFilterChange={setPhotoFilter}
                        filtersEnabled={filters}
                        onPhotoSelect={handlePhotoSelect}
                        onPhotoRemove={handlePhotoRemove}
                        onPhotoTransformChange={(index, transform) => {
                            const newTransforms = [...photoTransforms]
                            newTransforms[index] = transform
                            setPhotoTransforms(newTransforms)
                        }}
                        onBack={handlePhotoSelectBack}
                        onCompose={handleCompose}
                        allowPhotoChange={false}
                        photoDrag={photoDrag}
                        showFrameBack={frameSelect && !frameFirst}
                        kioskMode={kioskMode}
                        outputSize={outputSize}
                    />
                </BoothShell>
            )}

            {currentScreen === 'result' && selectedFrame && (
                <BoothShell
                    {...boothProps}
                    title="완성!"
                    subtitle="QR로 공유하거나 저장하세요"
                >
                    <ResultScreen
                        frame={selectedFrame}
                        selectedPhotos={selectedPhotos}
                        photoTransforms={photoTransforms}
                        photoFilter={photoFilter}
                        outputSize={outputSize}
                        onPhotoSaved={handleGalleryPhotoSaved}
                        onSave={handleSave}
                        onNewPhoto={handleNewPhoto}
                        kioskMode={kioskMode}
                    />
                </BoothShell>
            )}
        </div>
    )
}

export default MainApp
