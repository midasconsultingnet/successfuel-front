/**
 * Utilitaires pour les exports dans SuccessFuel
 */

/**
 * Convertit des données en format CSV
 * @param data - Les données à convertir
 * @param headers - Les en-têtes de colonnes (optionnel)
 * @returns Une chaîne CSV
 */
export function exportToCSV<T>(data: T[], headers?: string[]): string {
  if (data.length === 0) {
    return headers ? headers.join(',') : '';
  }

  // Extraire les en-têtes si non fournis
  const keys = headers || Object.keys(data[0] as object);
  
  // Générer l'en-tête
  let csvContent = keys.join(',') + '\n';
  
  // Générer les lignes de données
  for (const row of data) {
    const values = keys.map(key => {
      const value = (row as any)[key];
      // Échapper les valeurs contenant des virgules, quotes ou newlines
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    
    csvContent += values.join(',') + '\n';
  }
  
  return csvContent;
}

/**
 * Formate des données pour l'export
 * @param data - Les données à formater
 * @param formatOptions - Options de formatage
 * @returns Les données formatées
 */
export interface FormatOptions {
  dateLocale?: string;
  currency?: string;
  numberDecimals?: number;
  includeHeaders?: boolean;
  customFormatters?: { [key: string]: (value: any) => string };
}

export function formatForExport<T>(data: T[], formatOptions?: FormatOptions): T[] {
  const options = {
    dateLocale: 'fr-FR',
    currency: 'XOF',
    numberDecimals: 2,
    includeHeaders: true,
    customFormatters: {},
    ...formatOptions
  };

  return data.map(item => {
    const formattedItem: any = {};
    
    for (const [key, value] of Object.entries(item)) {
      if (options.customFormatters && options.customFormatters[key]) {
        formattedItem[key] = options.customFormatters[key](value);
      } else if (value instanceof Date) {
        formattedItem[key] = new Intl.DateTimeFormat(options.dateLocale).format(value);
      } else if (typeof value === 'number') {
        formattedItem[key] = new Intl.NumberFormat('fr-FR', {
          minimumFractionDigits: options.numberDecimals,
          maximumFractionDigits: options.numberDecimals
        }).format(value);
      } else {
        formattedItem[key] = value;
      }
    }
    
    return formattedItem;
  });
}

/**
 * Crée des données formatées pour l'export
 * @param rawData - Les données brutes
 * @param mapping - Mappage des champs pour l'export
 * @returns Les données préparées pour l'export
 */
export interface ExportDataMapping {
  [exportKey: string]: string; // mappe les clés d'export aux clés de données
}

export function createExportData<T>(rawData: T[], mapping?: ExportDataMapping): any[] {
  if (!mapping) {
    return rawData as any[];
  }

  return rawData.map(item => {
    const mappedItem: any = {};
    
    for (const [exportKey, dataKey] of Object.entries(mapping)) {
      mappedItem[exportKey] = (item as any)[dataKey];
    }
    
    return mappedItem;
  });
}

/**
 * Valide les données pour l'export
 * @param data - Les données à valider
 * @param validationRules - Règles de validation
 * @returns Un objet avec le résultat de la validation
 */
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean';
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: RegExp;
}

export function validateExportData<T>(data: T[], validationRules: { [key: string]: ValidationRule }): {
  isValid: boolean;
  errors: Array<{ row: number; field: string; error: string }>;
} {
  const errors: Array<{ row: number; field: string; error: string }> = [];
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    for (const [field, rules] of Object.entries(validationRules)) {
      const value = (item as any)[field];
      
      // Vérifier si le champ est requis
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          row: i,
          field,
          error: 'Ce champ est requis'
        });
        continue;
      }
      
      // Vérifier le type
      if (value !== undefined && value !== null && rules.type) {
        let typeValid = true;
        
        switch (rules.type) {
          case 'string':
            typeValid = typeof value === 'string';
            break;
          case 'number':
            typeValid = typeof value === 'number' && !isNaN(value);
            break;
          case 'date':
            typeValid = value instanceof Date || !isNaN(Date.parse(value));
            break;
          case 'boolean':
            typeValid = typeof value === 'boolean';
            break;
        }
        
        if (!typeValid) {
          errors.push({
            row: i,
            field,
            error: `Le type incorrect (attendu: ${rules.type})`
          });
        }
      }
      
      // Vérifier les contraintes de longueur pour les chaînes
      if (typeof value === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push({
            row: i,
            field,
            error: `La longueur minimale est de ${rules.minLength}`
          });
        }
        
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push({
            row: i,
            field,
            error: `La longueur maximale est de ${rules.maxLength}`
          });
        }
      }
      
      // Vérifier les contraintes de valeur pour les nombres
      if (typeof value === 'number') {
        if (rules.minValue !== undefined && value < rules.minValue) {
          errors.push({
            row: i,
            field,
            error: `La valeur minimale est de ${rules.minValue}`
          });
        }
        
        if (rules.maxValue !== undefined && value > rules.maxValue) {
          errors.push({
            row: i,
            field,
            error: `La valeur maximale est de ${rules.maxValue}`
          });
        }
      }
      
      // Vérifier le motif pour les chaînes
      if (typeof value === 'string' && rules.pattern) {
        if (!rules.pattern.test(value)) {
          errors.push({
            row: i,
            field,
            error: 'Le format est incorrect'
          });
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Exporte les données vers Excel (format CSV pour l'instant)
 * @param data - Les données à exporter
 * @param filename - Le nom du fichier
 * @param headers - Les en-têtes de colonnes
 */
export function exportToExcel<T>(data: T[], filename: string, headers?: string[]): void {
  const csvContent = exportToCSV(data, headers);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Exporte les données vers PDF (stub - nécessiterait une bibliothèque tierce)
 * @param data - Les données à exporter
 * @param filename - Le nom du fichier
 */
export function exportToPDF<T>(data: T[], filename: string): void {
  // Cela nécessiterait une bibliothèque comme jsPDF
  // Pour l'instant, on lance une impression
  console.warn('Export PDF nécessite une bibliothèque tierce comme jsPDF');
  
  // Afficher un avertissement à la place
  const printWindow = window.open('', '', 'height=600,width=800');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head><title>${filename}</title></head>
        <body>
          <h1>${filename}</h1>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
}