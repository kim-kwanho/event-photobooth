import { useState } from 'react'
import GalleryPhotoModal from './GalleryPhotoModal'
import './SideMenu.css'

function SideMenu({ isOpen, onClose, savedPhotos, onDeletePhoto }) {
    const [selectedPhoto, setSelectedPhoto] = useState(null)

    const handleClose = () => {
        setSelectedPhoto(null)
        onClose()
    }

    return (
        <>
            {isOpen && <div className="side-menu-overlay" onClick={handleClose} />}
            <div className={`side-menu ${isOpen ? 'active' : ''}`}>
                <div className="side-menu-header">
                    <h2>저장된 인생네컷</h2>
                    <button className="close-btn" onClick={handleClose}>✕</button>
                </div>
                <div className="gallery">
                    {savedPhotos.length === 0 ? (
                        <p className="empty-message">
                            저장된 사진이 없습니다.<br />
                            촬영 후 자동으로 여기에 표시됩니다.
                        </p>
                    ) : (
                        savedPhotos.map((photo) => (
                            <div
                                key={photo.id}
                                className="gallery-item"
                                onClick={() => setSelectedPhoto(photo)}
                            >
                                <img src={photo.data} alt="저장된 인생네컷" />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {selectedPhoto && (
                <GalleryPhotoModal
                    photo={selectedPhoto}
                    onClose={() => setSelectedPhoto(null)}
                    onDelete={onDeletePhoto}
                />
            )}
        </>
    )
}

export default SideMenu
