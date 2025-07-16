-- Kitchen Module Database Updates
-- This file contains all the necessary database queries for the kitchen module

-- ==============================================================================
-- EXISTING TABLES (Reference - Do not run these as they already exist)
-- ==============================================================================

-- Main kitchen orders table (already exists)
/*
CREATE TABLE public.kitchen_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'preparing', 'ready', 'completed')) DEFAULT 'pending',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  estimated_prep_time INTEGER, -- in minutes
  actual_prep_time INTEGER, -- in minutes
  special_instructions TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(store_id, order_number)
);
*/

-- Transactions table with kitchen-related statuses (already exists)
/*
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES public.profiles(id) NOT NULL,
  transaction_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'return', 'void')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'kitchen_queue', 'preparing', 'ready', 'completed', 'cancelled', 'refunded')) DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tendered DECIMAL(10,2) DEFAULT 0.00,
  change_due DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT,
  receipt_data JSONB,
  metadata JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(store_id, transaction_number)
);
*/

-- Stores table with kitchen dashboard settings (already exists)
/*
CREATE TABLE public.stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  settings JSONB DEFAULT '{}', -- Contains kitchen_dashboard settings
  tax_rate DECIMAL(5,4) DEFAULT 0.0000,
  currency TEXT DEFAULT 'IDR',
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
*/

-- ==============================================================================
-- QUERIES TO UPDATE EXISTING DATA
-- ==============================================================================

-- 1. Update stores to enable kitchen dashboard for existing stores (if needed)
-- This query enables kitchen dashboard for stores that don't have it configured
UPDATE public.stores 
SET settings = COALESCE(settings, '{}'::jsonb) || 
  jsonb_build_object(
    'kitchen_dashboard', 
    jsonb_build_object(
      'enabled', false,
      'show_timer', true,
      'show_customer_names', true,
      'auto_print_tickets', false,
      'sound_notifications', true
    )
  )
WHERE settings->'kitchen_dashboard' IS NULL;

-- 2. Update existing transactions with kitchen-related statuses
-- This adds kitchen_queue status for transactions that should be in kitchen queue
UPDATE public.transactions 
SET status = 'kitchen_queue'
WHERE status = 'pending' 
  AND id IN (
    SELECT t.id 
    FROM public.transactions t
    JOIN public.stores s ON t.store_id = s.id
    WHERE (s.settings->'kitchen_dashboard'->>'enabled')::boolean = true
  );

-- 3. Create kitchen orders for existing transactions that should have them
-- This creates kitchen orders for transactions that are in kitchen queue but don't have kitchen orders
INSERT INTO public.kitchen_orders (
  transaction_id,
  store_id,
  order_number,
  status,
  priority,
  estimated_prep_time,
  special_instructions,
  created_at,
  updated_at
)
SELECT 
  t.id,
  t.store_id,
  'K-' || t.transaction_number,
  'pending',
  'normal',
  15, -- Default 15 minutes prep time
  t.notes,
  t.created_at,
  NOW()
FROM public.transactions t
JOIN public.stores s ON t.store_id = s.id
WHERE t.status IN ('kitchen_queue', 'preparing', 'ready')
  AND (s.settings->'kitchen_dashboard'->>'enabled')::boolean = true
  AND NOT EXISTS (
    SELECT 1 FROM public.kitchen_orders ko 
    WHERE ko.transaction_id = t.id
  );

-- ==============================================================================
-- USEFUL QUERIES FOR KITCHEN MODULE
-- ==============================================================================

-- Query to get all kitchen orders with full transaction details
SELECT 
  ko.*,
  t.transaction_number,
  t.total,
  t.created_at as order_placed_at,
  t.notes as transaction_notes,
  c.first_name || ' ' || c.last_name as customer_name,
  p.full_name as assigned_staff_name,
  json_agg(
    json_build_object(
      'product_name', pr.name,
      'quantity', ti.quantity,
      'unit_price', ti.unit_price,
      'line_total', ti.line_total
    )
  ) as order_items
FROM public.kitchen_orders ko
JOIN public.transactions t ON ko.transaction_id = t.id
LEFT JOIN public.customers c ON t.customer_id = c.id
LEFT JOIN public.profiles p ON ko.assigned_to = p.id
JOIN public.transaction_items ti ON t.id = ti.transaction_id
JOIN public.products pr ON ti.product_id = pr.id
WHERE ko.store_id = 'YOUR_STORE_ID'
  AND ko.status != 'completed'
GROUP BY ko.id, t.id, c.id, p.id
ORDER BY ko.created_at ASC;

-- Query to get kitchen dashboard statistics
SELECT 
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
  COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing_orders,
  COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_orders,
  COUNT(*) as total_active_orders,
  AVG(
    CASE 
      WHEN status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (completed_at - started_at)) / 60 
    END
  ) as avg_prep_time_minutes
FROM public.kitchen_orders ko
WHERE ko.store_id = 'YOUR_STORE_ID'
  AND ko.created_at >= CURRENT_DATE;

-- Query to get kitchen performance metrics
SELECT 
  DATE(ko.created_at) as order_date,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN ko.status = 'completed' THEN 1 END) as completed_orders,
  AVG(
    CASE 
      WHEN ko.status = 'completed' AND ko.started_at IS NOT NULL AND ko.completed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ko.completed_at - ko.started_at)) / 60 
    END
  ) as avg_prep_time_minutes,
  AVG(
    CASE 
      WHEN ko.status = 'completed' AND ko.estimated_prep_time IS NOT NULL AND ko.started_at IS NOT NULL AND ko.completed_at IS NOT NULL
      THEN ABS(ko.estimated_prep_time - EXTRACT(EPOCH FROM (ko.completed_at - ko.started_at)) / 60)
    END
  ) as avg_time_variance_minutes
