// scripts/generate-language.js

const fs = require('fs');
const path = require('path');

// Lire les arguments de la ligne de commande
const newLanguage = process.argv[2];

if (!newLanguage) {
  console.error('Veuillez spécifier un code de langue (ex: de, es, it, etc.)');
  process.exit(1);
}

// Dossier racine des traductions
const translationsDir = path.join(__dirname, '../src/lib/i18n');

// Langue source à dupliquer (généralement 'en')
const sourceLanguage = 'en';

// Modules existants
const modules = ['common', 'navigation', 'stock', 'sales', 'employees', 'customers'];

// Vérifier si le dossier des traductions existe
if (!fs.existsSync(translationsDir)) {
  console.error('Le dossier de traductions n\'existe pas');
  process.exit(1);
}

// Fonction pour générer un fichier de traduction pour un module
function generateModuleTranslationFile(moduleDir, moduleName, targetLang) {
  const sourceFile = path.join(moduleDir, `${sourceLanguage}.json`);
  const targetFile = path.join(moduleDir, `${targetLang}.json`);
  
  if (!fs.existsSync(sourceFile)) {
    console.error(`Le fichier source ${sourceFile} n'existe pas`);
    return;
  }
  
  // Lire le fichier source
  const sourceContent = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  
  // Créer le contenu cible avec les mêmes clés mais des valeurs vides ou en anglais
  const targetContent = JSON.stringify(sourceContent, null, 2);
  
  // Écrire le fichier cible
  fs.writeFileSync(targetFile, targetContent);
  console.log(`Fichier de traduction créé: ${targetFile}`);
}

// Parcourir chaque module et générer les fichiers pour la nouvelle langue
modules.forEach(module => {
  const moduleDir = path.join(translationsDir, module);
  
  if (fs.existsSync(moduleDir)) {
    generateModuleTranslationFile(moduleDir, module, newLanguage);
  } else {
    console.warn(`Le module ${module} n'existe pas, ignoré.`);
  }
});

// Mettre à jour la configuration
const configFilePath = path.join(translationsDir, 'config.ts');
if (fs.existsSync(configFilePath)) {
  let configContent = fs.readFileSync(configFilePath, 'utf8');
  
  // Trouver la ligne avec supportedLanguages et ajouter la nouvelle langue
  const supportedLanguagesRegex = /supportedLanguages: \[([^\]]+)\] as const/;
  const match = configContent.match(supportedLanguagesRegex);
  
  if (match) {
    const currentLanguages = match[1];
    const languagesArray = currentLanguages
      .split(',')
      .map(lang => lang.trim().replace(/['"]/g, ''))
      .filter(lang => lang.length > 0);
    
    // Ajouter la nouvelle langue si elle n'existe pas déjà
    if (!languagesArray.includes(newLanguage)) {
      languagesArray.push(newLanguage);
      const newLanguagesString = languagesArray
        .map(lang => `'${lang}'`)
        .join(', ');
      
      configContent = configContent.replace(
        supportedLanguagesRegex,
        `supportedLanguages: [${newLanguagesString}] as const`
      );
      
      fs.writeFileSync(configFilePath, configContent);
      console.log(`Langue ${newLanguage} ajoutée à la configuration.`);
    } else {
      console.log(`La langue ${newLanguage} existe déjà dans la configuration.`);
    }
  }
}

console.log(`\nTraductions pour la langue ${newLanguage} générées avec succès !`);
console.log('N\'oubliez pas de traduire les textes dans les fichiers générés.');