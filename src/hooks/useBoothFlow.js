export const BOOTH_STEP_META = {
    sizeSelect: { label: '크기', order: 0 },
    frameSelect: { label: '프레임', order: 1 },
    camera: { label: '촬영', order: 2 },
    photoSelect: { label: '편집', order: 3 },
    result: { label: '완성', order: 4 },
}

/** 플로우 순서 결정 */
export function getBoothSteps({ frameFirst, frameSelect, sizeSelect }) {
    if (frameFirst && frameSelect) {
        const steps = []
        if (sizeSelect) steps.push('sizeSelect')
        steps.push('frameSelect', 'camera', 'photoSelect', 'result')
        return steps
    }
    if (frameSelect) {
        const steps = ['camera']
        if (sizeSelect) steps.push('sizeSelect')
        steps.push('frameSelect', 'photoSelect', 'result')
        return steps
    }
    return ['camera', 'photoSelect', 'result']
}

export function getInitialScreen(flowOptions) {
    const steps = getBoothSteps(flowOptions)
    return steps[0]
}

export function getStepIndex(currentScreen, flowOptions) {
    const steps = getBoothSteps(flowOptions)
    const idx = steps.indexOf(currentScreen)
    return idx >= 0 ? idx : 0
}

export function getNextScreen(currentScreen, flowOptions) {
    const steps = getBoothSteps(flowOptions)
    const idx = steps.indexOf(currentScreen)
    if (idx < 0 || idx >= steps.length - 1) return null
    return steps[idx + 1]
}

export function getPrevScreen(currentScreen, flowOptions) {
    const steps = getBoothSteps(flowOptions)
    const idx = steps.indexOf(currentScreen)
    if (idx <= 0) return null
    return steps[idx - 1]
}