FROM public.kitchen_orders ko
WHERE ko.store_id = 'YOUR_STORE_ID'
  AND ko.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(ko.created_at)
ORDER BY order_date DESC;

-- Query to update kitchen dashboard settings for a specific store
UPDATE public.stores 
SET settings = COALESCE(settings, '{}'::jsonb) || 
  jsonb_build_object(
    'kitchen_dashboard', 
    jsonb_build_object(
      'enabled', true,
      'show_timer', true,
      'show_customer_names', true,
      'auto_print_tickets', false,
      'sound_notifications', true
    )
  )
WHERE id = 'YOUR_STORE_ID';

-- ==============================================================================
-- INDEXES FOR BETTER PERFORMANCE (Already exist in main schema)
-- ==============================================================================

/*
CREATE INDEX idx_kitchen_orders_transaction_id ON public.kitchen_orders(transaction_id);
CREATE INDEX idx_kitchen_orders_store_id ON public.kitchen_orders(store_id);
CREATE INDEX idx_kitchen_orders_status ON public.kitchen_orders(status);
CREATE INDEX idx_kitchen_orders_assigned_to ON public.kitchen_orders(assigned_to);
CREATE INDEX idx_kitchen_orders_created_at ON public.kitchen_orders(created_at);
*/

-- ==============================================================================
-- ROW LEVEL SECURITY POLICIES (Already exist in main schema)
-- ==============================================================================

/*
CREATE POLICY "Store access for kitchen orders" ON public.kitchen_orders FOR ALL USING (
  store_id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);
*/

-- ==============================================================================
-- FUNCTIONS AND TRIGGERS FOR KITCHEN MODULE
-- ==============================================================================

-- Function to automatically create kitchen orders when transactions are created
CREATE OR REPLACE FUNCTION public.create_kitchen_order_for_transaction()
RETURNS TRIGGER AS $$
DECLARE
  kitchen_enabled BOOLEAN;
  order_number TEXT;
BEGIN
  -- Check if kitchen dashboard is enabled for this store
  SELECT (settings->'kitchen_dashboard'->>'enabled')::boolean INTO kitchen_enabled
  FROM public.stores 
  WHERE id = NEW.store_id;
  
  -- Only create kitchen order if kitchen dashboard is enabled
  IF kitchen_enabled = true THEN
    -- Generate kitchen order number
    order_number := 'K-' || NEW.transaction_number;
    
    -- Insert kitchen order
    INSERT INTO public.kitchen_orders (
      transaction_id,
      store_id,
      order_number,
      status,
      priority,
      estimated_prep_time,
      special_instructions,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.store_id,
      order_number,
      'pending',
      'normal',
      15, -- Default 15 minutes
      NEW.notes,
      NOW(),
      NOW()
    );
    
    -- Update transaction status to kitchen_queue
    UPDATE public.transactions 
    SET status = 'kitchen_queue'
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic kitchen order creation
DROP TRIGGER IF EXISTS create_kitchen_order_trigger ON public.transactions;
CREATE TRIGGER create_kitchen_order_trigger
  AFTER INSERT ON public.transactions
  FOR EACH ROW 
  WHEN (NEW.type = 'sale' AND NEW.status = 'pending')
  EXECUTE FUNCTION public.create_kitchen_order_for_transaction();

-- Function to clean up completed kitchen orders (optional - for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_kitchen_orders()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete kitchen orders that are completed and older than 7 days
  DELETE FROM public.kitchen_orders 
  WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- SAMPLE DATA FOR TESTING (Optional - remove in production)
-- ==============================================================================

-- Insert sample kitchen orders for testing (replace with actual store_id and transaction_id)
/*
INSERT INTO public.kitchen_orders (
  transaction_id,
  store_id,
  order_number,
  status,
  priority,
  estimated_prep_time,
  special_instructions
) VALUES 
(
  'SAMPLE_TRANSACTION_ID',
  'SAMPLE_STORE_ID',
  'K-001',
  'pending',
  'normal',
  15,
  'No onions, extra cheese'
);
*/

-- ==============================================================================
-- NOTES FOR DEVELOPERS
-- ==============================================================================

/*
IMPORTANT NOTES:

1. Kitchen Dashboard Settings Structure:
   The settings JSONB field in stores table should contain:
   {
     "kitchen_dashboard": {
       "enabled": true/false,
       "show_timer": true/false,
       "show_customer_names": true/false,
       "auto_print_tickets": true/false,
       "sound_notifications": true/false
     }
   }

2. Transaction Status Flow:
   pending -> kitchen_queue -> preparing -> ready -> completed

3. Kitchen Order Status Flow:
   pending -> preparing -> ready -> completed

4. When updating kitchen order status, also update the related transaction status.

5. The kitchen_orders table is linked to transactions, which contain transaction_items
   that hold the actual product information.

6. Use the provided queries to:
   - Enable kitchen dashboard for stores
   - Get kitchen orders with full details
   - Generate kitchen performance reports
   - Clean up old completed orders

7. Make sure to replace 'YOUR_STORE_ID' with actual store IDs when running queries.

8. The automatic trigger will create kitchen orders for new transactions when
   kitchen dashboard is enabled for the store.
*/