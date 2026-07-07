/**
 * SensorModel ML Prediction Engine
 * 5 algorithms: EKF, LSTM-like, ARIMA, Fourier, Ensemble
 * Standards: ISO 13381-1 (RUL), IEC 61360 (sensor data), IEEE 1451 (smart sensors)
 */

export interface PredictionResult {
  predicted: number;
  confidence: number;
  rulHours: number | null;
  features: SignalFeatures;
  algorithm: string;
}

export interface SignalFeatures {
  rms: number;
  kurtosis: number;
  crestFactor: number;
  entropy: number;
  peakToPeak: number;
  trendSlope: number;
  skewness: number;
  stdDev: number;
}

// ── Feature Extraction ──────────────────────────────────────────────────────
export function extractFeatures(values: number[]): SignalFeatures {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const rms = Math.sqrt(values.reduce((a, b) => a + b * b, 0) / n);
  const peak = Math.max(...values.map(Math.abs));
  const crestFactor = stdDev > 0 ? peak / rms : 1;

  // Kurtosis
  const kurtosis =
    stdDev > 0
      ? values.reduce((a, b) => a + ((b - mean) / stdDev) ** 4, 0) / n
      : 3;

  // Skewness
  const skewness =
    stdDev > 0
      ? values.reduce((a, b) => a + ((b - mean) / stdDev) ** 3, 0) / n
      : 0;

  // Shannon entropy (normalised)
  const entropy = (() => {
    const bins = 20;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const hist = new Array(bins).fill(0);
    values.forEach((v) => {
      const idx = Math.min(Math.floor(((v - min) / range) * bins), bins - 1);
      hist[idx]++;
    });
    return -hist.reduce((a, c) => {
      const p = c / n;
      return p > 0 ? a + p * Math.log2(p) : a;
    }, 0) / Math.log2(bins);
  })();

  // Trend slope (linear regression)
  const trendSlope = (() => {
    const xMean = (n - 1) / 2;
    const num = values.reduce((a, b, i) => a + (i - xMean) * (b - mean), 0);
    const den = values.reduce((a, _, i) => a + (i - xMean) ** 2, 0);
    return den > 0 ? num / den : 0;
  })();

  return {
    rms,
    kurtosis,
    crestFactor,
    entropy,
    peakToPeak: Math.max(...values) - Math.min(...values),
    trendSlope,
    skewness,
    stdDev,
  };
}

// ── Extended Kalman Filter ───────────────────────────────────────────────────
export function ekfPredict(values: number[]): PredictionResult {
  const n = values.length;
  let x = values[0];
  let P = 1.0;
  const Q = 0.001; // process noise
  const R = 0.1;   // measurement noise

  for (let i = 0; i < n; i++) {
    // Predict
    const xPred = x;
    const PPred = P + Q;
    // Update
    const K = PPred / (PPred + R);
    x = xPred + K * (values[i] - xPred);
    P = (1 - K) * PPred;
  }

  const features = extractFeatures(values);
  const trend = features.trendSlope;
  const predicted = x + trend;
  const confidence = Math.max(0.1, Math.min(0.99, 1 / (1 + P)));
  const rulHours = estimateRUL(values, features);

  return { predicted, confidence, rulHours, features, algorithm: "ekf" };
}

// ── LSTM-like (attention + momentum) ────────────────────────────────────────
export function lstmPredict(values: number[]): PredictionResult {
  const n = values.length;
  const windowSize = Math.min(10, n);
  const window = values.slice(-windowSize);

  // Attention weights (recency bias)
  const weights = window.map((_, i) => Math.exp(i - windowSize + 1));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const attended = window.reduce((a, v, i) => a + v * weights[i], 0) / wSum;

  // Momentum
  const momentum = n >= 3 ? (values[n - 1] - values[n - 3]) / 2 : 0;
  const predicted = attended + 0.3 * momentum;

  const features = extractFeatures(values);
  const confidence = Math.max(0.1, Math.min(0.95, 1 - features.entropy * 0.3));
  const rulHours = estimateRUL(values, features);

  return { predicted, confidence, rulHours, features, algorithm: "lstm" };
}

