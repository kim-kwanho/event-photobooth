/** event.json 미로드 시 사용하는 기본 설정 */
export const defaultEventConfig = {
    event: {
        id: 'default',
        name: '인생네컷',
        tagline: '나만의 네 컷을 만들어보세요',
        locale: 'ko',
    },
    branding: {
        startBackground: '',
        primaryColor: '#7C3AED',
        accentColor: '#F472B6',
        fontFamily: 'Inter, sans-serif',
    },
    routes: {
        landing: '/',
        app: '/app',
        admin: '/admin',
    },
    flow: {
        frameFirst: false,
    },
    features: {
        frameSelect: false,
        photoDrag: false,
        gallery: true,
        qrShare: true,
        admin: true,
        print: false,
        kioskMode: false,
        filters: true,
    },
    camera: {
        photoCount: 4,
        countdownSeconds: 6,
        quality: 0.9,
    },
    output: {
        width: 1200,
        height: 1600,
    },
    storage: {
        dbNamePrefix: 'photobooth',
    },
    theme: {
        id: 'default',
        framesPath: '/themes/default/frames.json',
        framesStorage: 'local',
        defaultFrameId: 1,
    },
    kiosk: {
        idleSeconds: 60,
        fullscreen: true,
    },
    frames: [],
}
