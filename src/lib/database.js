const DB_VERSION = 1
const STORE_NAME = 'photos'

export function getDbName(eventId, prefix = 'photobooth') {
    const safeId = (eventId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_')
    return `${prefix}_${safeId}`
}

// IndexedDB 초기화
export function initDB(eventId, dbNamePrefix = 'photobooth') {
    const DB_NAME = getDbName(eventId, dbNamePrefix)

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => {
            console.error('IndexedDB 오픈 실패:', request.error)
            reject(request.error)
        }

        request.onsuccess = () => {
            console.log('IndexedDB 초기화 완료:', DB_NAME)
            resolve(request.result)
        }

        request.onupgradeneeded = (event) => {
            const database = event.target.result
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
                objectStore.createIndex('timestamp', 'timestamp', { unique: false })
            }
        }
    })
}

// IndexedDB에 사진 저장
export function savePhotoToDB(db, photoData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB가 초기화되지 않았습니다.'))
            return
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.add(photoData)

        request.onsuccess = () => {
            console.log('IndexedDB 저장 완료:', photoData.id)
            resolve()
        }

        request.onerror = () => {
            console.error('IndexedDB 저장 실패:', request.error)
            reject(request.error)
        }
    })
}

// IndexedDB에서 사진 삭제
export function deletePhotoFromDB(db, photoId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB가 초기화되지 않았습니다.'))
            return
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(photoId)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
    })
}

// IndexedDB에서 사진 로드
export function loadPhotosFromDB(db) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB가 초기화되지 않았습니다.'))
            return
        }

        const transaction = db.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const index = store.index('timestamp')
        const request = index.openCursor(null, 'prev')

        const photos = []

        request.onsuccess = (event) => {
            const cursor = event.target.result
            if (cursor) {
                photos.push(cursor.value)
                cursor.continue()
            } else {
                resolve(photos)
            }
        }

        request.onerror = () => {
            console.error('IndexedDB 로드 실패:', request.error)
            reject(request.error)
        }
    })
}
