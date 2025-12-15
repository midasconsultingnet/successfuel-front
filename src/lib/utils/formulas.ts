/**
 * Utilitaires pour les formules métiers dans SuccessFuel
 */

/**
 * Calcule le volume d'une cuve en fonction de la hauteur (barémage)
 * @param height - Hauteur de jauge
 * @param calibrationData - Données de barémage (tableau de {hauteur, volume})
 * @returns Le volume correspondant à la hauteur
 */
export interface CalibrationPoint {
  hauteur: number;
  volume: number;
}

export function calculateTankVolume(height: number, calibrationData: CalibrationPoint[]): number {
  if (!calibrationData || calibrationData.length === 0) {
    return 0;
  }
  
  // Trier les points de calibration par hauteur
  const sortedCalibration = [...calibrationData].sort((a, b) => a.hauteur - b.hauteur);
  
  // Si la hauteur est inférieure à la première calibration
  if (height <= sortedCalibration[0].hauteur) {
    return sortedCalibration[0].volume;
  }
  
  // Si la hauteur est supérieure à la dernière calibration
  const lastPoint = sortedCalibration[sortedCalibration.length - 1];
  if (height >= lastPoint.hauteur) {
    return lastPoint.volume;
  }
  
  // Trouver les deux points entre lesquels se trouve la hauteur
  for (let i = 0; i < sortedCalibration.length - 1; i++) {
    const current = sortedCalibration[i];
    const next = sortedCalibration[i + 1];
    
    if (height >= current.hauteur && height <= next.hauteur) {
      // Interpolation linéaire entre les deux points
      const ratio = (height - current.hauteur) / (next.hauteur - current.hauteur);
      const volumeDiff = next.volume - current.volume;
      return current.volume + (volumeDiff * ratio);
    }
  }
  
  return 0; // Valeur par défaut
}

/**
 * Convertit un volume d'une unité à une autre
 * @param volume - Volume à convertir
 * @param fromUnit - Unité d'origine
 * @param toUnit - Unité cible
 * @returns Le volume converti
 */
export function convertVolume(volume: number, fromUnit: string, toUnit: string): number {
  // Facteurs de conversion vers litres
  const conversionFactors: { [key: string]: number } = {
    'l': 1,        // litre
    'L': 1,        // litre
    'm3': 1000,    // mètre cube
    'm³': 1000,    // mètre cube
    'gal': 3.78541, // gallon US
    'gal_imp': 4.54609, // gallon impérial
    'cl': 0.01,    // centilitre
    'ml': 0.001,   // millilitre
    'dl': 0.1      // décilitre
  };
  
  const fromFactor = conversionFactors[fromUnit.toLowerCase()];
  const toFactor = conversionFactors[toUnit.toLowerCase()];
  
  if (fromFactor === undefined || toFactor === undefined) {
    throw new Error(`Unité de volume non reconnue: ${fromUnit} ou ${toUnit}`);
  }
  
  return (volume * fromFactor) / toFactor;
}

/**
 * Convertit une hauteur d'une unité à une autre
 * @param height - Hauteur à convertir
 * @param fromUnit - Unité d'origine
 * @param toUnit - Unité cible
 * @returns La hauteur convertie
 */
export function convertHeight(height: number, fromUnit: string, toUnit: string): number {
  // Facteurs de conversion vers centimètres
  const conversionFactors: { [key: string]: number } = {
    'cm': 1,       // centimètre
    'm': 100,      // mètre
    'mm': 0.1,     // millimètre
    'dm': 10,      // décimètre
    'in': 2.54,    // pouce
    'ft': 30.48    // pied
  };
  
  const fromFactor = conversionFactors[fromUnit.toLowerCase()];
  const toFactor = conversionFactors[toUnit.toLowerCase()];
  
  if (fromFactor === undefined || toFactor === undefined) {
    throw new Error(`Unité de hauteur non reconnue: ${fromUnit} ou ${toUnit}`);
  }
  
  return (height * fromFactor) / toFactor;
}

/**
 * Calcule une calibration complète à partir de points partiels
 * @param calibrationPoints - Points de calibration (hauteur-volume)
 * @param tankCapacity - Capacité totale de la cuve
 * @returns Points de calibration complétés
 */
export function calculateCalibration(calibrationPoints: CalibrationPoint[], tankCapacity: number): CalibrationPoint[] {
  if (calibrationPoints.length === 0) {
    return [];
  }
  
  // Trier les points par hauteur
  const sortedPoints = [...calibrationPoints].sort((a, b) => a.hauteur - b.hauteur);
  
  // S'assurer que le dernier point atteint ou dépasse la capacité
  const lastPoint = sortedPoints[sortedPoints.length - 1];
  if (lastPoint.volume < tankCapacity) {
    // Ajouter un point de calibration pour atteindre la capacité
    sortedPoints.push({
      hauteur: lastPoint.hauteur + 1,
      volume: tankCapacity
    });
  }
  
  return sortedPoints;
}

/**
 * Interpole des points de calibration pour une courbe plus lisse
 * @param calibrationPoints - Points de calibration initiaux
 * @param desiredPoints - Nombre de points souhaités pour la courbe
 * @returns Points interpolés
 */
