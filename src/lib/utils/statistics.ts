/**
 * Utilitaires statistiques pour SuccessFuel
 */

/**
 * Calcule la moyenne d'un tableau de nombres
 * @param numbers - Le tableau de nombres
 * @returns La moyenne
 */
export function calculateMean(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
}

/**
 * Calcule la médiane d'un tableau de nombres
 * @param numbers - Le tableau de nombres
 * @returns La médiane
 */
export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calcule le mode d'un tableau de nombres
 * @param numbers - Le tableau de nombres
 * @returns Le mode
 */
export function calculateMode(numbers: number[]): number | undefined {
  if (numbers.length === 0) return undefined;
  
  const frequencyMap: { [key: number]: number } = {};
  let maxFreq = 0;
  let mode: number | undefined;
  
  numbers.forEach(num => {
    frequencyMap[num] = (frequencyMap[num] || 0) + 1;
    if (frequencyMap[num] > maxFreq) {
      maxFreq = frequencyMap[num];
      mode = num;
    }
  });
  
  return mode;
}

/**
 * Calcule l'écart-type d'un tableau de nombres
 * @param numbers - Le tableau de nombres
 * @returns L'écart-type
 */
export function calculateStandardDeviation(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = calculateMean(numbers);
  const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
  const variance = calculateMean(squaredDifferences);
  return Math.sqrt(variance);
}

/**
 * Calcule la variance d'un tableau de nombres
 * @param numbers - Le tableau de nombres
 * @returns La variance
 */
export function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = calculateMean(numbers);
  const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
  return calculateMean(squaredDifferences);
}

/**
 * Trouve la valeur minimale d'un tableau
 * @param numbers - Le tableau de nombres
 * @returns La valeur minimale
 */
export function findMin(numbers: number[]): number | undefined {
  return numbers.length > 0 ? Math.min(...numbers) : undefined;
}

/**
 * Trouve la valeur maximale d'un tableau
 * @param numbers - Le tableau de nombres
 * @returns La valeur maximale
 */
export function findMax(numbers: number[]): number | undefined {
  return numbers.length > 0 ? Math.max(...numbers) : undefined;
}

/**
 * Calcule l'étendue d'un tableau de nombres
 * @param numbers - Le tableau de nombres
 * @returns L'étendue (max - min)
 */
export function calculateRange(numbers: number[]): number {
  const min = findMin(numbers);
  const max = findMax(numbers);
  
  if (min === undefined || max === undefined) {
    return 0;
  }
  
  return max - min;
}

/**
 * Calcule un percentile
 * @param numbers - Le tableau de nombres
 * @param percentile - Le percentile (0-100)
 * @returns La valeur du percentile
 */
export function calculatePercentile(numbers: number[], percentile: number): number {
  if (numbers.length === 0) return 0;
  if (percentile < 0 || percentile > 100) {
    throw new Error('Le percentile doit être entre 0 et 100');
  }
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (lower === upper) {
    return sorted[lower];
  }
  
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calcule les quartiles
 * @param numbers - Le tableau de nombres
 * @returns Un objet contenant les quartiles
 */
export interface Quartiles {
  q1: number; // 25e percentile
  q2: number; // 50e percentile (médiane)
  q3: number; // 75e percentile
}

export function calculateQuartiles(numbers: number[]): Quartiles {
  const q1 = calculatePercentile(numbers, 25);
  const q2 = calculatePercentile(numbers, 50);
  const q3 = calculatePercentile(numbers, 75);
  
  return { q1, q2, q3 };
}

/**
 * Calcule le coefficient de corrélation
 * @param x - Premier ensemble de données
 * @param y - Deuxième ensemble de données
 * @returns Le coefficient de corrélation
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
  const sumX2 = x.reduce((acc, val) => acc + val * val, 0);
  const sumY2 = y.reduce((acc, val) => acc + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calcule les coefficients de régression linéaire
 * @param x - Ensemble des valeurs x
 * @param y - Ensemble des valeurs y
 * @returns Les coefficients de la droite de régression (slope, intercept)
 */
export interface RegressionCoefficients {
  slope: number;
  intercept: number;
}

export function calculateRegression(x: number[], y: number[]): RegressionCoefficients {
  if (x.length !== y.length || x.length === 0) {
    return { slope: 0, intercept: 0 };
  }
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
  const sumX2 = x.reduce((acc, val) => acc + val * val, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}