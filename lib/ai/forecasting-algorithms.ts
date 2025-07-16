// Advanced Forecasting Algorithms for POS AI
// Implements sophisticated time series forecasting methods

export interface ForecastPoint {
  date: string
  predicted_sales: number
  predicted_transactions: number
  confidence_interval: {
    lower: number
    upper: number
  }
  confidence_score: number
}

export interface AdvancedForecastData {
  forecasts: ForecastPoint[]
  algorithm_used: string
  accuracy_metrics: {
    mape: number // Mean Absolute Percentage Error
    rmse: number // Root Mean Square Error
    mae: number  // Mean Absolute Error
    r_squared: number
  }
  model_confidence: number
  seasonal_components: {
    trend: number
    seasonal_strength: number
    cycle_length: number
  }
}

/**
 * Exponential Smoothing (Holt-Winters) Algorithm
 * Handles trend and seasonality components
 */
export function exponentialSmoothing(
  data: Array<{ date: string; sales: number; transactions: number }>,
  forecastDays: number = 30,
  alpha: number = 0.3, // Level smoothing
  beta: number = 0.1,  // Trend smoothing
  gamma: number = 0.2  // Seasonal smoothing
): AdvancedForecastData {
  if (data.length < 14) {
    throw new Error('Insufficient data for exponential smoothing (minimum 14 days required)')
  }

  const n = data.length
  const seasonLength = 7 // Weekly seasonality
  
  // Initialize components
  const level = data.slice(0, seasonLength).reduce((sum, d) => sum + d.sales, 0) / seasonLength
  const trend = (data[seasonLength - 1].sales - data[0].sales) / (seasonLength - 1)
  
  // Calculate initial seasonal indices
  const seasonals: number[] = []
  for (let i = 0; i < seasonLength; i++) {
    const avgForSeason = data.filter((_, idx) => idx % seasonLength === i)
      .reduce((sum, d) => sum + d.sales, 0) / Math.max(1, data.filter((_, idx) => idx % seasonLength === i).length)
    seasonals[i] = avgForSeason / level
  }

  // Apply Holt-Winters algorithm
  let currentLevel = level
  let currentTrend = trend
  const currentSeasonals = [...seasonals]
  const fitted: number[] = []

  for (let t = 0; t < n; t++) {
    const seasonIndex = t % seasonLength
    const forecast = (currentLevel + currentTrend) * currentSeasonals[seasonIndex]
    fitted.push(forecast)

    if (t < n - 1) {
      // Update components
      const newLevel = alpha * (data[t].sales / currentSeasonals[seasonIndex]) + 
                      (1 - alpha) * (currentLevel + currentTrend)
      const newTrend = beta * (newLevel - currentLevel) + (1 - beta) * currentTrend
      const newSeasonal = gamma * (data[t].sales / newLevel) + 
                         (1 - gamma) * currentSeasonals[seasonIndex]

      currentLevel = newLevel
      currentTrend = newTrend
      currentSeasonals[seasonIndex] = newSeasonal
    }
  }

  // Generate forecasts
  const forecasts: ForecastPoint[] = []
  for (let i = 1; i <= forecastDays; i++) {
    const seasonIndex = (n + i - 1) % seasonLength
    const futureLevel = currentLevel + (currentTrend * i)
    const forecastValue = futureLevel * currentSeasonals[seasonIndex]
    
    // Calculate confidence interval based on historical residuals
    const residuals = data.map((d, idx) => Math.abs(d.sales - fitted[idx]))
    const mae = residuals.reduce((sum, r) => sum + r, 0) / residuals.length
    const std = Math.sqrt(residuals.reduce((sum, r) => sum + Math.pow(r - mae, 2), 0) / residuals.length)
    
    const confidenceMultiplier = 1.96 // 95% confidence interval
    const margin = std * confidenceMultiplier
    
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + i)
    
    forecasts.push({
      date: futureDate.toISOString().split('T')[0],
      predicted_sales: Math.max(0, forecastValue),
      predicted_transactions: Math.max(0, Math.round(forecastValue / (data.reduce((sum, d) => sum + d.sales, 0) / data.reduce((sum, d) => sum + d.transactions, 0)))),
      confidence_interval: {
        lower: Math.max(0, forecastValue - margin),
        upper: forecastValue + margin
      },
      confidence_score: Math.max(0.1, Math.min(0.9, 1 - (std / Math.abs(forecastValue))))
    })
  }

  // Calculate accuracy metrics
  const actualValues = data.map(d => d.sales)
  const mape = calculateMAPE(actualValues, fitted)
  const rmse = calculateRMSE(actualValues, fitted)
  const mae_metric = calculateMAE(actualValues, fitted)
  const r_squared = calculateRSquared(actualValues, fitted)

  return {
    forecasts,
    algorithm_used: 'Holt-Winters Exponential Smoothing',
    accuracy_metrics: {
      mape,
      rmse,
      mae: mae_metric,
      r_squared
    },
    model_confidence: Math.max(0.3, Math.min(0.95, r_squared)),
    seasonal_components: {
      trend: currentTrend,
      seasonal_strength: Math.max(...currentSeasonals) - Math.min(...currentSeasonals),
      cycle_length: seasonLength
    }
  }
}

