import { assertSupabase } from './supabase'
import { getPrintApiUrl } from '../config/appUrl'

const PHOTOS_BUCKET = 'photos'
const LIST_PAGE_SIZE = 100

// Base64 데이터를 Blob으로 변환하는 헬퍼 함수
const base64ToBlob = (base64) => {
    const parts = base64.split(';base64,')
    const contentType = parts[0].split(':')[1]
    const raw = window.atob(parts[1])
    const rawLength = raw.length
    const uInt8Array = new Uint8Array(rawLength)

    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i)
    }

    return new Blob([uInt8Array], { type: contentType })
}

// 이미지 압축 함수 (용량 제한 해결)
const compressImage = (base64Data, maxWidth = 2000, maxHeight = 2000, quality = 0.85) => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            let width = img.width
            let height = img.height

            // 비율 유지하면서 리사이즈
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height)
                width = width * ratio
                height = height * ratio
            }

            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)

            // JPEG로 변환하여 파일 크기 줄이기 (PNG보다 작음)
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
            resolve(compressedBase64)
        }
        img.onerror = reject
        img.src = base64Data
    })
}

const META_CONCURRENCY = 6

function getPhotoPublicUrl(supabase, hash, imageName) {
    const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(`${hash}/${imageName}`)
    return data.publicUrl
}

async function listStoragePage(supabase, path, options) {
    const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).list(path, options)
    if (error) throw error
    return data || []
}

async function listPhotoFolderNames(supabase) {
    const folders = []
    let offset = 0

    // 폴더는 created_at이 null이라 name 정렬이 안정적. 실패 시 정렬 없이 재시도.
    const sortOptions = [
        { column: 'name', order: 'asc' },
        null,
    ]

    let sortBy = sortOptions[0]
    let sortIndex = 0

    while (true) {
        let data
        try {
            const options = {
                limit: LIST_PAGE_SIZE,
                offset,
            }
            if (sortBy) options.sortBy = sortBy
            data = await listStoragePage(supabase, '', options)
        } catch (error) {
            if (sortIndex < sortOptions.length - 1) {
                sortIndex += 1
                sortBy = sortOptions[sortIndex]
                offset = 0
                folders.length = 0
                console.warn('Storage list 정렬 실패, 재시도:', sortBy || 'unsorted', error)
                continue
            }
            throw error
        }

        if (!data.length) break

        for (const item of data) {
            if (item.name.startsWith('.')) continue
            // Supabase Storage: 폴더는 id가 null
            if (item.id === null) {
                folders.push(item.name)
            }
        }

        if (data.length < LIST_PAGE_SIZE) break
        offset += LIST_PAGE_SIZE
    }

    return folders
}

