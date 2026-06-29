export const BOOTH_STEP_META = {
    frameSelect: { label: '프레임', order: 0 },
    camera: { label: '촬영', order: 1 },
    photoSelect: { label: '편집', order: 2 },
    result: { label: '완성', order: 3 },
}

/** 플로우 순서 결정 */
export function getBoothSteps({ frameFirst, frameSelect }) {
    if (frameFirst && frameSelect) {
        return ['frameSelect', 'camera', 'photoSelect', 'result']
    }
    if (frameSelect) {
        return ['camera', 'frameSelect', 'photoSelect', 'result']
    }
    return ['camera', 'photoSelect', 'result']
}

export function getInitialScreen({ frameFirst, frameSelect }) {
    const steps = getBoothSteps({ frameFirst, frameSelect })
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
