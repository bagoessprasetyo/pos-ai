-- Fix for RLS Policy Infinite Recursion
-- Run this SQL in Supabase SQL Editor to fix the store creation issue

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Store owners can manage their stores" ON public.stores;
DROP POLICY IF EXISTS "Store staff can view their stores" ON public.stores;
DROP POLICY IF EXISTS "Store owners can manage staff" ON public.store_staff;
DROP POLICY IF EXISTS "Staff can view store staff" ON public.store_staff;

-- Create new simplified policies for stores
CREATE POLICY "Store owners can manage their stores" ON public.stores FOR ALL 
USING (auth.uid() = owner_id);

CREATE POLICY "Store staff can view stores" ON public.stores FOR SELECT 
USING (
  id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Create new simplified policies for store_staff
CREATE POLICY "Store owners can manage staff" ON public.store_staff FOR ALL 
USING (
  store_id IN (
    SELECT id FROM public.stores 
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Staff can view their own record" ON public.store_staff FOR SELECT
USING (user_id = auth.uid() AND is_active = true);

-- Ensure other table policies don't reference stores table in a circular way
DROP POLICY IF EXISTS "Store access for categories" ON public.categories;
DROP POLICY IF EXISTS "Store access for products" ON public.products;
DROP POLICY IF EXISTS "Store access for inventory" ON public.inventory;
DROP POLICY IF EXISTS "Store access for customers" ON public.customers;
DROP POLICY IF EXISTS "Store access for transactions" ON public.transactions;

-- Recreate policies without circular references
CREATE POLICY "Category access" ON public.categories FOR ALL 
USING (
  store_id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Product access" ON public.products FOR ALL 
USING (
  store_id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Inventory access" ON public.inventory FOR ALL 
USING (
  store_id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Customer access" ON public.customers FOR ALL 
USING (
  store_id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Transaction access" ON public.transactions FOR ALL 
USING (
  store_id IN (
    -- Check if user is store owner
    SELECT id FROM public.stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Add missing policies for transaction related tables
CREATE POLICY "Transaction items access" ON public.transaction_items FOR ALL 
USING (
  transaction_id IN (
    SELECT id FROM public.transactions
    WHERE store_id IN (
      -- Check if user is store owner
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
      UNION
      -- Check if user is store staff
      SELECT store_id FROM public.store_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Payment access" ON public.payments FOR ALL 
USING (
  transaction_id IN (
    SELECT id FROM public.transactions
    WHERE store_id IN (
      -- Check if user is store owner
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
      UNION
      -- Check if user is store staff
      SELECT store_id FROM public.store_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Applied discount access" ON public.applied_discounts FOR ALL 
USING (
  transaction_id IN (
    SELECT id FROM public.transactions
    WHERE store_id IN (
      -- Check if user is store owner
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
      UNION
      -- Check if user is store staff
      SELECT store_id FROM public.store_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Discount access" ON public.discounts FOR ALL 
USING (
  store_id IN (
    -- Check if user is store owner
    SELECT id FROM public.stores WHERE owner_id = auth.uid()
    UNION
    -- Check if user is store staff
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Inventory adjustment access" ON public.inventory_adjustments FOR ALL 
USING (
  inventory_id IN (
    SELECT id FROM public.inventory
    WHERE store_id IN (
      -- Check if user is store owner
      SELECT id FROM public.stores WHERE owner_id = auth.uid()
      UNION
      -- Check if user is store staff
      SELECT store_id FROM public.store_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- =============================================================================
-- STORAGE POLICY FIXES - Add store owner checks to storage policies
-- =============================================================================

-- Drop existing storage policies that only check store_staff table
DROP POLICY IF EXISTS "Product images are viewable by store members" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload product images to their stores" ON storage.objects;
DROP POLICY IF EXISTS "Users can update product images in their stores" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete product images in their stores" ON storage.objects;

DROP POLICY IF EXISTS "Category images are viewable by store members" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload category images to their stores" ON storage.objects;
DROP POLICY IF EXISTS "Users can update category images in their stores" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete category images in their stores" ON storage.objects;

DROP POLICY IF EXISTS "Store images are viewable by store members" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload store images to their stores" ON storage.objects;
DROP POLICY IF EXISTS "Users can update store images in their stores" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete store images in their stores" ON storage.objects;

-- Recreate Product Images Policies with owner + staff check
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

-- Recreate Category Images Policies with owner + staff check
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

-- Recreate Store Images Policies with owner + staff check
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