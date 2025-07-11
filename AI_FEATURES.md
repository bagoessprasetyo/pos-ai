# AI Features Documentation

This document describes the AI-powered features integrated into the POS AI system.

## Overview

The POS AI system includes three main AI features:
1. **Business Insights Dashboard** - AI-generated business intelligence and recommendations
2. **Product Recommendations Widget** - Smart product suggestions for the POS system
3. **Sales Forecasting & Alerts** - Predictive analytics for sales planning

## Prerequisites

### OpenAI API Key
You need an OpenAI API key to use the AI features. Get one from [OpenAI's website](https://platform.openai.com/api-keys).

### Environment Configuration
Add the following to your `.env.local` file:

```bash
# Required
OPENAI_API_KEY=your-openai-api-key

# Optional (with defaults)
OPENAI_ORGANIZATION=your-openai-organization-id
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=1000

# Cache TTL in seconds
AI_INSIGHTS_CACHE_TTL=300
AI_RECOMMENDATIONS_CACHE_TTL=600
AI_FORECAST_CACHE_TTL=1800
AI_RATE_LIMIT_PER_MINUTE=60
```

### Database Setup
Run the AI database migrations:

```bash
# Apply AI features schema
psql -d your_database < database-ai-features.sql

# Apply forecasting schema
psql -d your_database < database-forecasting.sql
```

## Features

### 1. Business Insights Dashboard

**Location**: `/dashboard/analytics` (AI Business Insights section)

**Description**: Generates AI-powered business insights based on sales data, transaction patterns, and business metrics.

**Features**:
- Automated insight generation
- Categorized insights (opportunities, warnings, trends, optimizations)
- Priority-based filtering
- Confidence scoring
- Actionable recommendations

**API Endpoint**: `/api/ai/insights`

**Usage**:
```typescript
import { useAIInsights } from '@/hooks/use-ai-insights'

const { insights, generateInsights } = useAIInsights()
```

### 2. Product Recommendations Widget

**Location**: `/dashboard/pos` (integrated in cart sidebar)

**Description**: Provides AI-powered product recommendations based on current cart items and purchase patterns.

**Features**:
- Real-time recommendations based on cart contents
- Multiple recommendation types (cross-sell, upsell, bundles, trending)
- Confidence scoring with star ratings
- Click and purchase tracking
- Compact and full display modes

**API Endpoint**: `/api/ai/recommendations`

**Usage**:
```typescript
import { useRecommendations } from '@/hooks/use-recommendations'

const { recommendations, getRecommendations } = useRecommendations()
```

### 3. Sales Forecasting & Alerts

**Location**: `/dashboard/forecasting` (dedicated page)

**Description**: AI-powered sales forecasting with predictive alerts and trend analysis.

**Features**:
- Sales forecasting with confidence intervals
- Interactive forecast charts (line and area charts)
- Automated alert generation
- Trend analysis and seasonality detection
- Accuracy tracking
- Forecast insights and recommendations

**API Endpoints**: 
- `/api/ai/forecast`
- `/api/ai/forecast-alerts`

**Usage**:
```typescript
import { useForecasting } from '@/hooks/use-forecasting'

const { forecasts, alerts, generateForecast } = useForecasting()
```

## Architecture

### AI Client (`/lib/ai/openai-client.ts`)
- Centralized OpenAI client configuration
- Error handling and retry logic
- Rate limiting and fallback models
- Streaming support

### AI Prompts (`/lib/ai/prompts.ts`)
- Structured prompt templates
- Business-specific context
- Optimized for different AI tasks

### Hooks
- `useAIInsights` - Business insights management
- `useRecommendations` - Product recommendations
- `useForecasting` - Sales forecasting and alerts

### Components
- `BusinessInsights` - Insights dashboard
- `RecommendationWidget` - Product recommendations
- `ForecastChart` - Sales forecasting charts
- `ForecastAlerts` - Predictive alerts

## Database Schema

### AI Insights
```sql
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL,
  insights JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Recommendations
```sql
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL,
  recommendations JSONB NOT NULL,
  cart_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Forecasting
```sql
CREATE TABLE forecasts (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL,
  forecast_data JSONB NOT NULL,
  forecast_period INTEGER NOT NULL,
  accuracy_score DECIMAL(3,2) DEFAULT 0.70,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE forecast_alerts (
  id VARCHAR(100) PRIMARY KEY,
  store_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(10) NOT NULL,
  forecast_date DATE NOT NULL,
  predicted_value DECIMAL(10,2) NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Cost Optimization

### Caching Strategy
- **Insights**: 5-minute cache (300 seconds)
- **Recommendations**: 10-minute cache (600 seconds)
- **Forecasts**: 30-minute cache (1800 seconds)

### Rate Limiting
- Default: 60 requests per minute per store
- Configurable via `AI_RATE_LIMIT_PER_MINUTE`

### Model Selection
- Default: `gpt-4o-mini` (cost-effective)
- Fallback: `gpt-3.5-turbo`
- Configurable via `OPENAI_MODEL`

## Permissions

AI features respect the existing permission system:
- **Business Insights**: Requires `canViewAnalytics()`
- **Recommendations**: Requires `canAccessPOS()`
- **Forecasting**: Requires `canViewAnalytics()`

## Error Handling

All AI features include comprehensive error handling:
- API failures gracefully degrade
- Fallback to cached data when available
- User-friendly error messages
- Detailed logging for debugging

## Testing

### Manual Testing
1. Ensure OpenAI API key is configured
2. Add some sample data (products, transactions)
3. Test each AI feature:
   - Generate business insights
   - Add items to cart and check recommendations
   - Generate sales forecasts

### API Testing
```bash
# Test insights generation
curl -X POST http://localhost:3000/api/ai/insights \
  -H "Content-Type: application/json" \
  -d '{"store_id": "your-store-id"}'

# Test recommendations
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{"store_id": "your-store-id", "cart_items": []}'

# Test forecasting
curl -X POST http://localhost:3000/api/ai/forecast \
  -H "Content-Type: application/json" \
  -d '{"store_id": "your-store-id", "historical_data": [], "forecast_days": 30}'
```

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Check `.env.local` for `OPENAI_API_KEY`
   - Verify the key is valid and has credits

2. **"Failed to generate insights"**
   - Check OpenAI API status
   - Verify network connectivity
   - Check API rate limits

3. **"No recommendations available"**
   - Ensure products exist in the database
   - Check if cart has items
   - Verify store has transaction history

4. **"Forecast generation failed"**
   - Ensure sufficient historical data (at least 30 days)
   - Check if store has transactions
   - Verify forecast period is reasonable

### Debugging

Enable detailed logging by setting:
```bash
NODE_ENV=development
```

Check the browser console and server logs for detailed error messages.

## Future Enhancements

- **Multi-language support** for AI prompts
- **Custom AI models** for specific business types
- **Advanced forecasting** with external data sources
- **Automated inventory management** based on predictions
- **Customer behavior analysis** and personalization
- **Real-time alerts** via websockets or push notifications

## Contributing

When adding new AI features:
1. Follow the existing patterns in `/lib/ai/`
2. Add appropriate error handling
3. Include caching where beneficial
4. Add comprehensive documentation
5. Test with various data scenarios
6. Consider cost implications