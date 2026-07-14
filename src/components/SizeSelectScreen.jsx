import { useState } from 'react'
import './SizeSelectScreen.css'

function SizeSelectScreen({ sizes = [], onSizeSelect, kioskMode = false }) {
    const [pickedId, setPickedId] = useState(sizes[0]?.id ?? null)
    const picked = sizes.find((s) => s.id === pickedId)

    const handleConfirm = () => {
        if (picked) onSizeSelect(picked)
    }

    return (
        <div className={`size-select-booth${kioskMode ? ' size-select-booth--immersive' : ''}`}>
            <div className="size-select-grid">
                {sizes.map((size) => {
                    const ratio = size.width / size.height
                    const isStrip = ratio < 0.5
                    return (
                        <button
                            key={size.id}
                            type="button"
                            className={`size-select-card${pickedId === size.id ? ' selected' : ''}`}
                            onClick={() => setPickedId(size.id)}
                        >
                            <div
                                className={`size-select-preview${isStrip ? ' size-select-preview--strip' : ' size-select-preview--card'}`}
                                style={{ aspectRatio: `${size.width} / ${size.height}` }}
                                aria-hidden="true"
                            >
                                <div className="size-select-slots">
                                    {[0, 1, 2, 3].map((i) => (
                                        <span key={i} className="size-select-slot" />
                                    ))}
                                </div>
                            </div>
                            <span className="size-select-name">{size.name}</span>
                            {size.description && (
                                <span className="size-select-desc">{size.description}</span>
                            )}
                            <span className="size-select-dims">
                                {size.width} × {size.height}
                            </span>
                        </button>
                    )
                })}
            </div>

            <div className="size-select-footer">
                <button
                    type="button"
                    className="booth-btn booth-btn-primary size-confirm-btn"
                    onClick={handleConfirm}
                    disabled={!picked}
                >
                    {picked ? `${picked.name}으로 계속` : '크기를 선택하세요'}
                </button>
            </div>
        </div>
    )
}

export default SizeSelectScreen
