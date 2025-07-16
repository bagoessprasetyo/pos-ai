-- Table Layout Management Database Schema
-- This file contains the database schema for restaurant table layout management

-- ==============================================================================
-- NEW TABLES FOR TABLE LAYOUT SYSTEM
-- ==============================================================================

-- Table areas (dining rooms, patios, private rooms, etc.)
CREATE TABLE public.table_areas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6', -- Hex color for visual identification
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Individual restaurant tables
CREATE TABLE public.tables (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  area_id UUID REFERENCES public.table_areas(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 2,
  min_party_size INTEGER DEFAULT 1,
  max_party_size INTEGER, -- NULL means use seats as max
  position JSONB, -- {x: number, y: number, width: number, height: number, rotation: number}
  shape TEXT CHECK (shape IN ('rectangle', 'circle', 'square')) DEFAULT 'rectangle',
  status TEXT CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'out_of_service')) DEFAULT 'available',
  notes TEXT, -- Special notes about the table (window seat, high top, etc.)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(store_id, table_number)
);

-- Table reservations
CREATE TABLE public.table_reservations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES public.tables(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT, -- For walk-ins without customer record
  customer_phone TEXT,
  party_size INTEGER NOT NULL,
  reservation_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 90, -- Expected duration
  special_requests TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table sessions (tracks table occupancy)
CREATE TABLE public.table_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES public.tables(id) ON DELETE CASCADE NOT NULL,
  reservation_id UUID REFERENCES public.table_reservations(id) ON DELETE SET NULL,
  party_size INTEGER NOT NULL,
  seated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  estimated_duration INTEGER DEFAULT 90, -- in minutes
  actual_duration INTEGER, -- calculated when session ends
  status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
  notes TEXT,
  seated_by UUID REFERENCES public.profiles(id),
  cleared_by UUID REFERENCES public.profiles(id),
  cleared_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- UPDATE EXISTING TABLES
-- ==============================================================================

-- Add table_id to transactions table
ALTER TABLE public.transactions 
ADD COLUMN table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
ADD COLUMN table_session_id UUID REFERENCES public.table_sessions(id) ON DELETE SET NULL,
ADD COLUMN service_type TEXT CHECK (service_type IN ('takeout', 'dine_in', 'delivery')) DEFAULT 'takeout';

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================

-- Table areas indexes
CREATE INDEX idx_table_areas_store_id ON public.table_areas(store_id);
CREATE INDEX idx_table_areas_active ON public.table_areas(is_active);

-- Tables indexes
CREATE INDEX idx_tables_store_id ON public.tables(store_id);
CREATE INDEX idx_tables_area_id ON public.tables(area_id);
CREATE INDEX idx_tables_status ON public.tables(status);
CREATE INDEX idx_tables_active ON public.tables(is_active);
CREATE INDEX idx_tables_table_number ON public.tables(table_number);

-- Table reservations indexes
CREATE INDEX idx_table_reservations_store_id ON public.table_reservations(store_id);
CREATE INDEX idx_table_reservations_table_id ON public.table_reservations(table_id);
CREATE INDEX idx_table_reservations_customer_id ON public.table_reservations(customer_id);
CREATE INDEX idx_table_reservations_time ON public.table_reservations(reservation_time);
CREATE INDEX idx_table_reservations_status ON public.table_reservations(status);

-- Table sessions indexes
CREATE INDEX idx_table_sessions_store_id ON public.table_sessions(store_id);
CREATE INDEX idx_table_sessions_table_id ON public.table_sessions(table_id);
CREATE INDEX idx_table_sessions_reservation_id ON public.table_sessions(reservation_id);
CREATE INDEX idx_table_sessions_status ON public.table_sessions(status);
CREATE INDEX idx_table_sessions_seated_at ON public.table_sessions(seated_at);

-- Transaction table indexes for new columns
CREATE INDEX idx_transactions_table_id ON public.transactions(table_id);
CREATE INDEX idx_transactions_table_session_id ON public.transactions(table_session_id);
CREATE INDEX idx_transactions_service_type ON public.transactions(service_type);

-- ==============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- Enable RLS on new tables
ALTER TABLE public.table_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;

-- Table areas policies
CREATE POLICY "Store access for table areas" ON public.table_areas FOR ALL USING (
  store_id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Tables policies
CREATE POLICY "Store access for tables" ON public.tables FOR ALL USING (
  store_id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Table reservations policies
CREATE POLICY "Store access for table reservations" ON public.table_reservations FOR ALL USING (
  store_id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Table sessions policies
CREATE POLICY "Store access for table sessions" ON public.table_sessions FOR ALL USING (
  store_id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- ==============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================================================

-- Add updated_at triggers to new tables
CREATE TRIGGER update_table_areas_updated_at 
  BEFORE UPDATE ON public.table_areas 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tables_updated_at 
  BEFORE UPDATE ON public.tables 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_table_reservations_updated_at 
  BEFORE UPDATE ON public.table_reservations 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_table_sessions_updated_at 
  BEFORE UPDATE ON public.table_sessions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- USEFUL FUNCTIONS
-- ==============================================================================

-- Function to automatically update table status based on sessions
CREATE OR REPLACE FUNCTION public.update_table_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update table status when a session starts
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.tables 
    SET status = 'occupied', updated_at = NOW()
    WHERE id = NEW.table_id;
  END IF;
  
  -- Update table status when a session ends
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status IN ('completed', 'abandoned') THEN
    UPDATE public.tables 
    SET status = 'cleaning', updated_at = NOW()
    WHERE id = NEW.table_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update table status
CREATE TRIGGER table_session_status_trigger
  AFTER INSERT OR UPDATE ON public.table_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_table_status();

-- Function to calculate actual session duration
CREATE OR REPLACE FUNCTION public.calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate actual duration when session is completed
  IF NEW.status IN ('completed', 'abandoned') AND NEW.cleared_at IS NOT NULL THEN
    NEW.actual_duration = EXTRACT(EPOCH FROM (NEW.cleared_at - NEW.seated_at)) / 60;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate session duration
CREATE TRIGGER calculate_duration_trigger
  BEFORE UPDATE ON public.table_sessions
  FOR EACH ROW EXECUTE FUNCTION public.calculate_session_duration();

-- ==============================================================================
-- DEFAULT DATA AND SETUP
-- ==============================================================================

-- Function to create default table area for existing stores
CREATE OR REPLACE FUNCTION public.create_default_table_area_for_store(store_id_param UUID)
RETURNS UUID AS $$
DECLARE
  area_id UUID;
BEGIN
  INSERT INTO public.table_areas (store_id, name, description)
  VALUES (store_id_param, 'Main Dining Room', 'Primary dining area')
  RETURNING id INTO area_id;
  
  RETURN area_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- EXAMPLE QUERIES FOR REFERENCE
-- ==============================================================================

/*
-- Get all tables with their current status and area info
SELECT 
  t.*,
  ta.name as area_name,
  ts.party_size,
  ts.seated_at,
  ts.estimated_duration
FROM public.tables t
LEFT JOIN public.table_areas ta ON t.area_id = ta.id
LEFT JOIN public.table_sessions ts ON t.id = ts.table_id AND ts.status = 'active'
WHERE t.store_id = 'YOUR_STORE_ID'
ORDER BY ta.sort_order, t.table_number;

-- Get available tables for a specific party size
SELECT t.*
FROM public.tables t
WHERE t.store_id = 'YOUR_STORE_ID'
  AND t.status = 'available'
  AND t.is_active = true
  AND t.seats >= 4 -- party size
  AND (t.max_party_size IS NULL OR t.max_party_size >= 4)
ORDER BY t.seats ASC;

-- Get table utilization stats for today
SELECT 
  t.table_number,
  COUNT(ts.id) as sessions_today,
  AVG(ts.actual_duration) as avg_duration,
  SUM(ts.actual_duration) as total_occupied_minutes
FROM public.tables t
LEFT JOIN public.table_sessions ts ON t.id = ts.table_id 
  AND ts.seated_at >= CURRENT_DATE
  AND ts.status = 'completed'
WHERE t.store_id = 'YOUR_STORE_ID'
GROUP BY t.id, t.table_number
ORDER BY sessions_today DESC;
*/