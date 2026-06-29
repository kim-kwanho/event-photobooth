import { useState, useEffect } from 'react'
import { useConfig } from '../../config/ConfigContext'
import { getResultUrl } from '../../config/appUrl'
import { getAllPhotosFromServer, deletePhotoFromServer, printPhoto } from '../../lib/api'
import { isSupabaseConfigured } from '../../lib/supabase'
import './AdminPage.css'

function AdminPage() {
  const config = useConfig()
  const printEnabled = config.features?.print ?? false
  const eventName = config.event.name
  const supabaseReady = isSupabaseConfigured()

  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [printQuantities, setPrintQuantities] = useState({})
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const [previewPhoto, setPreviewPhoto] = useState(null)
  const [copiedHash, setCopiedHash] = useState('')

  const loadPhotos = async () => {
    if (!supabaseReady) {
      setPhotos([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setLoadError('')

      const loadedPhotos = await getAllPhotosFromServer()
      setPhotos(loadedPhotos || [])

      const quantities = {}
      loadedPhotos?.forEach((photo) => {
        quantities[photo.id] = printQuantities[photo.id] || 1
      })
      setPrintQuantities(quantities)
    } catch (error) {
      console.error('사진 목록 로드 실패:', error)
      setLoadError(error.message || '사진 목록을 불러오는데 실패했습니다.')
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.body.style.overflowY = 'auto'
    document.documentElement.style.overflowY = 'auto'
    loadPhotos()

    return () => {}
  }, [])

  const handleQuantityChange = (photoId, quantity) => {
    const num = parseInt(quantity) || 1
    setPrintQuantities((prev) => ({
      ...prev,
      [photoId]: Math.max(1, Math.min(100, num)),
    }))
  }

  const handlePrint = async (photo) => {
    const quantity = printQuantities[photo.id] || 1

    if (!confirm(`${eventName}을 ${quantity}장 프린트하시겠습니까?\n\n프린터: Canon SELPHY CP1300`)) {
      return
    }

    try {
      const imageUrl = photo.data || photo.imageUrl

      if (!imageUrl) {
        alert('이미지 URL을 찾을 수 없습니다.')
        return
      }

      await printPhoto(imageUrl, quantity)
      alert(`✅ 프린트 완료!\n\n수량: ${quantity}장\n\n프린터에서 출력을 확인해주세요.`)
    } catch (error) {
      console.error('프린트 실패:', error)
      const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.'

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
        setErrorModal({
          show: true,
          message: '서버에 연결할 수 없습니다.',
          details: '백엔드 서버가 실행 중인지 확인해주세요.',
          instruction: '터미널에서 "npm run dev:server" 명령어로 서버를 실행해주세요.',
        })
      } else {
        setErrorModal({
          show: true,
          message: '프린트에 실패했습니다.',
          details: `오류: ${errorMessage}`,
          instruction: '프린터가 연결되어 있고 전원이 켜져 있는지 확인해주세요.',
        })
      }
    }
  }

  const handleDelete = async (photo) => {
    if (!confirm(`이 ${eventName}을 완전히 삭제하시겠습니까?\n\n삭제된 사진은 복구할 수 없습니다.`)) {
      return
    }

    try {
      await deletePhotoFromServer(photo.hash)
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      if (previewPhoto?.id === photo.id) {
        setPreviewPhoto(null)
      }
      alert('✅ 삭제되었습니다.')
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제에 실패했습니다: ' + error.message)
    }
  }

  const handleCopyLink = async (photo) => {
    const url = getResultUrl(photo.hash)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedHash(photo.hash)
      setTimeout(() => setCopiedHash(''), 2000)
    } catch {
      prompt('링크를 복사하세요:', url)
    }
  }

  const handleImageError = (photo, event) => {
    if (photo.imageName === 'photo.jpg' && event.currentTarget.dataset.fallback !== '1') {
      event.currentTarget.dataset.fallback = '1'
      event.currentTarget.src = photo.data.replace('photo.jpg', 'photo.png')
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString || '날짜 정보 없음'
    }
  }

  return (
    <div className="admin-page admin-page--nested">
      <div className="admin-header">
        <h1>Supabase 저장 {eventName}</h1>
        <p className="admin-description">
          Storage <code>photos</code> 버킷에 업로드된 사진을 확인·삭제할 수 있습니다.
          {!loading && !loadError && (
            <span className="admin-photo-count"> · 총 {photos.length}장</span>
          )}
        </p>
        <button className="btn-refresh" onClick={loadPhotos} disabled={loading}>
          {loading ? '불러오는 중...' : '새로고침'}
        </button>
      </div>

      <div className="admin-content">
        {!supabaseReady && (
          <div className="admin-alert admin-alert--error">
            <p>Supabase가 연결되지 않았습니다.</p>
            <p className="admin-alert-detail">
              Vercel·로컬 환경에 <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>를 설정하세요.
            </p>
          </div>
        )}

        {loadError && (
          <div className="admin-alert admin-alert--error">
            <p>{loadError}</p>
            <button type="button" className="admin-alert-retry" onClick={loadPhotos}>
              다시 시도
            </button>
          </div>
        )}

        {loading && photos.length === 0 && !loadError ? (
          <div className="loading-message">
            <div className="loading-spinner"></div>
            <p>Supabase Storage에서 사진을 불러오는 중...</p>
          </div>
        ) : photos.length === 0 && !loadError ? (
          <div className="empty-message">
            <p>저장된 사진이 없습니다.</p>
            <p>키오스크에서 {eventName}을 만들고 QR 공유하면 Supabase에 저장됩니다.</p>
          </div>
        ) : (
          <div className="photos-grid">
            {photos.map((photo) => (
              <div key={photo.id} className="photo-card">
                <button
                  type="button"
                  className="photo-image photo-image--clickable"
                  onClick={() => setPreviewPhoto(photo)}
                  aria-label={`${eventName} 미리보기`}
                >
                  <img
                    src={photo.data}
                    alt={eventName}
                    loading="lazy"
                    onError={(e) => handleImageError(photo, e)}
                  />
                </button>
                <div className="photo-info">
                  <h3 className="photo-name" title={photo.id}>
                    {eventName}
                  </h3>
                  <p className="photo-date">{formatDate(photo.timestamp || photo.createdAt)}</p>
                  <p className="photo-hash" title={photo.hash}>
                    ID: {photo.hash.slice(0, 8)}…
                  </p>
                </div>
                <div className="photo-actions">
                  <a
                    className="btn-link"
                    href={getResultUrl(photo.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    결과 페이지
                  </a>
                  <button
                    type="button"
                    className="btn-link btn-link--secondary"
                    onClick={() => handleCopyLink(photo)}
                  >
                    {copiedHash === photo.hash ? '복사됨' : '링크 복사'}
                  </button>
                  {printEnabled && (
                    <div className="print-controls">
                      <label>프린트 수량:</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={printQuantities[photo.id] || 1}
                        onChange={(e) => handleQuantityChange(photo.id, e.target.value)}
                        className="quantity-input"
                      />
                      <button className="btn-print" onClick={() => handlePrint(photo)}>
                        프린트
                      </button>
                    </div>
                  )}
                  <button className="btn-delete" onClick={() => handleDelete(photo)}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewPhoto && (
        <div className="admin-preview-overlay" onClick={() => setPreviewPhoto(null)}>
          <div className="admin-preview-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="admin-preview-close"
              onClick={() => setPreviewPhoto(null)}
              aria-label="닫기"
            >
              ×
            </button>
            <img src={previewPhoto.data} alt={eventName} />
            <div className="admin-preview-meta">
              <p>{formatDate(previewPhoto.timestamp || previewPhoto.createdAt)}</p>
              <a href={getResultUrl(previewPhoto.hash)} target="_blank" rel="noopener noreferrer">
                결과 페이지 열기
              </a>
            </div>
          </div>
        </div>
      )}

      {errorModal.show && (
        <div className="error-modal-overlay" onClick={() => setErrorModal({ show: false, message: '' })}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-header">
              <div className="error-icon-wrapper">
                <span className="error-icon">⚠️</span>
              </div>
              <h3 className="error-modal-title">{errorModal.message}</h3>
            </div>
            <div className="error-modal-content">
              <p className="error-modal-details">{errorModal.details}</p>
              {errorModal.instruction && (
                <p className="error-modal-instruction">{errorModal.instruction}</p>
              )}
            </div>
            <div className="error-modal-footer">
              <button
                className="error-modal-button"
                onClick={() => setErrorModal({ show: false, message: '' })}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
