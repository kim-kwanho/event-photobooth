/** Canvas ctx.filter 용 사진 필터 프리셋 */
export const PHOTO_FILTERS = [
    { id: 'none', name: '원본', css: 'none', emoji: '✨' },
    { id: 'bright', name: '밝게', css: 'brightness(1.14) contrast(1.04)', emoji: '☀️' },
    { id: 'vivid', name: '선명', css: 'brightness(1.05) saturate(1.4) contrast(1.06)', emoji: '🌈' },
    { id: 'mono', name: '흑백', css: 'grayscale(1) contrast(1.12)', emoji: '🖤' },
]

export function getFilterCss(filterId) {
    return PHOTO_FILTERS.find((f) => f.id === filterId)?.css ?? 'none'
}