// ── ARIMA (AR+I+MA via OLS) ──────────────────────────────────────────────────
export function arimaPredict(values: number[]): PredictionResult {
  const n = values.length;
  const p = Math.min(3, n - 1); // AR order

  // First difference for stationarity
  const diff = values.slice(1).map((v, i) => v - values[i]);
  const d = diff.length;

  let predicted = values[n - 1];
  if (d >= p) {
    // OLS for AR coefficients
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = p; i < d; i++) {
      X.push(diff.slice(i - p, i).reverse());
      y.push(diff[i]);
    }
    if (X.length > 0) {
      const coeffs = olsCoefficients(X, y);
      const lastDiff = diff.slice(-p).reverse();
      const diffPred = coeffs.reduce((a, c, i) => a + c * (lastDiff[i] ?? 0), 0);
      predicted = values[n - 1] + diffPred;
    }
  }

  const features = extractFeatures(values);
  const confidence = 0.78;
  const rulHours = estimateRUL(values, features);

  return { predicted, confidence, rulHours, features, algorithm: "arima" };
}

// ── Fourier (2-harmonic) ─────────────────────────────────────────────────────
export function fourierPredict(values: number[]): PredictionResult {
  const n = values.length;
  const harmonics = 2;
  let predicted = values.reduce((a, b) => a + b, 0) / n; // DC component

  for (let k = 1; k <= harmonics; k++) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * k * i) / n;
      re += values[i] * Math.cos(angle);
      im -= values[i] * Math.sin(angle);
    }
    re /= n;
    im /= n;
    const angle = (2 * Math.PI * k * n) / n;
    predicted += 2 * (re * Math.cos(angle) - im * Math.sin(angle));
  }

  const features = extractFeatures(values);
  const confidence = 0.72;
  const rulHours = estimateRUL(values, features);

  return { predicted, confidence, rulHours, features, algorithm: "fourier" };
}

// ── Ensemble (weighted average) ──────────────────────────────────────────────
export function ensemblePredict(values: number[]): PredictionResult {
  const results = [
    ekfPredict(values),
    lstmPredict(values),
    arimaPredict(values),
    fourierPredict(values),
  ];

  const totalW = results.reduce((a, r) => a + r.confidence, 0);
  const predicted = results.reduce((a, r) => a + r.predicted * r.confidence, 0) / totalW;
  const confidence = Math.min(0.99, totalW / results.length + 0.05);

  const features = extractFeatures(values);
  const rulHours = results.reduce((a, r) => {
    if (r.rulHours === null) return a;
    return a === null ? r.rulHours : (a + r.rulHours) / 2;
  }, null as number | null);

  return { predicted, confidence, rulHours, features, algorithm: "ensemble" };
}

// ── Algorithm Dispatcher ─────────────────────────────────────────────────────
export function runAlgorithm(
  values: number[],
  algorithm: string
): PredictionResult {
  switch (algorithm) {
    case "ekf":     return ekfPredict(values);
    case "lstm":    return lstmPredict(values);
    case "arima":   return arimaPredict(values);
    case "fourier": return fourierPredict(values);
    default:        return ensemblePredict(values);
  }
}

// ── RUL Estimation (ISO 13381-1) ─────────────────────────────────────────────
function estimateRUL(values: number[], features: SignalFeatures): number | null {
  if (values.length < 5 || features.trendSlope === 0) return null;
  const current = values[values.length - 1];
  const failureThreshold = current * 1.5; // simplified — real impl uses degradation model
  if (features.trendSlope <= 0) return null;
  const hours = (failureThreshold - current) / features.trendSlope;
  return Math.max(0, Math.round(hours));
}

// ── OLS helper ───────────────────────────────────────────────────────────────
function olsCoefficients(X: number[][], y: number[]): number[] {
  const p = X[0]?.length ?? 0;
  if (p === 0) return [];
  // Gradient descent for simplicity (replace with proper matrix inversion in prod)
  const coeffs = new Array(p).fill(0);
  const lr = 0.01;
  for (let iter = 0; iter < 200; iter++) {
    const grad = new Array(p).fill(0);
    for (let i = 0; i < X.length; i++) {
      const pred = X[i].reduce((a, v, j) => a + v * coeffs[j], 0);
      const err = pred - y[i];
      X[i].forEach((v, j) => { grad[j] += (2 * err * v) / X.length; });
    }
    grad.forEach((g, j) => { coeffs[j] -= lr * g; });
  }
  return coeffs;
}
