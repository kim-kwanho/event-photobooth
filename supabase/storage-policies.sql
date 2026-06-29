-- Supabase Storage: photos + themes 버킷 RLS 정책
-- Supabase Dashboard → SQL Editor → New query → 전체 실행
-- (이미 정책이 있어도 DROP IF EXISTS 후 재생성 — 안전하게 여러 번 실행 가능)
--
-- 사전 조건:
--   1. Storage에서 "photos" 버킷 생성 (Public bucket 권장)
--   2. Storage에서 "themes" 버킷 생성 (Public bucket 권장) — 프레임 JSON·로고

-- ========== photos 버킷 ==========

DROP POLICY IF EXISTS "photobooth_public_read" ON storage.objects;
CREATE POLICY "photobooth_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "photobooth_anon_insert" ON storage.objects;
CREATE POLICY "photobooth_anon_insert"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "photobooth_anon_update" ON storage.objects;
CREATE POLICY "photobooth_anon_update"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'photos')
WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "photobooth_anon_delete" ON storage.objects;
CREATE POLICY "photobooth_anon_delete"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'photos');

-- ========== themes 버킷 (프레임 디자이너) ==========

DROP POLICY IF EXISTS "themes_public_read" ON storage.objects;
CREATE POLICY "themes_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'themes');

DROP POLICY IF EXISTS "themes_anon_insert" ON storage.objects;
CREATE POLICY "themes_anon_insert"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'themes');

DROP POLICY IF EXISTS "themes_anon_update" ON storage.objects;
CREATE POLICY "themes_anon_update"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'themes')
WITH CHECK (bucket_id = 'themes');

DROP POLICY IF EXISTS "themes_anon_delete" ON storage.objects;
CREATE POLICY "themes_anon_delete"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'themes');