export function interpolateCalibration(calibrationPoints: CalibrationPoint[], desiredPoints: number): CalibrationPoint[] {
  if (calibrationPoints.length < 2 || desiredPoints <= 2) {
    return calibrationPoints;
  }
  
  const sortedPoints = [...calibrationPoints].sort((a, b) => a.hauteur - b.hauteur);
  const result: CalibrationPoint[] = [sortedPoints[0]];
  
  const totalHeightRange = sortedPoints[sortedPoints.length - 1].hauteur - sortedPoints[0].hauteur;
  const heightIncrement = totalHeightRange / (desiredPoints - 1);
  
  for (let i = 1; i < desiredPoints - 1; i++) {
    const targetHeight = sortedPoints[0].hauteur + (i * heightIncrement);
    
    // Trouver les points entre lesquels interpoler
    let lowerPoint = sortedPoints[0];
    let upperPoint = sortedPoints[sortedPoints.length - 1];
    
    for (let j = 0; j < sortedPoints.length - 1; j++) {
      if (targetHeight >= sortedPoints[j].hauteur && targetHeight <= sortedPoints[j + 1].hauteur) {
        lowerPoint = sortedPoints[j];
        upperPoint = sortedPoints[j + 1];
        break;
      }
    }
    
    // Interpolation linéaire
    let volume;
    if (upperPoint.hauteur === lowerPoint.hauteur) {
      volume = lowerPoint.volume;
    } else {
      const ratio = (targetHeight - lowerPoint.hauteur) / (upperPoint.hauteur - lowerPoint.hauteur);
      volume = lowerPoint.volume + (upperPoint.volume - lowerPoint.volume) * ratio;
    }
    
    result.push({
      hauteur: targetHeight,
      volume: volume
    });
  }
  
  // Ajouter le dernier point
  result.push(sortedPoints[sortedPoints.length - 1]);
  
  return result;
}

/**
 * Valide les points de calibration
 * @param calibrationPoints - Points de calibration à valider
 * @returns Un objet indiquant la validité et les erreurs éventuelles
 */
export function validateCalibrationPoints(calibrationPoints: CalibrationPoint[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!calibrationPoints || calibrationPoints.length === 0) {
    errors.push('Aucun point de calibration fourni');
    return { isValid: false, errors };
  }
  
  // Vérifier que tous les points ont des valeurs valides
  for (let i = 0; i < calibrationPoints.length; i++) {
    const point = calibrationPoints[i];
    
    if (point.hauteur < 0) {
      errors.push(`Le point ${i} a une hauteur négative: ${point.hauteur}`);
    }
    
    if (point.volume < 0) {
      errors.push(`Le point ${i} a un volume négatif: ${point.volume}`);
    }
  }
  
  // Trier les points par hauteur pour vérifications supplémentaires
  const sortedPoints = [...calibrationPoints].sort((a, b) => a.hauteur - b.hauteur);
  
  // Vérifier que les hauteurs sont croissantes
  for (let i = 1; i < sortedPoints.length; i++) {
    if (sortedPoints[i].hauteur <= sortedPoints[i - 1].hauteur) {
      errors.push(`Les hauteurs ne sont pas strictement croissantes: ${sortedPoints[i - 1].hauteur} >= ${sortedPoints[i].hauteur}`);
    }
  }
  
  // Vérifier que les volumes sont croissants
  for (let i = 1; i < sortedPoints.length; i++) {
    if (sortedPoints[i].volume < sortedPoints[i - 1].volume) {
      errors.push(`Les volumes ne sont pas croissants: ${sortedPoints[i - 1].volume} > ${sortedPoints[i].volume}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calcule la consommation de carburant
 * @param initialVolume - Volume initial
 * @param finalVolume - Volume final
 * @param period - Période (en jours)
 * @returns La consommation moyenne par jour
 */
export function calculateFuelConsumption(initialVolume: number, finalVolume: number, period: number): number {
  if (period <= 0) {
    return 0;
  }
  
  const consumption = initialVolume - finalVolume;
  return consumption > 0 ? consumption / period : 0; // Consommation positive uniquement
}

/**
 * Calcule l'efficacité
 * @param output - Résultat obtenu
 * @param input - Ressources utilisées
 * @returns L'efficacité en pourcentage
 */
export function calculateEfficiency(output: number, input: number): number {
  if (input === 0) {
    return 0;
  }
  
  return Math.min(100, (output / input) * 100);
}

/**
 * Calcule la performance
 * @param actual - Valeur actuelle
 * @param target - Objectif cible
 * @returns La performance en pourcentage
 */
export function calculatePerformance(actual: number, target: number): number {
  if (target === 0) {
    return actual === 0 ? 100 : Infinity;
  }
  
  return (actual / target) * 100;
}

/**
 * Calcule le rendement
 * @param actualOutput - Production réelle
 * @param theoreticalOutput - Production théorique
 * @returns Le rendement en pourcentage
 */
export function calculateYield(actualOutput: number, theoreticalOutput: number): number {
  if (theoreticalOutput === 0) {
    return 0;
  }
  
  return Math.min(100, (actualOutput / theoreticalOutput) * 100);
}