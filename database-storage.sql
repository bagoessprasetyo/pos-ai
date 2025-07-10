-- Supabase Storage Setup for POS AI
-- Run this in Supabase SQL Editor to create storage buckets and policies

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']),
  ('category-images', 'category-images', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']),
  ('store-images', 'store-images', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Product Images Policies
CREATE POLICY "Product images are viewable by store members" ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can upload product images to their stores" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update product images in their stores" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete product images in their stores" ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Category Images Policies  
CREATE POLICY "Category images are viewable by store members" ON storage.objects FOR SELECT
USING (
  bucket_id = 'category-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can upload category images to their stores" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'category-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update category images in their stores" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'category-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete category images in their stores" ON storage.objects FOR DELETE
USING (
  bucket_id = 'category-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Store Images Policies
CREATE POLICY "Store images are viewable by store members" ON storage.objects FOR SELECT
USING (
  bucket_id = 'store-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can upload store images to their stores" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update store images in their stores" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'store-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete store images in their stores" ON storage.objects FOR DELETE
USING (
  bucket_id = 'store-images' AND
  (storage.foldername(name))[1] IN (
    -- Check if user is store owner
    SELECT id::text FROM stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id::text FROM store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Avatar Policies
CREATE POLICY "Avatars are viewable by everyone" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;