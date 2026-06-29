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

function getPhotoPublicUrl(supabase, hash, imageName) {
    const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(`${hash}/${imageName}`)
    return data.publicUrl
}

async function listPhotoFolderNames(supabase) {
    const folders = []
    let offset = 0

    while (true) {
        const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).list('', {
            limit: LIST_PAGE_SIZE,
            offset,
            sortBy: { column: 'created_at', order: 'desc' },
        })

        if (error) throw error
        if (!data?.length) break

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

async function resolveImageFileName(supabase, hash) {
    const { data: files, error } = await supabase.storage.from(PHOTOS_BUCKET).list(hash, {
        limit: 20,
    })

    if (error) throw error

    const names = (files || []).map((file) => file.name)
    if (names.includes('photo.jpg')) return 'photo.jpg'
    if (names.includes('photo.png')) return 'photo.png'
    return null
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

// 결과물 조회
export async function getPhotoFromServer(hash) {
    const supabase = assertSupabase()
    try {
        // 1. 메타데이터 다운로드
        const { data: metaData, error: metaError } = await supabase.storage
            .from('photos')
            .download(`${hash}/meta.json`)

        if (metaError) throw new Error('메타데이터를 찾을 수 없습니다.')

        const metaText = await metaData.text()
        const metadata = JSON.parse(metaText)

        // 2. 이미지 Public URL 가져오기 (JPEG 또는 PNG 모두 시도)
        const { data: publicUrlData } = supabase.storage
            .from('photos')
            .getPublicUrl(`${hash}/photo.jpg`)

        // 3. 이미지 데이터(Base64)가 필요한 경우 다운로드해서 변환 (선택적)
        // 여기서는 URL만 반환하거나, 기존 로직 호환성을 위해 Base64로 변환할 수도 있음
        // 기존 컴포넌트 호환성을 위해 Base64로 변환해서 반환
        
        // JPEG 먼저 시도, 없으면 PNG 시도
        let imageData, imageError, imageType = 'jpeg'
        const jpegResult = await supabase.storage
            .from('photos')
            .download(`${hash}/photo.jpg`)
        
        if (jpegResult.error) {
            // PNG로 재시도 (기존 파일 호환성)
            const pngResult = await supabase.storage
                .from('photos')
                .download(`${hash}/photo.png`)
            imageData = pngResult.data
            imageError = pngResult.error
            imageType = 'png'
        } else {
            imageData = jpegResult.data
            imageError = null
            imageType = 'jpeg'
        }
            
        if (imageError) throw new Error('이미지를 찾을 수 없습니다.')

        const imageBuffer = await imageData.arrayBuffer()
        const base64 = btoa(
            new Uint8Array(imageBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
        const base64Image = `data:image/${imageType};base64,${base64}`

        return {
            success: true,
            id: metadata.id,
            hash: metadata.hash,
            data: base64Image,
            timestamp: metadata.timestamp,
            createdAt: metadata.createdAt,
            imageUrl: publicUrlData.publicUrl // 추가 필드
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

    const photos = await Promise.all(
        folderNames.map(async (hash) => {
            try {
                const imageName = await resolveImageFileName(supabase, hash)
                if (!imageName) return null

                let metadata = {}
                const { data: metaData, error: metaError } = await supabase.storage
                    .from(PHOTOS_BUCKET)
                    .download(`${hash}/meta.json`)

                if (!metaError && metaData) {
                    const metaText = await metaData.text()
                    metadata = JSON.parse(metaText)
                }

                return {
                    id: metadata.id || hash,
                    hash,
                    data: getPhotoPublicUrl(supabase, hash, imageName),
                    imageUrl: getPhotoPublicUrl(supabase, hash, imageName),
                    imageName,
                    timestamp: metadata.timestamp || metadata.createdAt,
                    createdAt: metadata.createdAt || metadata.timestamp,
                }
            } catch (e) {
                console.warn(`폴더 ${hash} 처리 실패:`, e)
                return null
            }
        })
    )

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