/**
 * ARIMA-like autoregressive forecasting
 * Uses past values to predict future values
 */
export function autoRegressiveForecast(
  data: Array<{ date: string; sales: number; transactions: number }>,
  forecastDays: number = 30,
  order: number = 5 // Number of past values to consider
): AdvancedForecastData {
  if (data.length < order + 5) {
    throw new Error(`Insufficient data for autoregressive forecast (minimum ${order + 5} days required)`)
  }

  const salesData = data.map(d => d.sales)
  const n = salesData.length

  // Calculate autoregressive coefficients using least squares
  const coefficients: number[] = []
  
  // Build matrices for regression
  const X: number[][] = []
  const y: number[] = []
  
  for (let i = order; i < n; i++) {
    const row: number[] = []
    for (let j = 0; j < order; j++) {
      row.push(salesData[i - j - 1])
    }
    X.push(row)
    y.push(salesData[i])
  }

  // Simple least squares solution (normal equation)
  // coefficients = (X'X)^-1 X'y
  try {
    const XtX = multiplyMatrices(transposeMatrix(X), X)
    const XtY = multiplyMatrixVector(transposeMatrix(X), y)
    const coeffs = solveLinearSystem(XtX, XtY)
    coefficients.push(...coeffs)
  } catch {
    // Fallback to simple moving average coefficients
    for (let i = 0; i < order; i++) {
      coefficients.push(1 / order)
    }
  }

  // Generate forecasts
  const forecasts: ForecastPoint[] = []
  let lastValues = salesData.slice(-order)
  
  for (let i = 1; i <= forecastDays; i++) {
    let forecastValue = 0
    for (let j = 0; j < order; j++) {
      forecastValue += coefficients[j] * lastValues[order - j - 1]
    }
    
    // Add some seasonality awareness
    const dayOfWeek = (new Date().getDay() + i) % 7
    const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.1 : 1.0
    forecastValue *= weekendBoost
    
    // Calculate confidence interval
    const residuals = X.map((row, idx) => {
      let predicted = 0
      for (let j = 0; j < order; j++) {
        predicted += coefficients[j] * row[j]
      }
      return Math.abs(y[idx] - predicted)
    })
    
    const mae = residuals.reduce((sum, r) => sum + r, 0) / residuals.length
    const std = Math.sqrt(residuals.reduce((sum, r) => sum + Math.pow(r - mae, 2), 0) / residuals.length)
    const margin = std * 1.96
    
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + i)
    
    forecasts.push({
      date: futureDate.toISOString().split('T')[0],
      predicted_sales: Math.max(0, forecastValue),
      predicted_transactions: Math.max(0, Math.round(forecastValue / (data.reduce((sum, d) => sum + d.sales, 0) / data.reduce((sum, d) => sum + d.transactions, 0)))),
      confidence_interval: {
        lower: Math.max(0, forecastValue - margin),
        upper: forecastValue + margin
      },
      confidence_score: Math.max(0.1, Math.min(0.9, 1 - (std / Math.abs(forecastValue))))
    })
    
    // Update lastValues for next prediction
    lastValues = [...lastValues.slice(1), forecastValue]
  }

  // Calculate accuracy metrics
  const fitted = X.map(row => {
    let predicted = 0
    for (let j = 0; j < order; j++) {
      predicted += coefficients[j] * row[j]
    }
    return predicted
  })
  
  const actualForFitted = y
  const mape = calculateMAPE(actualForFitted, fitted)
  const rmse = calculateRMSE(actualForFitted, fitted)
  const mae_metric = calculateMAE(actualForFitted, fitted)
  const r_squared = calculateRSquared(actualForFitted, fitted)

  return {
    forecasts,
    algorithm_used: `Autoregressive AR(${order})`,
    accuracy_metrics: {
      mape,
      rmse,
      mae: mae_metric,
      r_squared
    },
    model_confidence: Math.max(0.2, Math.min(0.9, r_squared)),
    seasonal_components: {
      trend: coefficients[0] > 1 ? 1 : coefficients[0] < -1 ? -1 : 0,
      seasonal_strength: 0.3, // Simplified
      cycle_length: 7
    }
  }
}

/**
 * Ensemble forecasting combining multiple algorithms
 */
