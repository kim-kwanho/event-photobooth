import { useState, useEffect, useRef } from 'react'
import { useConfig } from '../../config/ConfigContext'
import {
    createDefaultFrame,
    getNextFrameId,
    downloadFramesJson,
    copyFramesJson,
    FRAME_DRAFT_KEY,
} from '../../lib/frameDesigner'
import { saveThemeFramesToSupabase, getThemeFramesPublicUrl } from '../../lib/themeStorage'
import SlotEditor from './components/SlotEditor'
import './FrameDesignerPage.css'

const PREVIEW_W = 300
const PREVIEW_H = 400

function FrameDesignerPage() {
    const config = useConfig()
    const themeId = config.theme?.id || 'default'
    const framesPath = config.theme?.framesPath || '/themes/default/frames.json'
    const draftKey = FRAME_DRAFT_KEY(themeId)
    const logoInputRef = useRef(null)

    const [frames, setFrames] = useState(() => {
        try {
            const saved = localStorage.getItem(draftKey)
            if (saved) return JSON.parse(saved).frames
        } catch { /* ignore */ }
        return JSON.parse(JSON.stringify(config.frames || []))
    })
    const [selectedId, setSelectedId] = useState(frames[0]?.id ?? null)
    const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)
    const [copied, setCopied] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')
    const [logoPreview, setLogoPreview] = useState(null)

    const selectedFrame = frames.find((f) => f.id === selectedId) || frames[0]

    useEffect(() => {
        localStorage.setItem(draftKey, JSON.stringify({ frames }))
    }, [frames, draftKey])

    useEffect(() => {
        setLogoPreview(selectedFrame?.layout?.bottomImage || null)
    }, [selectedFrame?.id, selectedFrame?.layout?.bottomImage])

    const updateLayout = (field, value) => {
        if (!selectedFrame) return
        setFrames((prev) =>
            prev.map((f) =>
                f.id === selectedFrame.id
                    ? { ...f, layout: { ...f.layout, [field]: value } }
                    : f
            )
        )
    }

    const updateName = (name) => {
        if (!selectedFrame) return
        setFrames((prev) => prev.map((f) => (f.id === selectedFrame.id ? { ...f, name } : f)))
    }

    const updateSlots = (slots) => {
        if (!selectedFrame) return
        setFrames((prev) =>
            prev.map((f) =>
                f.id === selectedFrame.id
                    ? { ...f, layout: { ...f.layout, slots: slots.map((s) => ({ ...s })) } }
                    : f
            )
        )
    }

    const handleAddFrame = () => {
        const newFrame = createDefaultFrame(getNextFrameId(frames))
        setFrames((prev) => [...prev, newFrame])
        setSelectedId(newFrame.id)
    }

    const handleDeleteFrame = () => {
        if (!selectedFrame || frames.length <= 1) return
        if (!confirm(`"${selectedFrame.name}" 프레임을 삭제할까요?`)) return
        const next = frames.filter((f) => f.id !== selectedFrame.id)
        setFrames(next)
        setSelectedId(next[0]?.id ?? null)
    }

    const handleReset = () => {
        if (!confirm('저장된 초안을 지우고 테마 기본 프레임으로 되돌릴까요?')) return
        localStorage.removeItem(draftKey)
        const fresh = JSON.parse(JSON.stringify(config.frames || []))
        setFrames(fresh)
        setSelectedId(fresh[0]?.id ?? null)
    }

    const handleCopy = async () => {
        await copyFramesJson(frames)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleLogoSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file || !selectedFrame) return

        const reader = new FileReader()
        reader.onload = () => {
            const dataUrl = reader.result
            setLogoPreview(dataUrl)
            updateLayout('bottomImage', dataUrl)
            updateLayout('bottomText', undefined)
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handleRemoveLogo = () => {
        setLogoPreview(null)
        updateLayout('bottomImage', undefined)
    }

    const handleUseTextInstead = () => {
        updateLayout('bottomImage', undefined)
        setLogoPreview(null)
        if (!selectedFrame.layout.bottomText) {
            updateLayout('bottomText', 'PHOTO BOOTH')
        }
    }

    const handleSupabaseSave = async () => {
        setSaving(true)
        setSaveMessage('')
        try {
            const result = await saveThemeFramesToSupabase(themeId, frames)
            setFrames(result.frames)
            setSaveMessage(`Supabase 저장 완료! 앱에서 theme.framesStorage: "supabase" 설정 후 새로고침하세요.`)
        } catch (error) {
            console.error(error)
            setSaveMessage(`저장 실패: ${error.message}. Supabase에 "themes" 버킷(Public)과 storage-policies.sql을 적용했는지 확인하세요.`)
        } finally {
            setSaving(false)
        }
    }

    if (!selectedFrame) {
        return (
            <div className="frame-designer-empty">
                <p>프레임이 없습니다.</p>
                <button type="button" className="fd-btn fd-btn-primary" onClick={handleAddFrame}>
                    프레임 추가
                </button>
            </div>
        )
    }

    const layout = selectedFrame.layout
    let supabaseUrl = ''
    try {
        supabaseUrl = getThemeFramesPublicUrl(themeId)
    } catch { /* supabase 미설정 */ }

    return (
        <div className="frame-designer">
            <aside className="fd-sidebar">
                <div className="fd-sidebar-header">
                    <h2>프레임 목록</h2>
                    <button type="button" className="fd-btn fd-btn-sm" onClick={handleAddFrame}>
                        + 추가
                    </button>
                </div>
                <ul className="fd-frame-list">
                    {frames.map((frame) => (
                        <li key={frame.id}>
                            <button
                                type="button"
                                className={`fd-frame-item${frame.id === selectedId ? ' active' : ''}`}
                                onClick={() => setSelectedId(frame.id)}
                            >
                                <span className="fd-frame-swatch" style={{ background: frame.layout.frameColor }} />
                                {frame.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>

            <section className="fd-preview">
                <h2>슬롯 배치 · 미리보기</h2>
                <div className="fd-canvas-wrap">
                    <SlotEditor
                        frame={selectedFrame}
                        width={PREVIEW_W}
                        height={PREVIEW_H}
                        selectedSlotIndex={selectedSlotIndex}
                        onSelectSlot={setSelectedSlotIndex}
                        onSlotsChange={updateSlots}
                    />
                </div>
                <p className="fd-hint">슬롯을 드래그해 위치 조정 · 우하단 핸들로 크기 변경</p>
            </section>

            <aside className="fd-panel">
                <h2>디자인</h2>

                <label className="fd-field">
                    <span>프레임 이름</span>
                    <input type="text" value={selectedFrame.name} onChange={(e) => updateName(e.target.value)} />
                </label>

                <label className="fd-field">
                    <span>테두리 색</span>
                    <input
                        type="color"
                        value={layout.frameColor || '#6B46C1'}
                        onChange={(e) => updateLayout('frameColor', e.target.value)}
                    />
                </label>

                <label className="fd-field">
                    <span>슬롯 배경</span>
                    <input
                        type="color"
                        value={layout.slotColor || '#F5F5F0'}
                        onChange={(e) => updateLayout('slotColor', e.target.value)}
                    />
                </label>

                <label className="fd-field">
                    <span>텍스트 색</span>
                    <input
                        type="color"
                        value={layout.textColor || '#FFFFFF'}
                        onChange={(e) => updateLayout('textColor', e.target.value)}
                    />
                </label>

                <label className="fd-field">
                    <span>테두리 두께</span>
                    <input
                        type="range"
                        min="8"
                        max="32"
                        value={layout.frameWidth || 18}
                        onChange={(e) => updateLayout('frameWidth', Number(e.target.value))}
                    />
                    <em>{layout.frameWidth || 18}px</em>
                </label>

                <div className="fd-field">
                    <span>하단 로고 이미지</span>
                    <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="fd-file-input"
                        onChange={handleLogoSelect}
                    />
                    {logoPreview && (
                        <div className="fd-logo-preview">
                            <img src={logoPreview} alt="로고 미리보기" />
                            <button type="button" className="fd-btn fd-btn-sm fd-btn-danger" onClick={handleRemoveLogo}>
                                로고 제거
                            </button>
                        </div>
                    )}
                    {!layout.bottomImage && (
                        <button type="button" className="fd-btn fd-btn-sm" onClick={() => logoInputRef.current?.click()}>
                            이미지 업로드
                        </button>
                    )}
                </div>

                <label className="fd-field">
                    <span>하단 텍스트 {layout.bottomImage ? '(로고 사용 중 비활성)' : ''}</span>
                    <textarea
                        rows={3}
                        value={layout.bottomText || ''}
                        disabled={!!layout.bottomImage}
                        onChange={(e) => updateLayout('bottomText', e.target.value)}
                        placeholder="MERRY&#10;CHRISTMAS"
                    />
                    {layout.bottomImage && (
                        <button type="button" className="fd-btn fd-btn-sm fd-btn-muted" onClick={handleUseTextInstead}>
                            텍스트로 전환
                        </button>
                    )}
                </label>

                <label className="fd-field fd-check">
                    <input
                        type="checkbox"
                        checked={!!layout.logoStyle}
                        disabled={!!layout.bottomImage}
                        onChange={(e) => updateLayout('logoStyle', e.target.checked || undefined)}
                    />
                    <span>로고 스타일 (Hope 타원)</span>
                </label>

                <div className="fd-actions">
                    <button
                        type="button"
                        className="fd-btn fd-btn-success"
                        onClick={handleSupabaseSave}
                        disabled={saving}
                    >
                        {saving ? '저장 중...' : '☁️ Supabase에 저장'}
                    </button>
                    <button type="button" className="fd-btn fd-btn-primary" onClick={() => downloadFramesJson(frames)}>
                        JSON 다운로드
                    </button>
                    <button type="button" className="fd-btn" onClick={handleCopy}>
                        {copied ? '복사됨!' : 'JSON 복사'}
                    </button>
                    <button type="button" className="fd-btn fd-btn-danger" onClick={handleDeleteFrame}>
                        삭제
                    </button>
                    <button type="button" className="fd-btn fd-btn-muted" onClick={handleReset}>
                        초안 초기화
                    </button>
                </div>

                {saveMessage && <p className="fd-save-message">{saveMessage}</p>}

                <div className="fd-deploy-note">
                    <strong>적용 방법</strong>
                    <p>
                        <b>Supabase:</b> 저장 후 <code>event.json</code>에{' '}
                        <code>&quot;framesStorage&quot;: &quot;supabase&quot;</code> 추가
                    </p>
                    {supabaseUrl && (
                        <p className="fd-url">
                            <a href={supabaseUrl} target="_blank" rel="noreferrer">공개 URL</a>
                        </p>
                    )}
                    <p>
                        <b>로컬:</b> JSON 다운로드 → <code>{framesPath}</code> 교체
                    </p>
                </div>
            </aside>
        </div>
    )
}

export default FrameDesignerPage
