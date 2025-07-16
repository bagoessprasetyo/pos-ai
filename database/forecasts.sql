-- AI Forecasting tables for POS AI

-- Table to store forecast model performance and accuracy tracking
CREATE TABLE public.forecasts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  forecast_data JSONB NOT NULL, -- Complete forecast with insights and metrics
  forecast_period INTEGER NOT NULL, -- Number of days forecasted
  algorithm_used TEXT, -- Which algorithm was used
  model_confidence DECIMAL(5,4) DEFAULT 0.0000, -- Model confidence score
  accuracy_score DECIMAL(5,4) DEFAULT 0.0000, -- Overall accuracy score
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table to track forecast accuracy after the fact for model improvement
CREATE TABLE public.forecast_accuracy (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  forecast_id UUID REFERENCES public.forecasts(id) ON DELETE CASCADE NOT NULL,
  forecast_date DATE NOT NULL, -- The date that was forecasted
  predicted_sales DECIMAL(10,2) NOT NULL,
  actual_sales DECIMAL(10,2), -- Filled in after the date passes
  predicted_transactions INTEGER NOT NULL,
  actual_transactions INTEGER, -- Filled in after the date passes
  absolute_error DECIMAL(10,2), -- |predicted - actual|
  percentage_error DECIMAL(8,4), -- (predicted - actual) / actual * 100
  evaluated_at TIMESTAMP WITH TIME ZONE, -- When actual values were recorded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table to store forecasting model parameters and configurations
CREATE TABLE public.forecast_models (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  model_name TEXT NOT NULL, -- 'exponential_smoothing', 'autoregressive', 'ensemble'
  parameters JSONB NOT NULL, -- Model-specific parameters (alpha, beta, gamma, order, etc.)
  performance_metrics JSONB, -- Historical performance data
  is_active BOOLEAN DEFAULT true,
  last_trained_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(store_id, model_name)
);

-- Indexes for performance
CREATE INDEX idx_forecasts_store_id ON public.forecasts(store_id);
CREATE INDEX idx_forecasts_created_at ON public.forecasts(created_at);
CREATE INDEX idx_forecast_accuracy_forecast_id ON public.forecast_accuracy(forecast_id);
CREATE INDEX idx_forecast_accuracy_forecast_date ON public.forecast_accuracy(forecast_date);
CREATE INDEX idx_forecast_models_store_id ON public.forecast_models(store_id);

-- RLS Policies
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_accuracy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_models ENABLE ROW LEVEL SECURITY;

-- Store access policies for forecasting tables
CREATE POLICY "Store access for forecasts" ON public.forecasts FOR ALL USING (
  store_id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Store access for forecast_accuracy" ON public.forecast_accuracy FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.forecasts f
    WHERE f.id = forecast_accuracy.forecast_id
    AND f.store_id IN (
      SELECT store_id FROM public.store_staff 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Store access for forecast_models" ON public.forecast_models FOR ALL USING (
  store_id IN (
    SELECT store_id FROM public.store_staff 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_forecasts_updated_at 
  BEFORE UPDATE ON public.forecasts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forecast_models_updated_at 
  BEFORE UPDATE ON public.forecast_models 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically evaluate forecast accuracy
CREATE OR REPLACE FUNCTION public.evaluate_forecast_accuracy()
RETURNS void AS $$
DECLARE
  accuracy_record RECORD;
  actual_data RECORD;
BEGIN
  -- Find forecast accuracy records that need actual data
  FOR accuracy_record IN 
    SELECT fa.*, f.store_id
    FROM public.forecast_accuracy fa
    JOIN public.forecasts f ON fa.forecast_id = f.id
    WHERE fa.actual_sales IS NULL 
    AND fa.forecast_date <= CURRENT_DATE
  LOOP
    -- Get actual sales data for that date and store
    SELECT 
      COALESCE(SUM(t.total), 0) as actual_sales,
      COALESCE(COUNT(t.id), 0) as actual_transactions
    INTO actual_data
    FROM public.transactions t
    WHERE t.store_id = accuracy_record.store_id
    AND DATE(t.created_at) = accuracy_record.forecast_date
    AND t.status = 'completed';
    
    -- Update the accuracy record
    UPDATE public.forecast_accuracy
    SET 
      actual_sales = actual_data.actual_sales,
      actual_transactions = actual_data.actual_transactions,
      absolute_error = ABS(predicted_sales - actual_data.actual_sales),
      percentage_error = CASE 
        WHEN actual_data.actual_sales = 0 THEN NULL
        ELSE ((predicted_sales - actual_data.actual_sales) / actual_data.actual_sales) * 100
      END,
      evaluated_at = NOW()
    WHERE id = accuracy_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create forecast accuracy tracking records
CREATE OR REPLACE FUNCTION public.create_forecast_accuracy_tracking(
  p_forecast_id UUID,
  p_forecast_data JSONB
)
RETURNS void AS $$
DECLARE
  forecast_item JSONB;
BEGIN
  -- Create accuracy tracking records for each forecast day
  FOR forecast_item IN SELECT * FROM jsonb_array_elements(p_forecast_data->'forecasts')
  LOOP
    INSERT INTO public.forecast_accuracy (
      forecast_id,
      forecast_date,
      predicted_sales,
      predicted_transactions
    ) VALUES (
      p_forecast_id,
      (forecast_item->>'date')::DATE,
      (forecast_item->>'predicted_sales')::DECIMAL,
      (forecast_item->>'predicted_transactions')::INTEGER
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;