export function ensembleForecast(
  data: Array<{ date: string; sales: number; transactions: number }>,
  forecastDays: number = 30
): AdvancedForecastData {
  const forecasts: AdvancedForecastData[] = []
  
  try {
    forecasts.push(exponentialSmoothing(data, forecastDays))
  } catch (e) {
    console.warn('Exponential smoothing failed:', e)
  }
  
  try {
    forecasts.push(autoRegressiveForecast(data, forecastDays))
  } catch (e) {
    console.warn('Autoregressive forecast failed:', e)
  }
  
  if (forecasts.length === 0) {
    throw new Error('All forecasting algorithms failed')
  }
  
  // Combine forecasts using weighted average based on model confidence
  const totalWeight = forecasts.reduce((sum, f) => sum + f.model_confidence, 0)
  const weights = forecasts.map(f => f.model_confidence / totalWeight)
  
  const combinedForecasts: ForecastPoint[] = []
  for (let day = 0; day < forecastDays; day++) {
    let weightedSales = 0
    let weightedTransactions = 0
    let weightedLower = 0
    let weightedUpper = 0
    let weightedConfidence = 0
    
    forecasts.forEach((forecast, idx) => {
      if (forecast.forecasts[day]) {
        const weight = weights[idx]
        const point = forecast.forecasts[day]
        
        weightedSales += point.predicted_sales * weight
        weightedTransactions += point.predicted_transactions * weight
        weightedLower += point.confidence_interval.lower * weight
        weightedUpper += point.confidence_interval.upper * weight
        weightedConfidence += point.confidence_score * weight
      }
    })
    
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + day + 1)
    
    combinedForecasts.push({
      date: futureDate.toISOString().split('T')[0],
      predicted_sales: weightedSales,
      predicted_transactions: Math.round(weightedTransactions),
      confidence_interval: {
        lower: weightedLower,
        upper: weightedUpper
      },
      confidence_score: weightedConfidence
    })
  }
  
  // Calculate ensemble accuracy metrics
  const avgAccuracy = {
    mape: forecasts.reduce((sum, f) => sum + f.accuracy_metrics.mape, 0) / forecasts.length,
    rmse: forecasts.reduce((sum, f) => sum + f.accuracy_metrics.rmse, 0) / forecasts.length,
    mae: forecasts.reduce((sum, f) => sum + f.accuracy_metrics.mae, 0) / forecasts.length,
    r_squared: forecasts.reduce((sum, f) => sum + f.accuracy_metrics.r_squared, 0) / forecasts.length
  }
  
  return {
    forecasts: combinedForecasts,
    algorithm_used: `Ensemble (${forecasts.map(f => f.algorithm_used).join(', ')})`,
    accuracy_metrics: avgAccuracy,
    model_confidence: Math.max(0.4, Math.min(0.95, avgAccuracy.r_squared * 1.1)), // Boost ensemble confidence
    seasonal_components: {
      trend: forecasts.reduce((sum, f) => sum + f.seasonal_components.trend, 0) / forecasts.length,
      seasonal_strength: forecasts.reduce((sum, f) => sum + f.seasonal_components.seasonal_strength, 0) / forecasts.length,
      cycle_length: 7
    }
  }
}

// Utility functions for matrix operations and metrics

function transposeMatrix(matrix: number[][]): number[][] {
  return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]))
}

function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  const result: number[][] = []
  for (let i = 0; i < a.length; i++) {
    result[i] = []
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0
      for (let k = 0; k < b.length; k++) {
        sum += a[i][k] * b[k][j]
      }
      result[i][j] = sum
    }
  }
  return result
}

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
  return matrix.map(row => 
    row.reduce((sum, val, idx) => sum + val * vector[idx], 0)
  )
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  // Simple Gaussian elimination (for small matrices)
  const n = A.length
  const augmented = A.map((row, i) => [...row, b[i]])
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k
      }
    }
    
    // Swap rows
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]]
    
    // Make all rows below this one 0 in current column
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i]
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j]
      }
    }
  }
  
  // Back substitution
  const solution = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    solution[i] = augmented[i][n]
    for (let j = i + 1; j < n; j++) {
      solution[i] -= augmented[i][j] * solution[j]
    }
    solution[i] /= augmented[i][i]
  }
  
  return solution
}

function calculateMAPE(actual: number[], predicted: number[]): number {
  const n = actual.length
  let sum = 0
  for (let i = 0; i < n; i++) {
    if (actual[i] !== 0) {
      sum += Math.abs((actual[i] - predicted[i]) / actual[i])
    }
  }
  return (sum / n) * 100
}

function calculateRMSE(actual: number[], predicted: number[]): number {
  const n = actual.length
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += Math.pow(actual[i] - predicted[i], 2)
  }
  return Math.sqrt(sum / n)
}

function calculateMAE(actual: number[], predicted: number[]): number {
  const n = actual.length
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += Math.abs(actual[i] - predicted[i])
  }
  return sum / n
}

function calculateRSquared(actual: number[], predicted: number[]): number {
  const actualMean = actual.reduce((sum, val) => sum + val, 0) / actual.length
  const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0)
  const residualSumSquares = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0)
  
  return totalSumSquares === 0 ? 0 : 1 - (residualSumSquares / totalSumSquares)
}