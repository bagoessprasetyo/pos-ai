-- Migration: Add store owners to store_staff table
-- This ensures all store owners have proper staff records for permission checks

-- Insert store owners into store_staff table where they don't already exist
INSERT INTO public.store_staff (store_id, user_id, role, is_active, created_at, updated_at)
SELECT 
  s.id as store_id,
  s.owner_id as user_id,
  'owner' as role,
  true as is_active,
  s.created_at,
  NOW() as updated_at
FROM public.stores s
WHERE s.is_active = true
  AND NOT EXISTS (
    SELECT 1 
    FROM public.store_staff ss 
    WHERE ss.store_id = s.id 
      AND ss.user_id = s.owner_id
  );

-- Create function to automatically add owner to store_staff when a new store is created
CREATE OR REPLACE FUNCTION add_owner_to_staff()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the store owner into store_staff table
  INSERT INTO public.store_staff (store_id, user_id, role, is_active, created_at, updated_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', true, NEW.created_at, NEW.updated_at);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add owner to store_staff on store creation
DROP TRIGGER IF EXISTS trigger_add_owner_to_staff ON public.stores;
CREATE TRIGGER trigger_add_owner_to_staff
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_staff();

-- Create function to handle store ownership changes
CREATE OR REPLACE FUNCTION handle_store_owner_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If owner_id changed, update the store_staff table
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    -- Deactivate old owner's staff record
    UPDATE public.store_staff 
    SET is_active = false, updated_at = NOW()
    WHERE store_id = NEW.id 
      AND user_id = OLD.owner_id 
      AND role = 'owner';
    
    -- Add new owner to store_staff if not exists
    INSERT INTO public.store_staff (store_id, user_id, role, is_active, created_at, updated_at)
    VALUES (NEW.id, NEW.owner_id, 'owner', true, NOW(), NOW())
    ON CONFLICT (store_id, user_id) 
    DO UPDATE SET 
      role = 'owner',
      is_active = true,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle store ownership changes
DROP TRIGGER IF EXISTS trigger_handle_store_owner_change ON public.stores;
CREATE TRIGGER trigger_handle_store_owner_change
  AFTER UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION handle_store_owner_change();

-- Verify the migration
SELECT 
  s.name as store_name,
  s.owner_id,
  ss.id as staff_id,
  ss.role,
  ss.is_active
FROM public.stores s
LEFT JOIN public.store_staff ss ON s.id = ss.store_id AND s.owner_id = ss.user_id
WHERE s.is_active = true
ORDER BY s.created_at;