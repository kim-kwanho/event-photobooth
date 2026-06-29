import { PHOTO_FILTERS } from '../../lib/imageFilters'
import './FilterSelector.css'

function FilterSelector({ value, onChange, kioskMode = false }) {
    return (
        <div className={`filter-selector${kioskMode ? ' filter-selector--kiosk' : ''}`}>
            <p className="filter-selector-label">필터</p>
            <div className="filter-selector-options" role="group" aria-label="사진 필터">
                {PHOTO_FILTERS.map((filter) => (
                    <button
                        key={filter.id}
                        type="button"
                        className={`filter-option${value === filter.id ? ' active' : ''}`}
                        onClick={() => onChange(filter.id)}
                    >
                        <span className="filter-option-emoji">{filter.emoji}</span>
                        <span className="filter-option-name">{filter.name}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default FilterSelector