async function mapWithConcurrency(items, concurrency, mapper) {
    const results = new Array(items.length)
    let nextIndex = 0

    async function worker() {
        while (nextIndex < items.length) {
            const index = nextIndex
            nextIndex += 1
            results[index] = await mapper(items[index], index)
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
    await Promise.all(workers)
    return results
}

async function loadPhotoMetadata(supabase, hash) {
    const { data: metaData, error: metaError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .download(`${hash}/meta.json`)

    if (metaError || !metaData) return {}

    try {
        return JSON.parse(await metaData.text())
    } catch {
        return {}
    }
}

function timestampFromHash(hash) {
    const match = String(hash).match(/_(\d{11,})_/)
    if (!match) return null
    const ms = Number(match[1])
    if (!Number.isFinite(ms)) return null
    return new Date(ms).toISOString()
}

// 결과물 저장 (Supabase Storage 사용)
export async function savePhotoToServer(photoData) {
    const supabase = assertSupabase()
    try {
        const { id, imageData, timestamp } = photoData
        
        // 1. 해시(폴더명) 생성 - id 기반
        const hash = id 

        // 2. 이미지 압축 (용량 제한 방지)
        let compressedImageData = imageData
        try {
            compressedImageData = await compressImage(imageData, 2000, 2000, 0.85)
            console.log('이미지 압축 완료')
        } catch (compressError) {
            console.warn('이미지 압축 실패, 원본 사용:', compressError)
            // 압축 실패 시 원본 사용
        }

        // 3. 이미지 Blob 변환
        const imageBlob = base64ToBlob(compressedImageData)

        // 파일 크기 확인 (Supabase 제한: 일반적으로 50MB)
        const fileSizeMB = imageBlob.size / (1024 * 1024)
        console.log(`이미지 크기: ${fileSizeMB.toFixed(2)}MB`)
        
        if (fileSizeMB > 50) {
            throw new Error(`이미지가 너무 큽니다 (${fileSizeMB.toFixed(2)}MB). 최대 50MB까지 지원됩니다.`)
        }

        // 4. 이미지 업로드 (photos 버킷) - JPEG로 저장
        const { error: imageError } = await supabase.storage
            .from('photos')
            .upload(`${hash}/photo.jpg`, imageBlob, {
                contentType: 'image/jpeg',
                upsert: true
            })

        if (imageError) {
            console.error('Supabase 업로드 오류:', imageError)
            throw imageError
        }

        // 4. 메타데이터 생성 및 업로드
        const metadata = {
            id,
            hash,
            timestamp: timestamp || new Date().toISOString(),
            createdAt: new Date().toISOString()
        }
        
        const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })

        const { error: metaError } = await supabase.storage
            .from('photos')
            .upload(`${hash}/meta.json`, metadataBlob, {
                contentType: 'application/json',
                upsert: true
            })

        if (metaError) throw metaError

        return {
            success: true,
            id,
            hash,
            message: '결과물이 Supabase에 안전하게 저장되었습니다.'
        }

    } catch (error) {
        console.error('Supabase 저장 실패:', error)
        throw new Error(`저장 실패: ${error.message}`)
    }
}

// 결과물 조회 — Public URL 우선 (다운로드·base64 변환은 생략해 모바일에서 안정적으로 표시)
export async function getPhotoFromServer(hash) {
    const supabase = assertSupabase()
    try {
        const metadata = await loadPhotoMetadata(supabase, hash)
        const imageName = 'photo.jpg'
        const imageUrl = getPhotoPublicUrl(supabase, hash, imageName)

        const timestamp =
            metadata.timestamp ||
            metadata.createdAt ||
            timestampFromHash(hash)

        if (!metadata.id && !timestamp) {
            // meta도 없고 해시 패턴도 아니면 폴더 존재 여부를 list로 확인
            const files = await listStoragePage(supabase, hash, { limit: 5 })
            const names = files.map((file) => file.name)
            if (!names.includes('photo.jpg') && !names.includes('photo.png')) {
                throw new Error('이미지를 찾을 수 없습니다.')
            }
        }

        return {
            success: true,
            id: metadata.id || hash,
            hash: metadata.hash || hash,
            data: imageUrl,
            timestamp,
            createdAt: metadata.createdAt || timestamp,
            imageUrl,
            imageName,
        }
    } catch (error) {
        console.error('Supabase 조회 실패:', error)
        throw error
    }
}

// 모든 결과물 목록 조회 (관리자용) - Storage 스캔 방식
export async function getAllPhotosFromServer() {
    const supabase = assertSupabase()

    const folderNames = await listPhotoFolderNames(supabase)

    // 폴더별 list + download 동시 폭주를 피하고, meta만 제한 동시성으로 조회
    const photos = await mapWithConcurrency(folderNames, META_CONCURRENCY, async (hash) => {
        try {
            const metadata = await loadPhotoMetadata(supabase, hash)
            const imageName = 'photo.jpg'
            const imageUrl = getPhotoPublicUrl(supabase, hash, imageName)
            const timestamp =
                metadata.timestamp ||
                metadata.createdAt ||
                timestampFromHash(hash)

            return {
                id: metadata.id || hash,
                hash,
                data: imageUrl,
                imageUrl,
                imageName,
                timestamp,
                createdAt: metadata.createdAt || timestamp,
            }
        } catch (e) {
            console.warn(`폴더 ${hash} 처리 실패:`, e)
            return null
        }
    })

    return photos
        .filter((photo) => photo !== null)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

// 프린트 요청
export async function printPhoto(imageUrl, quantity = 1, printerName = null) {
    try {
        const response = await fetch(getPrintApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageUrl,
                quantity,
                printerName
            })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || '프린트에 실패했습니다.')
        }

        return await response.json()
    } catch (error) {
        console.error('프린트 요청 실패:', error)
        throw error
    }
}

// 결과물 삭제 (Supabase Storage에서 폴더 전체 삭제)
export async function deletePhotoFromServer(hash) {
    const supabase = assertSupabase()
    try {
        // 1. 폴더 내 모든 파일 목록 조회
        const { data: files, error: listError } = await supabase.storage
            .from('photos')
            .list(hash)

        if (listError) throw listError

        // 2. 폴더 내 모든 파일 삭제 (photo.jpg 또는 photo.png 모두 포함)
        if (files && files.length > 0) {
            const filePaths = files.map(file => `${hash}/${file.name}`)
            
            const { error: deleteError } = await supabase.storage
                .from('photos')
                .remove(filePaths)

            if (deleteError) throw deleteError
        }

        return { success: true, message: '삭제되었습니다.' }
    } catch (error) {
        console.error('Supabase 삭제 실패:', error)
        throw new Error(`삭제 실패: ${error.message}`)
    }
}
