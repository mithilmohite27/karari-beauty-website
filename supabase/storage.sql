-- Karari Beauty Supabase Storage setup
-- Phase 5B: Product image upload + product gallery

-- Bucket:
-- - name: product-images
-- - public read: true
-- - recommended max file size: 5MB
-- - allowed MIME types: image/jpeg, image/png, image/webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Preferred production upload flow:
-- The browser never uploads directly to Storage.
-- Admin UI sends files to POST /api/admin/uploads/product-image.
-- The API verifies active admin access, validates MIME/size, and uploads with the service role key.

-- No public SELECT policy on storage.objects for this bucket.
--
-- The bucket is public, so object URLs are already served without any policy.
-- A broad SELECT policy adds nothing for fetching images but does grant the
-- storage list() API, letting anyone enumerate every file in the bucket -
-- including images for unpublished or deleted products. Supabase flags this as
-- `public_bucket_allows_listing`.
--
-- All application access to this bucket (list, upload, remove) goes through the
-- server with the service role key, which bypasses RLS, so removing this policy
-- does not affect the admin media library.
drop policy if exists "Public can read product image files" on storage.objects;

-- Optional direct-auth policy if you ever choose browser uploads later.
-- The current app does NOT rely on this for uploads; server API enforcement is preferred.
-- Keep this commented unless you intentionally enable direct authenticated upload.
--
-- create policy "Authenticated can upload product image files"
-- on storage.objects for insert
-- to authenticated
-- with check (bucket_id = 'product-images');
