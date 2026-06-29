import { useState } from 'react'
import { saveImage, getSaveButtonLabel } from '../../lib/saveImage'
import SaveImageModal from './SaveImageModal'
import './GalleryPhotoModal.css'

function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return ''
    }
}

function GalleryPhotoModal({ photo, onClose, onDelete }) {
    const [saveModalOpen, setSaveModalOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    if (!photo) return null

    const handleSave = async () => {
        try {
            const result = await saveImage({ dataUrl: photo.data })
            if (result === 'manual') {
                setSaveModalOpen(true)
            }
        } catch {
            setSaveModalOpen(true)
        }
    }

    const handleDelete = async () => {
        if (!confirm('이 인생네컷을 갤러리에서 삭제할까요?')) return

        setDeleting(true)
        try {
            await onDelete(photo)
            onClose()
        } finally {
            setDeleting(false)
        }
    }

    return (
        <>
            <div className="gallery-modal-overlay" onClick={onClose}>
                <div className="gallery-modal-content" onClick={(e) => e.stopPropagation()}>
                    <button className="gallery-modal-close" onClick={onClose} aria-label="닫기">
                        ✕
                    </button>

                    <h3>저장된 인생네컷</h3>
                    {photo.timestamp && (
                        <p className="gallery-modal-date">{formatDate(photo.timestamp)}</p>
                    )}

                    <div className="gallery-modal-image-wrap">
                        <img src={photo.data} alt="저장된 인생네컷" />
                    </div>

                    <div className="gallery-modal-actions">
                        <button className="btn btn-primary" onClick={handleSave}>
                            {getSaveButtonLabel()}
                        </button>
                        <button
                            className="btn btn-secondary gallery-modal-delete"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? '삭제 중...' : '🗑️ 삭제'}
                        </button>
                    </div>
                </div>
            </div>

            <SaveImageModal
                isOpen={saveModalOpen}
                onClose={() => setSaveModalOpen(false)}
                imageSrc={photo.data}
            />
        </>
    )
}

export default GalleryPhotoModal
