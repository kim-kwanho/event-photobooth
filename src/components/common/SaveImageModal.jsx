import { useState } from 'react'
import { useConfig } from '../../config/ConfigContext'
import {
    tryShareImage,
    dataUrlToBlob,
    getSaveInstructions,
    isMobileDevice,
    createSaveFilename,
} from '../../lib/saveImage'
import './SaveImageModal.css'

function SaveImageModal({ isOpen, onClose, imageSrc, filename }) {
    const config = useConfig()
    const eventName = config.event.name
    const [sharing, setSharing] = useState(false)
    const instructions = getSaveInstructions()
    const saveFilename = filename || createSaveFilename(eventName)

    if (!isOpen || !imageSrc) return null

    const handleShare = async () => {
        setSharing(true)
        try {
            const blob = await dataUrlToBlob(imageSrc)
            const { ok } = await tryShareImage(blob, saveFilename, {
                title: eventName,
                text: `나만의 ${eventName}`,
            })
            if (ok) onClose()
        } finally {
            setSharing(false)
        }
    }

    return (
        <div className="save-modal-overlay" onClick={onClose}>
            <div className="save-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="save-modal-close" onClick={onClose} aria-label="닫기">
                    ✕
                </button>

                <h3>{instructions.title}</h3>

                <ol className="save-modal-steps">
                    {instructions.steps.map((step) => (
                        <li key={step}>{step}</li>
                    ))}
                </ol>

                <div className="save-modal-image-wrap">
                    <img
                        src={imageSrc}
                        alt={`저장할 ${eventName}`}
                        className="save-modal-image"
                    />
                </div>

                <p className="save-modal-hint">{instructions.hint}</p>

                <div className="save-modal-actions">
                    {isMobileDevice() && (
                        <button
                            className="btn btn-primary"
                            onClick={handleShare}
                            disabled={sharing}
                        >
                            {sharing ? '⏳ 공유 중...' : '📤 공유하기'}
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={onClose}>
                        닫기
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SaveImageModal
