-- AI Features Database Schema
-- Add AI-related tables to support intelligent insights, recommendations, and forecasting

-- AI insights storage table
CREATE TABLE public.ai_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('business_insight', 'recommendation', 'forecast', 'trend_analysis')),
  content JSONB NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- AI recommendations tracking table
CREATE TABLE public.ai_recommendations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  context_data JSONB, -- cart contents, customer data, etc.
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('cross_sell', 'upsell', 'bundle', 'trending')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  shown_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  clicked BOOLEAN DEFAULT FALSE,
  purchased BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Sales forecasts table
CREATE TABLE public.sales_forecasts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  forecast_date DATE NOT NULL,
  forecast_type TEXT NOT NULL CHECK (forecast_type IN ('daily', 'weekly', 'monthly')),
  predicted_sales DECIMAL(10,2),
  predicted_transactions INTEGER,
  predicted_items INTEGER,
  confidence_interval JSONB, -- { "lower_bound": 1000, "upper_bound": 1500 }
  model_version TEXT DEFAULT '1.0',
  accuracy_score DECIMAL(3,2), -- Filled after actual results are known
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(store_id, forecast_date, forecast_type)
);

-- AI model performance tracking
CREATE TABLE public.ai_model_performance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('insights', 'recommendations', 'forecasting')),
  model_version TEXT NOT NULL,
  performance_metrics JSONB, -- accuracy, precision, recall, etc.
  evaluation_date DATE NOT NULL,
  sample_size INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Customer behavior patterns (for better recommendations)
CREATE TABLE public.customer_behavior_patterns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('frequent_buyer', 'seasonal_buyer', 'price_sensitive', 'brand_loyal')),
  pattern_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(store_id, customer_id, pattern_type)
);

-- Product affinity matrix (products frequently bought together)
CREATE TABLE public.product_affinities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  product_a_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  product_b_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  affinity_score DECIMAL(5,4) CHECK (affinity_score >= 0 AND affinity_score <= 1),
  support_count INTEGER DEFAULT 0, -- Number of transactions where both products appear
  confidence DECIMAL(5,4), -- A -> B confidence
  lift DECIMAL(8,4), -- Lift measure
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(store_id, product_a_id, product_b_id)
);

-- AI configuration per store
CREATE TABLE public.ai_store_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL UNIQUE,
  insights_enabled BOOLEAN DEFAULT TRUE,
  recommendations_enabled BOOLEAN DEFAULT TRUE,
  forecasting_enabled BOOLEAN DEFAULT TRUE,
  auto_insights_frequency INTEGER DEFAULT 3600, -- seconds (1 hour)
  recommendation_threshold DECIMAL(3,2) DEFAULT 0.5,
  forecast_horizon_days INTEGER DEFAULT 30,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_ai_insights_store_id ON public.ai_insights(store_id);
CREATE INDEX idx_ai_insights_type ON public.ai_insights(type);
CREATE INDEX idx_ai_insights_created_at ON public.ai_insights(created_at);

CREATE INDEX idx_ai_recommendations_store_id ON public.ai_recommendations(store_id);
CREATE INDEX idx_ai_recommendations_product_id ON public.ai_recommendations(product_id);
CREATE INDEX idx_ai_recommendations_shown_at ON public.ai_recommendations(shown_at);
CREATE INDEX idx_ai_recommendations_type ON public.ai_recommendations(recommendation_type);

CREATE INDEX idx_sales_forecasts_store_id ON public.sales_forecasts(store_id);
CREATE INDEX idx_sales_forecasts_date ON public.sales_forecasts(forecast_date);
CREATE INDEX idx_sales_forecasts_type ON public.sales_forecasts(forecast_type);

CREATE INDEX idx_ai_model_performance_store_id ON public.ai_model_performance(store_id);
CREATE INDEX idx_ai_model_performance_model_type ON public.ai_model_performance(model_type);
CREATE INDEX idx_ai_model_performance_evaluation_date ON public.ai_model_performance(evaluation_date);

CREATE INDEX idx_customer_behavior_patterns_store_id ON public.customer_behavior_patterns(store_id);
CREATE INDEX idx_customer_behavior_patterns_customer_id ON public.customer_behavior_patterns(customer_id);
CREATE INDEX idx_customer_behavior_patterns_type ON public.customer_behavior_patterns(pattern_type);

CREATE INDEX idx_product_affinities_store_id ON public.product_affinities(store_id);
CREATE INDEX idx_product_affinities_product_a ON public.product_affinities(product_a_id);
CREATE INDEX idx_product_affinities_product_b ON public.product_affinities(product_b_id);
CREATE INDEX idx_product_affinities_score ON public.product_affinities(affinity_score);

-- Row Level Security (RLS) Policies
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_affinities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_store_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AI insights
CREATE POLICY "Users can view AI insights for their stores" ON public.ai_insights
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT store_id FROM public.store_staff 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can insert AI insights for their stores" ON public.ai_insights
  FOR INSERT WITH CHECK (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT store_id FROM public.store_staff 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- RLS Policies for AI recommendations
CREATE POLICY "Users can view AI recommendations for their stores" ON public.ai_recommendations
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT store_id FROM public.store_staff 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can manage AI recommendations for their stores" ON public.ai_recommendations
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT store_id FROM public.store_staff 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- RLS Policies for sales forecasts
CREATE POLICY "Users can view sales forecasts for their stores" ON public.sales_forecasts
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT store_id FROM public.store_staff 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can manage sales forecasts for their stores" ON public.sales_forecasts
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT store_id FROM public.store_staff 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Similar policies for other AI tables
CREATE POLICY "Users can access AI model performance for their stores" ON public.ai_model_performance
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT store_id FROM public.store_staff 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can access customer behavior patterns for their stores" ON public.customer_behavior_patterns
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT store_id FROM public.store_staff 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can access product affinities for their stores" ON public.product_affinities
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT store_id FROM public.store_staff 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can access AI store config for their stores" ON public.ai_store_config
  FOR ALL USING (
    store_id IN (
      SELECT id FROM public.stores 
      WHERE owner_id = auth.uid() 
      OR id IN (
        SELECT store_id FROM public.store_staff 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON public.ai_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_recommendations_updated_at BEFORE UPDATE ON public.ai_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_forecasts_updated_at BEFORE UPDATE ON public.sales_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_store_config_updated_at BEFORE UPDATE ON public.ai_store_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize AI config for existing stores
INSERT INTO public.ai_store_config (store_id)
SELECT id FROM public.stores 
WHERE id NOT IN (SELECT store_id FROM public.ai_store_config);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_forecasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_model_performance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_behavior_patterns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_affinities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_store_config TO authenticated;