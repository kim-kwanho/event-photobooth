import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPhotoFromServer } from '../lib/api'
import SaveImageModal from '../components/common/SaveImageModal'
import { saveImage, getSaveButtonLabel, createSaveFilename } from '../lib/saveImage'
import './ResultViewPage.css'

function ResultViewPage() {
    const { id: hash } = useParams()
    const [photoData, setPhotoData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [saveModalOpen, setSaveModalOpen] = useState(false)

    useEffect(() => {
        const loadPhoto = async () => {
            try {
                setLoading(true)
                const result = await getPhotoFromServer(hash)
                setPhotoData({
                    id: result.id,
                    data: result.data,
                    timestamp: result.timestamp,
                })
            } catch (err) {
                console.error('사진 로드 실패:', err)
                setError('사진을 불러오는데 실패했습니다.')
            } finally {
                setLoading(false)
            }
        }

        if (hash) {
            loadPhoto()
        }
    }, [hash])

    const handleDownload = async () => {
        if (!photoData) return

        const filename = createSaveFilename(`인생네컷_${photoData.id}`)

        try {
            const result = await saveImage({ dataUrl: photoData.data, filename })

            if (result === 'manual') {
                setSaveModalOpen(true)
            }
        } catch (err) {
            console.error('저장 실패:', err)
            setSaveModalOpen(true)
        }
    }

    if (loading) {
        return (
            <div className="result-view-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>인생네컷을 불러오는 중...</p>
                </div>
            </div>
        )
    }

    if (error || !photoData) {
        return (
            <div className="result-view-page">
                <div className="error-container">
                    <h2>❌ 오류</h2>
                    <p>{error || '인생네컷을 찾을 수 없습니다.'}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="result-view-page">
            <div className="result-view-container">
                <h1>인생네컷</h1>
                <div className="result-view-image">
                    <img src={photoData.data} alt="인생네컷" />
                </div>
                <div className="result-view-controls">
                    <button className="btn btn-primary" onClick={handleDownload}>
                        {getSaveButtonLabel()}
                    </button>
                </div>
            </div>

            <SaveImageModal
                isOpen={saveModalOpen}
                onClose={() => setSaveModalOpen(false)}
                imageSrc={photoData.data}
                filename={createSaveFilename(`인생네컷_${photoData.id}`)}
            />
        </div>
    )
}

export default ResultViewPage
