/**
 * event.json 병합 결과의 최소 스키마 검증.
 * 치명적 오류는 throw, 경고는 콘솔에만 남긴다.
 */

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function requireString(path, value, errors) {
    if (typeof value !== 'string' || !value.trim()) {
        errors.push(`${path}는 비어 있지 않은 문자열이어야 합니다.`)
    }
}

function requireNumber(path, value, errors, { min, max } = {}) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`${path}는 숫자여야 합니다.`)
        return
    }
    if (min != null && value < min) errors.push(`${path}는 ${min} 이상이어야 합니다.`)
    if (max != null && value > max) errors.push(`${path}는 ${max} 이하여야 합니다.`)
}

function requireBoolean(path, value, errors) {
    if (typeof value !== 'boolean') {
        errors.push(`${path}는 true/false여야 합니다.`)
    }
}

/**
 * @param {Record<string, unknown>} config
 * @returns {{ warnings: string[] }}
 */
export function validateEventConfig(config) {
    const errors = []
    const warnings = []

    if (!isPlainObject(config)) {
        throw new Error('event.json 설정이 객체가 아닙니다.')
    }

    if (!isPlainObject(config.event)) {
        errors.push('event 섹션이 필요합니다.')
    } else {
        requireString('event.id', config.event.id, errors)
        requireString('event.name', config.event.name, errors)
        if (config.event.tagline != null && typeof config.event.tagline !== 'string') {
            errors.push('event.tagline은 문자열이어야 합니다.')
        }
    }

    if (!isPlainObject(config.theme)) {
        errors.push('theme 섹션이 필요합니다.')
    } else {
        requireString('theme.id', config.theme.id, errors)
        requireString('theme.framesPath', config.theme.framesPath, errors)
        if (
            config.theme.defaultFrameId != null &&
            typeof config.theme.defaultFrameId !== 'number' &&
            typeof config.theme.defaultFrameId !== 'string'
        ) {
            errors.push('theme.defaultFrameId는 숫자 또는 문자열이어야 합니다.')
        }
        const storage = config.theme.framesStorage
        if (storage != null && storage !== 'local' && storage !== 'supabase') {
            errors.push('theme.framesStorage는 "local" 또는 "supabase"여야 합니다.')
        }
    }

    if (isPlainObject(config.camera)) {
        requireNumber('camera.photoCount', config.camera.photoCount, errors, { min: 1, max: 12 })
        requireNumber('camera.countdownSeconds', config.camera.countdownSeconds, errors, {
            min: 0,
            max: 30,
        })
        requireNumber('camera.quality', config.camera.quality, errors, { min: 0.1, max: 1 })
    } else {
        errors.push('camera 섹션이 필요합니다.')
    }

    if (isPlainObject(config.output)) {
        requireNumber('output.width', config.output.width, errors, { min: 100 })
        requireNumber('output.height', config.output.height, errors, { min: 100 })
    } else {
        errors.push('output 섹션이 필요합니다.')
    }

    if (isPlainObject(config.features)) {
        for (const key of [
            'frameSelect',
            'photoDrag',
            'gallery',
            'qrShare',
            'admin',
            'print',
            'kioskMode',
            'filters',
        ]) {
            if (config.features[key] !== undefined) {
                requireBoolean(`features.${key}`, config.features[key], errors)
            }
        }
    }

    if (isPlainObject(config.flow) && config.flow.frameFirst !== undefined) {
        requireBoolean('flow.frameFirst', config.flow.frameFirst, errors)
    }

    if (isPlainObject(config.kiosk)) {
        requireNumber('kiosk.idleSeconds', config.kiosk.idleSeconds, errors, { min: 10 })
        if (config.kiosk.fullscreen !== undefined) {
            requireBoolean('kiosk.fullscreen', config.kiosk.fullscreen, errors)
        }
    }

    if (config.features?.kioskMode && (!config.kiosk || config.kiosk.idleSeconds < 10)) {
        warnings.push('kioskMode가 켜져 있으면 kiosk.idleSeconds를 10초 이상으로 두는 것이 좋습니다.')
    }

    if (config.features?.frameSelect === false && config.theme?.defaultFrameId == null) {
        warnings.push('frameSelect가 false이면 theme.defaultFrameId를 지정하세요.')
    }

    if (errors.length > 0) {
        throw new Error(`event.json 설정 오류:\n- ${errors.join('\n- ')}`)
    }

    return { warnings }
}
