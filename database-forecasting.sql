-- Database schema for AI forecasting features
-- This extends the existing schema with forecasting capabilities

-- Forecasts table to store AI-generated forecasts
CREATE TABLE IF NOT EXISTS forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  forecast_data JSONB NOT NULL,
  forecast_period INTEGER NOT NULL, -- number of days
  accuracy_score DECIMAL(3,2) DEFAULT 0.70, -- 0-1 confidence score
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Forecast alerts table to store AI-generated alerts
CREATE TABLE IF NOT EXISTS forecast_alerts (
  id VARCHAR(100) PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('opportunity', 'warning', 'trend')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  forecast_date DATE NOT NULL,
  predicted_value DECIMAL(10,2) NOT NULL,
  threshold_value DECIMAL(10,2),
  confidence_score DECIMAL(3,2) NOT NULL,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissed_by UUID REFERENCES auth.users(id)
);

-- Forecast accuracy tracking
CREATE TABLE IF NOT EXISTS forecast_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  forecast_id UUID NOT NULL REFERENCES forecasts(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  predicted_value DECIMAL(10,2) NOT NULL,
  actual_value DECIMAL(10,2) NOT NULL,
  accuracy_score DECIMAL(3,2) NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forecasts_store_id ON forecasts(store_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_created_at ON forecasts(created_at);
CREATE INDEX IF NOT EXISTS idx_forecast_alerts_store_id ON forecast_alerts(store_id);
CREATE INDEX IF NOT EXISTS idx_forecast_alerts_date ON forecast_alerts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_forecast_alerts_dismissed ON forecast_alerts(dismissed);
CREATE INDEX IF NOT EXISTS idx_forecast_accuracy_store_id ON forecast_accuracy(store_id);
CREATE INDEX IF NOT EXISTS idx_forecast_accuracy_date ON forecast_accuracy(forecast_date);

-- RLS policies for forecasts
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forecasts for their stores" ON forecasts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM store_staff 
      WHERE store_staff.store_id = forecasts.store_id 
      AND store_staff.user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = forecasts.store_id 
      AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create forecasts for their stores" ON forecasts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM store_staff 
      WHERE store_staff.store_id = forecasts.store_id 
      AND store_staff.user_id = auth.uid()
      AND store_staff.role IN ('owner', 'manager')
    )
    OR 
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = forecasts.store_id 
      AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update forecasts for their stores" ON forecasts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM store_staff 
      WHERE store_staff.store_id = forecasts.store_id 
      AND store_staff.user_id = auth.uid()
      AND store_staff.role IN ('owner', 'manager')
    )
    OR 
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = forecasts.store_id 
      AND stores.owner_id = auth.uid()
    )
  );

-- RLS policies for forecast_alerts
ALTER TABLE forecast_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts for their stores" ON forecast_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM store_staff 
      WHERE store_staff.store_id = forecast_alerts.store_id 
      AND store_staff.user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = forecast_alerts.store_id 
      AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create alerts for their stores" ON forecast_alerts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM store_staff 
      WHERE store_staff.store_id = forecast_alerts.store_id 
      AND store_staff.user_id = auth.uid()
      AND store_staff.role IN ('owner', 'manager')
    )
    OR 
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = forecast_alerts.store_id 
      AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update alerts for their stores" ON forecast_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM store_staff 
      WHERE store_staff.store_id = forecast_alerts.store_id 
      AND store_staff.user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = forecast_alerts.store_id 
      AND stores.owner_id = auth.uid()
    )
  );

-- RLS policies for forecast_accuracy
ALTER TABLE forecast_accuracy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accuracy for their stores" ON forecast_accuracy
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM store_staff 
      WHERE store_staff.store_id = forecast_accuracy.store_id 
      AND store_staff.user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = forecast_accuracy.store_id 
      AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create accuracy records for their stores" ON forecast_accuracy
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM store_staff 
      WHERE store_staff.store_id = forecast_accuracy.store_id 
      AND store_staff.user_id = auth.uid()
      AND store_staff.role IN ('owner', 'manager')
    )
    OR 
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = forecast_accuracy.store_id 
      AND stores.owner_id = auth.uid()
    )
  );

-- Function to calculate forecast accuracy
CREATE OR REPLACE FUNCTION calculate_forecast_accuracy()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new transaction is created, check if we have forecasts for that date
  -- and calculate accuracy if we do
  INSERT INTO forecast_accuracy (store_id, forecast_id, forecast_date, predicted_value, actual_value, accuracy_score)
  SELECT 
    f.store_id,
    f.id,
    DATE(NEW.created_at),
    (f.forecast_data->'forecasts'->0->>'predicted_sales')::DECIMAL,
    NEW.total,
    1.0 - ABS(((f.forecast_data->'forecasts'->0->>'predicted_sales')::DECIMAL - NEW.total) / NEW.total)
  FROM forecasts f
  WHERE f.store_id = NEW.store_id
    AND DATE(NEW.created_at) = ANY(
      SELECT DATE(forecast_item->>'date')
      FROM jsonb_array_elements(f.forecast_data->'forecasts') AS forecast_item
    )
    AND f.created_at >= DATE(NEW.created_at) - INTERVAL '7 days'
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate accuracy when transactions are created
CREATE TRIGGER trigger_calculate_forecast_accuracy
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_forecast_accuracy();

-- Function to clean up old forecasts and alerts
CREATE OR REPLACE FUNCTION cleanup_old_forecasts()
RETURNS void AS $$
BEGIN
  -- Delete forecasts older than 90 days
  DELETE FROM forecasts 
  WHERE created_at < now() - INTERVAL '90 days';
  
  -- Delete dismissed alerts older than 30 days
  DELETE FROM forecast_alerts 
  WHERE dismissed = true 
    AND dismissed_at < now() - INTERVAL '30 days';
  
  -- Delete alerts for dates that have passed and are older than 7 days
  DELETE FROM forecast_alerts 
  WHERE forecast_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up old data (if pg_cron is available)
-- SELECT cron.schedule('cleanup-forecasts', '0 2 * * *', 'SELECT cleanup_old_forecasts();');

-- Add helpful comments
COMMENT ON TABLE forecasts IS 'AI-generated sales forecasts for stores';
COMMENT ON TABLE forecast_alerts IS 'AI-generated alerts based on forecast data';
COMMENT ON TABLE forecast_accuracy IS 'Tracking accuracy of forecasts against actual results';
COMMENT ON FUNCTION calculate_forecast_accuracy() IS 'Automatically calculates forecast accuracy when transactions are created';
COMMENT ON FUNCTION cleanup_old_forecasts() IS 'Cleans up old forecasts and alerts to maintain performance';