/**
 * Utilitaires pour la gestion des stocks dans SuccessFuel
 */

/**
 * Calcule le niveau de réapprovisionnement
 * @param dailyUsage - Consommation moyenne quotidienne
 * @param leadTimeDays - Délai d'approvisionnement en jours
 * @param safetyStock - Stock de sécurité
 * @returns Le niveau de réapprovisionnement
 */
export function calculateReorderLevel(dailyUsage: number, leadTimeDays: number, safetyStock: number): number {
  return Math.ceil(dailyUsage * leadTimeDays + safetyStock);
}

/**
 * Calcule le stock de sécurité
 * @param dailyUsage - Consommation moyenne quotidienne
 * @param leadTimeVariationDays - Variation possible du délai d'approvisionnement
 * @returns Le stock de sécurité
 */
export function calculateSafetyStock(dailyUsage: number, leadTimeVariationDays: number): number {
  return Math.ceil(dailyUsage * leadTimeVariationDays);
}

/**
 * Calcule la quantité de commande économique (EOQ)
 * @param annualDemand - Demande annuelle
 * @param orderCost - Coût de commande
 * @param holdingCostPerUnit - Coût de détention par unité
 * @returns La quantité de commande économique
 */
export function calculateEconomicOrderQuantity(annualDemand: number, orderCost: number, holdingCostPerUnit: number): number {
  if (holdingCostPerUnit <= 0) {
    return Math.sqrt(2 * annualDemand * orderCost); // Valeur par défaut si coût de détention invalide
  }
  
  const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
  return Math.round(eoq);
}

/**
 * Calcule le taux de rotation des stocks
 * @param costOfGoodsSold - Coût des marchandises vendues
 * @param averageInventoryValue - Valeur moyenne des stocks
 * @returns Le taux de rotation
 */
export function calculateStockTurnover(costOfGoodsSold: number, averageInventoryValue: number): number {
  if (averageInventoryValue === 0) {
    return 0;
  }
  
  return costOfGoodsSold / averageInventoryValue;
}

/**
 * Calcule les jours de stock restants
 * @param currentStock - Stock actuel
 * @param dailyUsage - Consommation moyenne quotidienne
 * @returns Les jours de stock restants
 */
export function calculateDaysOfSupply(currentStock: number, dailyUsage: number): number {
  if (dailyUsage === 0) {
    return Infinity; // Infini si pas de consommation
  }
  
  return currentStock / dailyUsage;
}

/**
 * Calcule la valeur totale du stock
 * @param quantity - Quantité en stock
 * @param unitCost - Coût unitaire
 * @returns La valeur totale du stock
 */
export function calculateInventoryValue(quantity: number, unitCost: number): number {
  return quantity * unitCost;
}

/**
 * Analyse ABC (Pareto) pour la gestion des stocks
 * @param items - Tableau d'objets avec des propriétés pour le calcul de la valeur
 * @param valueProperty - Propriété à utiliser pour la valeur (ex: "value", "cost", etc.)
 * @param quantityProperty - Propriété à utiliser pour la quantité
 * @returns Analyse ABC classant les articles
 */
export interface ABCItem {
  id: string;
  value: number;
  quantity: number;
  totalValue: number;
  category: 'A' | 'B' | 'C';
  cumulativePercentage: number;
}

export function calculateABCAnalysis<T extends { id: string; [key: string]: any }>(
  items: T[],
  valueProperty: keyof T,
  quantityProperty: keyof T
): ABCItem[] {
  // Calculer la valeur totale pour chaque article
  const itemsWithTotalValue: ABCItem[] = items.map(item => {
    const value = Number(item[valueProperty]) || 0;
    const quantity = Number(item[quantityProperty]) || 0;
    const totalValue = value * quantity;
    
    return {
      id: item.id,
      value,
      quantity,
      totalValue,
      category: 'C', // Valeur par défaut
      cumulativePercentage: 0
    };
  });
  
  // Trier par valeur totale décroissante
  itemsWithTotalValue.sort((a, b) => b.totalValue - a.totalValue);
  
  // Calculer la valeur totale de tous les articles
  const totalValue = itemsWithTotalValue.reduce((sum, item) => sum + item.totalValue, 0);
  
  if (totalValue === 0) {
    return itemsWithTotalValue;
  }
  
  // Calculer le pourcentage cumulatif et assigner la catégorie
  let cumulativeValue = 0;
  for (const item of itemsWithTotalValue) {
    cumulativeValue += item.totalValue;
    item.cumulativePercentage = (cumulativeValue / totalValue) * 100;
    
    if (item.cumulativePercentage <= 80) {
      item.category = 'A';
    } else if (item.cumulativePercentage <= 95) {
      item.category = 'B';
    } else {
      item.category = 'C';
    }
  }
  
  return itemsWithTotalValue;
}

/**
 * Détecte les stocks morts (non mouvementés)
 * @param movementData - Données de mouvement pour chaque article
 * @param daysThreshold - Seuil de jours sans mouvement
 * @param dateProperty - Propriété contenant la date de dernier mouvement
 * @returns Liste des stocks morts
 */
export interface DeadStockItem {
  id: string;
  lastMovementDate: Date;
  daysSinceLastMovement: number;
}

export function calculateDeadStock<T extends { id: string; [key: string]: any }>(
  items: T[],
  daysThreshold: number,
  dateProperty: keyof T
): DeadStockItem[] {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
  
  return items
    .filter(item => {
      const movementDate = new Date(item[dateProperty] as string | number | Date);
      return movementDate < thresholdDate;
    })
    .map(item => {
      const movementDate = new Date(item[dateProperty] as string | number | Date);
      const daysSince = Math.floor((new Date().getTime() - movementDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: item.id,
        lastMovementDate: movementDate,
        daysSinceLastMovement: daysSince
      };
    });
}

/**
 * Calcule les alertes d'expiration
 * @param lotData - Données de lots avec dates d'expiration
 * @param daysThreshold - Seuil de jours avant expiration pour l'alerte
 * @param expiryDateProperty - Propriété contenant la date d'expiration
 * @returns Liste des lots expirant bientôt
 */
export interface ExpiryAlertItem {
  id: string;
  expiryDate: Date;
  daysToExpiry: number;
}

export function calculateExpiryAlert<T extends { id: string; [key: string]: any }>(
  items: T[],
  daysThreshold: number,
  expiryDateProperty: keyof T
): ExpiryAlertItem[] {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return items
    .filter(item => {
      const expiryDate = new Date(item[expiryDateProperty] as string | number | Date);
      return expiryDate <= thresholdDate && expiryDate >= new Date();
    })
    .map(item => {
      const expiryDate = new Date(item[expiryDateProperty] as string | number | Date);
      const daysTo = Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: item.id,
        expiryDate,
        daysToExpiry: daysTo
      };
    });
}