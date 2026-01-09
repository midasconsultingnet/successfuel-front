<script lang="ts">
  import { onMount } from 'svelte';
  import { configurationService } from '$lib/services/ConfigurationService';
  import { familleProduitService } from '$lib/services/FamilleProduitService';
  import type { FamilleProduit } from '$lib/services/FamilleProduitService';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Spinner } from '$lib/components/ui/spinner';
  import { Plus, Upload, Download, Package, Droplets, Wind, Wrench } from 'lucide-svelte';
  import * as XLSX from 'xlsx';
  import { save } from '@tauri-apps/plugin-dialog';
  import { writeFile } from '@tauri-apps/plugin-fs';
  import { open } from '@tauri-apps/plugin-shell';

  // Récupérer les données de la page
  let stationId = $state<string>('');
  let stationData = $state<any>(null);

  // Charger l'ID de la station depuis les données du layout
  $effect(() => {
    const unsubscribe = page.subscribe((data) => {
      if (data.data?.stationId && stationId !== data.data?.stationId) {
        stationId = data.data.stationId;
        stationData = data.data.station;
      }
    });
    return unsubscribe;
  });

  // États
  let loading = $state(false);
  let error = $state<string | null>(null);
  let saving = $state(false);
  let activeTab = $state('boutique');

  // Données pour les familles de produits
  let familleProduits = $state<FamilleProduit[]>([]);
  let familleProduitsMap = $state<Map<string, string>>(new Map()); // Map: code -> id

  // Données de configuration
  let products = $state<any[]>([]);

  // Références pour le focus
  let newProductNameInput: HTMLInputElement | null = null;

  // Fonction pour charger la configuration existante
  async function loadConfiguration() {
    try {
      loading = true;

      // Charger les produits existants via l'API
      if (stationId) {
        const produits = await familleProduitService.getProduitsByStation(stationId);

        // Transformer les produits API en format local
        const localProducts = produits.map(produit => ({
          id: produit.id, // ID unique local pour la gestion dans l'interface
          apiId: produit.id, // ID de l'API pour les mises à jour
          name: produit.nom,
          code: produit.code,
          barcode: produit.code_barre || '',
          category: produit.type === 'lubrifiant' ? 'lubrifiants' :
                   produit.type === 'gaz' ? 'gaz' :
                   produit.type === 'service' ? 'services' : 'boutique',
          purchase_price: produit.prix_vente > 0 ? produit.prix_vente * 0.8 : 0, // Calcul approximatif du prix d'achat
          sale_price: produit.prix_vente,
          stock: produit.quantite_stock,
          stock_threshold: produit.seuil_stock_min,
          description: produit.description || ''
        }));

        products = localProducts;
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la configuration:', err);
      error = 'Impossible de charger la configuration: ' + (err as Error).message;
    } finally {
      loading = false;
    }
  }

  // Fonction pour sauvegarder la configuration
  async function saveConfiguration() {
    if (!stationId) return;

    try {
      saving = true;

      // Sauvegarder chaque produit via l'API
      for (const product of products) {
        // Déterminer le type et la famille_id en fonction de la catégorie
        let type: string;
        let familleId: string | undefined;
        let hasStock: boolean;

        switch (product.category) {
          case 'boutique':
            type = 'boutique';
            familleId = familleProduitsMap.get('PBS');
            hasStock = true;
            break;
          case 'lubrifiants':
            type = 'lubrifiant';
            familleId = familleProduitsMap.get('LUB');
            hasStock = true;
            break;
          case 'gaz':
            type = 'gaz';
            familleId = familleProduitsMap.get('GAZ');
            hasStock = true;
            break;
          case 'services':
            type = 'service';
            familleId = familleProduitsMap.get('SRV');
            hasStock = false;
            break;
          default:
            type = 'boutique';
            hasStock = true;
            break;
        }

        if (!familleId) {
          throw new Error(`Famille non trouvée pour la catégorie: ${product.category}`);
        }

        // Créer ou mettre à jour le produit via l'API
        try {
          const produitPayload = {
            nom: product.name,
            code: product.code,
            code_barre: product.barcode || undefined,
            description: product.description || undefined,
            unite_mesure: 'unité', // Valeur par défaut
            type,
            famille_id: familleId,
            has_stock: hasStock
          };

          let createdProduct = null;

          // Si le produit a un ID existant, on le met à jour, sinon on le crée
          if (product.apiId) {
            await familleProduitService.updateProduit(product.apiId, {
              nom: product.name,
              code_barre: product.barcode || undefined,
              description: product.description || undefined,
              famille_id: familleId,
              has_stock: hasStock
            });
          } else {
            createdProduct = await familleProduitService.createProduit(produitPayload);
            // Mettre à jour l'ID API du produit local
            product.apiId = createdProduct.id;
          }

          // Si le produit a un stock (non service), initialiser le stock
          if (hasStock && (product.apiId || createdProduct)) {
            await familleProduitService.initializeStock({
              produit_id: product.apiId || createdProduct?.id,
              station_id: stationId,
              quantite_initiale: product.stock || 0,
              cout_unitaire: product.purchase_price || 0,  // Prix d'achat
              prix_vente: product.sale_price || 0,        // Prix de vente
              seuil_stock_min: product.stock_threshold || 0,
              date_stock_initial: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`Erreur lors de la sauvegarde du produit ${product.name}:`, error);
          throw error;
        }
      }

      // Préparer les données de configuration
      const config = {
        completion: {
          ...stationData.config?.completion,
          retail: {
            overall: true
          }
        }
      };

      // Sauvegarder la configuration via l'API
      await configurationService.saveStationConfiguration(stationId, config);

      // Afficher un message de succès
      toast.success(
        get(i18nStore).resources?.configuration?.save_success_title || 'Configuration sauvegardée',
        {
          description: get(i18nStore).resources?.configuration?.retail_save_success_description || 'La configuration des produits et services a été sauvegardée avec succès'
        }
      );
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la configuration:', err);

      // Afficher un message d'erreur
      toast.error(
        get(i18nStore).resources?.configuration?.save_error_title || 'Erreur de sauvegarde',
        {
          description: get(i18nStore).resources?.configuration?.save_error_description || 'Une erreur est survenue lors de la sauvegarde de la configuration'
        }
      );
    } finally {
      saving = false;
    }
  }

  // États pour les erreurs et doublons
  let validationErrors = $state<{ [id: string]: string[] }>({});
  let duplicates = $state<{ field: string; value: string; indices: number[] }[]>([]);

  // Fonction pour valider tous les produits
  function validateAllProducts() {
    const errors: { [id: string]: string[] } = {};

    products.forEach((product) => {
      const productErrors: string[] = [];

      // Vérifier les champs obligatoires
      if (!product.name?.trim()) {
        productErrors.push('Le nom est obligatoire');
      }
      if (!product.code?.trim()) {
        productErrors.push('Le code est obligatoire');
      }
      if (product.purchase_price === undefined || product.purchase_price === null || product.purchase_price < 0) {
        productErrors.push('Le prix d\'achat est obligatoire et doit être positif');
      }
      if (product.sale_price === undefined || product.sale_price === null || product.sale_price < 0) {
        productErrors.push('Le prix de vente est obligatoire et doit être positif');
      }
      if (product.stock === undefined || product.stock === null || product.stock < 0) {
        productErrors.push('Le stock est obligatoire et doit être positif');
      }
      if (product.stock_threshold === undefined || product.stock_threshold === null || product.stock_threshold < 0) {
        productErrors.push('Le seuil d\'alerte est obligatoire et doit être positif');
      }

      // Vérifier que le prix d'achat est inférieur au prix de vente
      if (product.purchase_price >= product.sale_price) {
        productErrors.push('Le prix d\'achat doit être inférieur au prix de vente');
      }

      if (productErrors.length > 0) {
        errors[product.id] = productErrors;
      }
    });

    validationErrors = errors;
  }

  // Fonction pour vérifier les doublons
  function checkForDuplicates() {
    const dup: { field: string; value: string; indices: number[] }[] = [];

    // Regrouper les produits par catégorie
    const productsByCategory: { [category: string]: { product: any; index: number }[] } = {};

    products.forEach((product, index) => {
      if (!productsByCategory[product.category]) {
        productsByCategory[product.category] = [];
      }
      productsByCategory[product.category].push({ product, index });
    });

    // Vérifier les doublons dans chaque catégorie
    Object.keys(productsByCategory).forEach(category => {
      const categoryProducts = productsByCategory[category];
      const nameMap = new Map<string, number[]>();
      const codeMap = new Map<string, number[]>();
      const barcodeMap = new Map<string, number[]>();

      categoryProducts.forEach(({ product, index }) => {
        // Vérifier les doublons de nom
        if (product.name?.trim()) {
          if (!nameMap.has(product.name.trim())) {
            nameMap.set(product.name.trim(), []);
          }
          nameMap.get(product.name.trim())?.push(index);
        }

        // Vérifier les doublons de code
        if (product.code?.trim()) {
          if (!codeMap.has(product.code.trim())) {
            codeMap.set(product.code.trim(), []);
          }
          codeMap.get(product.code.trim())?.push(index);
        }

        // Vérifier les doublons de code-barres (s'il est fourni)
        if (product.barcode?.trim()) {
          if (!barcodeMap.has(product.barcode.trim())) {
            barcodeMap.set(product.barcode.trim(), []);
          }
          barcodeMap.get(product.barcode.trim())?.push(index);
        }
      });

      // Ajouter les doublons trouvés dans cette catégorie
      nameMap.forEach((indices, value) => {
        if (indices.length > 1) {
          dup.push({ field: 'name', value, indices });
        }
      });

      codeMap.forEach((indices, value) => {
        if (indices.length > 1) {
          dup.push({ field: 'code', value, indices });
        }
      });

      barcodeMap.forEach((indices, value) => {
        if (indices.length > 1) {
          dup.push({ field: 'barcode', value, indices });
        }
      });
    });

    duplicates = dup;
  }

  // Fonction pour valider un produit spécifique
  function validateProduct(productId: string): { isValid: boolean; errors: string[] } {
    const errors = validationErrors[productId] || [];
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Fonction pour vérifier si un champ a un doublon
  function hasDuplicate(field: string, value: string, currentIndex: number): boolean {
    return duplicates.some(dup =>
      dup.field === field &&
      dup.value === value &&
      dup.indices.includes(currentIndex)
    );
  }

  // Fonction pour mettre à jour les validations
  function updateValidations() {
    validateAllProducts();
    checkForDuplicates();
  }

  // Mettre à jour les validations à chaque changement de produits
  $effect(() => {
    updateValidations();
  });

  // Fonction pour ajouter un nouveau produit/service
  function addProduct() {
    products = [
      ...products,
      {
        id: Date.now().toString(),
        name: '',
        category: activeTab,
        code: '',
        barcode: '',
        purchase_price: 0,
        sale_price: 0,
        stock: 0,
        stock_threshold: 5, // Seuil d'alerte de stock par défaut
        description: ''
      }
    ];

    // Mettre à jour l'interface et attendre le rendu
    setTimeout(() => {
      // Trouver le champ "name" de la nouvelle ligne et lui donner le focus
      const newProductInputs = document.querySelectorAll('input[placeholder="Nom du produit"], input[placeholder="Nom du service"]');
      if (newProductInputs.length > 0) {
        const lastInput = newProductInputs[newProductInputs.length - 1] as HTMLInputElement;
        lastInput.focus();
      }
    }, 0);
  }

  // Fonction pour supprimer un produit/service
  function removeProduct(productId: string) {
    products = products.filter(p => p.id !== productId);
  }

  // Fonction pour mettre à jour un produit/service
  function updateProduct(index: number, field: string, value: any) {
    products[index] = { ...products[index], [field]: value };
  }

  // Fonction pour obtenir l'index réel dans la liste complète à partir de l'index dans la catégorie
  function getRealIndex(categoryIndex: number, category: string): number {
    const categoryProducts = products.filter(p => p.category === category);
    const product = categoryProducts[categoryIndex];
    return products.findIndex(p => p.id === product.id);
  }

  // Fonction pour gérer la touche Entrée dans un champ spécifique
  function handleKeydown(e: KeyboardEvent, categoryIndex: number) {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('Touche Entrée pressée');
      console.log('Index dans la catégorie:', categoryIndex);
      console.log('Catégorie active:', activeTab);

      // Obtenir les produits de la catégorie active
      const currentCategoryProducts = products.filter(p => p.category === activeTab);
      console.log('Produits dans la catégorie:', currentCategoryProducts.length);

      if (categoryIndex === currentCategoryProducts.length - 1) {
        console.log('Ajout d\'un nouveau produit');
        addProduct();
      } else {
        console.log('Ce n\'est pas le dernier produit dans la catégorie');
      }
    }
  }

  // Fonction pour gérer la touche Entrée dans le dernier champ
  function handleLastFieldEnter(e: KeyboardEvent, categoryIndex: number) {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('Touche Entrée pressée');
      console.log('Index dans la catégorie:', categoryIndex);
      console.log('Catégorie active:', activeTab);

      // Obtenir les produits de la catégorie active
      const currentCategoryProducts = products.filter(p => p.category === activeTab);
      console.log('Produits dans la catégorie:', currentCategoryProducts.length);

      if (categoryIndex === currentCategoryProducts.length - 1) {
        console.log('Ajout d\'un nouveau produit');
        addProduct();
      } else {
        console.log('Ce n\'est pas le dernier produit dans la catégorie');
      }
    }
  }

  // Fonction pour obtenir les familles de produits uniques
  function getProductFamilies(): string[] {
    const allFamilies = products
      .filter(p => p.category === activeTab && p.product_family && p.product_family.trim() !== '')
      .map(p => p.product_family.trim());

    // Retourner les familles uniques
    return Array.from(new Set(allFamilies));
  }

  // États pour l'import Excel
  let importModalOpen = $state(false);
  let importedData = $state<any[]>([]);
  let importErrors = $state<string[]>([]);

  // Fonction pour télécharger le modèle Excel
  async function downloadTemplate() {
    // Vérifier si XLSX est disponible
    if (!XLSX || !XLSX.utils || !XLSX.utils.json_to_sheet || !XLSX.utils.book_new || !XLSX.utils.book_append_sheet) {
      console.error('La bibliothèque XLSX n\'est pas correctement chargée');
      toast.error(
        get(i18nStore)?.resources?.common?.error || 'Erreur',
        {
          description: 'La bibliothèque de traitement Excel n\'est pas disponible'
        }
      );
      return;
    }

    // Créer un modèle Excel avec les colonnes nécessaires
    const templateData = [
      {
        'Nom': 'Exemple Produit',
        'Code': 'PROD001',
        'Code-barres': '1234567890123',
        'Catégorie': 'boutique', // boutique, lubrifiants, gaz, services
        'Prix d\'achat': 1000,
        'Prix de vente': 1500,
        'Stock': 50,
        'Seuil d\'alerte': 10,
        'Description': 'Description du produit'
      }
    ];

    try {
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produits');

      // Générer le fichier Excel en binaire
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      // Demander à l'utilisateur où enregistrer le fichier
      const filePath = await save({
        filters: [{
          name: 'Excel Files',
          extensions: ['xlsx']
        }],
        defaultPath: 'modele_import_produits.xlsx'
      });

      if (filePath) {
        // Écrire le fichier
        await writeFile(filePath, new Uint8Array(excelBuffer));

        // Afficher un message de succès
        toast.success(
          get(i18nStore)?.resources?.configuration?.download_template_success_title || 'Modèle téléchargé',
          {
            description: 'Le modèle Excel a été enregistré. Ouvrez-le avec Excel, complétez les informations, puis utilisez le bouton "Importer Fichier" pour charger les données.'
          }
        );

        // Optionnellement, ouvrir le dossier contenant le fichier
        const directoryPath = filePath.substring(0, filePath.lastIndexOf('/')) || filePath.substring(0, filePath.lastIndexOf('\\'));
        setTimeout(() => {
          open(directoryPath).catch(console.error);
        }, 1000);
      } else {
        // L'utilisateur a annulé la boîte de dialogue
        console.log('Téléchargement annulé par l\'utilisateur');
      }
    } catch (error) {
      console.error('Erreur lors de la génération ou de l\'enregistrement du modèle Excel:', error);
      toast.error(
        get(i18nStore)?.resources?.common?.error || 'Erreur',
        {
          description: 'Une erreur est survenue lors de la génération ou de l\'enregistrement du modèle Excel'
        }
      );
    }
  }

  // Fonction pour ouvrir la sélection de fichier
  function selectFile() {
    const fileInput = document.getElementById('excel-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Fonction pour gérer la sélection de fichier
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // Lire le fichier Excel
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });

      // Lire la première feuille
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      // Valider et traiter les données
      processImportedData(jsonData);
    };
    reader.readAsArrayBuffer(file);
  }

  // Fonction pour traiter les données importées
  function processImportedData(data: any[]) {
    importErrors = [];
    const processedData = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const errors: string[] = [];

      // Valider les champs requis
      if (!row['Nom'] || typeof row['Nom'] !== 'string') {
        errors.push(`Ligne ${i + 2}: Le nom est requis et doit être une chaîne de caractères`);
      }

      if (!row['Code'] || typeof row['Code'] !== 'string') {
        errors.push(`Ligne ${i + 2}: Le code est requis et doit être une chaîne de caractères`);
      }

      if (row['Prix d\'achat'] === undefined || row['Prix d\'achat'] === null || isNaN(row['Prix d\'achat'])) {
        errors.push(`Ligne ${i + 2}: Le prix d'achat est requis et doit être un nombre`);
      }

      if (row['Prix de vente'] === undefined || row['Prix de vente'] === null || isNaN(row['Prix de vente'])) {
        errors.push(`Ligne ${i + 2}: Le prix de vente est requis et doit être un nombre`);
      }

      if (row['Prix d\'achat'] >= row['Prix de vente']) {
        errors.push(`Ligne ${i + 2}: Le prix d'achat doit être inférieur au prix de vente`);
      }

      // Vérifier la catégorie
      const validCategories = ['boutique', 'lubrifiants', 'gaz', 'services'];
      if (!row['Catégorie'] || !validCategories.includes(row['Catégorie'])) {
        errors.push(`Ligne ${i + 2}: La catégorie est requise et doit être une parmi: ${validCategories.join(', ')}`);
      }

      // Vérifier les champs spécifiques aux catégories
      if (row['Catégorie'] !== 'services') {
        if (row['Stock'] === undefined || row['Stock'] === null || isNaN(row['Stock'])) {
          errors.push(`Ligne ${i + 2}: Le stock est requis pour les produits et doit être un nombre`);
        }

        if (row['Seuil d\'alerte'] === undefined || row['Seuil d\'alerte'] === null || isNaN(row['Seuil d\'alerte'])) {
          errors.push(`Ligne ${i + 2}: Le seuil d'alerte est requis pour les produits et doit être un nombre`);
        }
      }

      if (errors.length > 0) {
        importErrors.push(...errors);
      } else {
        // Convertir les champs numériques
        const processedRow = {
          id: Date.now().toString() + i, // Générer un ID unique
          name: row['Nom'],
          code: row['Code'],
          barcode: row['Code-barres'] || '',
          category: row['Catégorie'],
          purchase_price: parseFloat(row['Prix d\'achat']),
          sale_price: parseFloat(row['Prix de vente']),
          stock: row['Catégorie'] === 'services' ? 0 : parseInt(row['Stock']),
          stock_threshold: row['Catégorie'] === 'services' ? 0 : parseInt(row['Seuil d\'alerte']),
          description: row['Description'] || ''
        };

        processedData.push(processedRow);
      }
    }

    // Vérifier les doublons dans les données importées
    const importedNameMap = new Map<string, number[]>();
    const importedCodeMap = new Map<string, number[]>();
    const importedBarcodeMap = new Map<string, number[]>();

    processedData.forEach((product, index) => {
      // Vérifier les doublons de nom dans les données importées
      if (product.name?.trim()) {
        if (!importedNameMap.has(product.name.trim())) {
          importedNameMap.set(product.name.trim(), []);
        }
        importedNameMap.get(product.name.trim())?.push(index);
      }

      // Vérifier les doublons de code dans les données importées
      if (product.code?.trim()) {
        if (!importedCodeMap.has(product.code.trim())) {
          importedCodeMap.set(product.code.trim(), []);
        }
        importedCodeMap.get(product.code.trim())?.push(index);
      }

      // Vérifier les doublons de code-barres dans les données importées (s'il est fourni)
      if (product.barcode?.trim()) {
        if (!importedBarcodeMap.has(product.barcode.trim())) {
          importedBarcodeMap.set(product.barcode.trim(), []);
        }
        importedBarcodeMap.get(product.barcode.trim())?.push(index);
      }
    });

    // Ajouter les erreurs de doublons pour les données importées
    importedNameMap.forEach((indices, value) => {
      if (indices.length > 1) {
        importErrors.push(`Le nom "${value}" apparaît plusieurs fois dans les données importées`);
      }
    });

    importedCodeMap.forEach((indices, value) => {
      if (indices.length > 1) {
        importErrors.push(`Le code "${value}" apparaît plusieurs fois dans les données importées`);
      }
    });

    importedBarcodeMap.forEach((indices, value) => {
      if (indices.length > 1) {
        importErrors.push(`Le code-barres "${value}" apparaît plusieurs fois dans les données importées`);
      }
    });

    // Vérifier les doublons avec les produits existants
    processedData.forEach((newProduct, index) => {
      // Vérifier les doublons avec les produits existants dans la même catégorie
      const existingProductsInCategory = products.filter(p => p.category === newProduct.category);

      // Vérifier le nom
      const existingName = existingProductsInCategory.find(p => p.name === newProduct.name);
      if (existingName) {
        importErrors.push(`Le nom "${newProduct.name}" existe déjà dans la catégorie ${newProduct.category}`);
      }

      // Vérifier le code
      const existingCode = existingProductsInCategory.find(p => p.code === newProduct.code);
      if (existingCode) {
        importErrors.push(`Le code "${newProduct.code}" existe déjà dans la catégorie ${newProduct.category}`);
      }

      // Vérifier le code-barres s'il est fourni
      if (newProduct.barcode) {
        const existingBarcode = existingProductsInCategory.find(p => p.barcode === newProduct.barcode);
        if (existingBarcode) {
          importErrors.push(`Le code-barres "${newProduct.barcode}" existe déjà dans la catégorie ${newProduct.category}`);
        }
      }
    });

    importedData = processedData;

    // Toujours afficher la modale d'aperçu, qu'il y ait des erreurs ou non
    importModalOpen = true;

    if (importErrors.length === 0) {
      // Aucune erreur, mais on affiche quand même la modale pour confirmation
      toast.info(
        get(i18nStore).resources?.configuration?.import_preview_title || 'Aperçu de l\'import',
        {
          description: `Fichier lu avec succès. ${processedData.length} produits/services prêts à être importés.`
        }
      );
    } else {
      // Afficher les erreurs dans la modale
      toast.error(
        get(i18nStore).resources?.configuration?.import_error_title || 'Erreurs d\'import',
        {
          description: `L'import contient ${importErrors.length} erreur(s). Veuillez corriger le fichier et réessayer.`
        }
      );
    }
  }

  // Fonction pour importer les produits dans la liste
  function importProducts(importedProducts: any[]) {
    // Fusionner les produits importés avec les produits existants
    products = [...products, ...importedProducts];
  }

  // Fonction pour confirmer l'import
  function confirmImport() {
    importProducts(importedData);
    importModalOpen = false;
    importedData = [];
    importErrors = [];

    toast.success(
      get(i18nStore).resources?.configuration?.import_success_title || 'Import réussi',
      {
        description: `Import de ${importedData.length} produits/services effectué avec succès`
      }
    );
  }

  // Fonction de test pour simuler l'import de données
  function testImportScenario() {
    // Simuler l'import de données de test
    const testData = [
      {
        'Nom': 'Huile de moteur',
        'Code': 'LUB001',
        'Code-barres': '1234567890123',
        'Catégorie': 'lubrifiants',
        'Prix d\'achat': 2500,
        'Prix de vente': 3500,
        'Stock': 20,
        'Seuil d\'alerte': 5,
        'Description': 'Huile de moteur 10W40'
      },
      {
        'Nom': 'Bouteille de gaz',
        'Code': 'GAZ001',
        'Code-barres': '2345678901234',
        'Catégorie': 'gaz',
        'Prix d\'achat': 3000,
        'Prix de vente': 4500,
        'Stock': 15,
        'Seuil d\'alerte': 3,
        'Description': 'Bouteille de gaz butane 6kg'
      },
      {
        'Nom': 'Service vidange',
        'Code': 'SER001',
        'Catégorie': 'services',
        'Prix d\'achat': 1000,
        'Prix de vente': 2500,
        'Description': 'Service de vidange complet'
      }
    ];

    processImportedData(testData);
  }

  // Charger les données au montage
  onMount(async () => {
    try {
      // Charger les familles de produits
      const familles = await familleProduitService.getFamillesRacines();
      familleProduits = familles;

      // Créer une map code -> id pour faciliter l'accès
      const map = new Map<string, string>();
      familles.forEach(famille => {
        map.set(famille.code, famille.id);
      });
      familleProduitsMap = map;
    } catch (err) {
      console.error('Erreur lors du chargement des familles de produits:', err);
      error = 'Erreur lors du chargement des familles de produits';
    } finally {
      // Charger les données de configuration
      loadConfiguration();
    }
  });
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold tracking-tight">
      <Translate key="retail_setup" module="configuration" fallback="Configuration des Produits et Services" />
    </h1>
    <p class="text-muted-foreground">
      <Translate
        key="retail_setup_description"
        module="configuration"
        fallback="Configurez les produits et services de votre station (boutique, lubrifiants, gaz, services)"
      />
    </p>
  </div>

  {#if loading}
    <div class="flex justify-center items-center h-64">
      <Spinner class="w-8 h-8" />
    </div>
  {:else if error}
    <div class="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
      <div class="flex items-center gap-2">
        <span class="font-medium">
          <Translate key="error" module="common" fallback="Erreur" />
        </span>
      </div>
      <p class="mt-2">{error}</p>
    </div>
  {:else}
    <!-- Section de progression -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Package class="w-5 h-5" />
          <Translate key="configuration_progress" module="configuration" fallback="Progression de la Configuration" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex items-center justify-between mb-2">
          <span>
            <Translate key="retail_configuration" module="configuration" fallback="Configuration des produits/services" />
          </span>
          <Badge variant={stationData?.config?.completion?.retail?.overall ? "default" : "secondary"}>
            {stationData?.config?.completion?.retail?.overall
              ? (get(i18nStore).resources?.configuration?.completed || 'Complété')
              : (get(i18nStore).resources?.configuration?.pending || 'En attente')}
          </Badge>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div
            class="bg-primary h-2.5 rounded-full"
            style="width: {stationData?.config?.completion?.retail?.overall ? '100%' : '30%'}"
          ></div>
        </div>
      </CardContent>
    </Card>

    <!-- Onglets pour les différentes catégories -->
    <Tabs value={activeTab} onValueChange={(value) => activeTab = value} class="w-full">
      <TabsList class="grid w-full grid-cols-4">
        <TabsTrigger value="boutique">
          <Package class="w-4 h-4 mr-2" />
          <Translate key="boutique" module="configuration" fallback="Boutique" />
        </TabsTrigger>
        <TabsTrigger value="lubrifiants">
          <Droplets class="w-4 h-4 mr-2" />
          <Translate key="lubrifiants" module="configuration" fallback="Lubrifiants" />
        </TabsTrigger>
        <TabsTrigger value="gaz">
          <Wind class="w-4 h-4 mr-2" />
          <Translate key="gaz" module="configuration" fallback="Gaz" />
        </TabsTrigger>
        <TabsTrigger value="services">
          <Wrench class="w-4 h-4 mr-2" />
          <Translate key="services" module="configuration" fallback="Services" />
        </TabsTrigger>
      </TabsList>

      <!-- Contenu des onglets -->
      <TabsContent value="boutique" class="space-y-6 mt-6">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                <Translate key="boutique_products" module="configuration" fallback="Produits de la Boutique" />
              </CardTitle>
              <CardDescription>
                <Translate key="boutique_products_description" module="configuration" fallback="Gérez les produits vendus dans la boutique de votre station" />
              </CardDescription>
            </div>
            <div class="flex gap-2">
              <Button variant="outline" onclick={selectFile}>
                <Upload class="w-4 h-4 mr-2" />
                <Translate key="import_excel" module="configuration" fallback="Importer Excel" />
              </Button>
              <Button onclick={addProduct}>
                <Plus class="w-4 h-4 mr-2" />
                <Translate key="add_product" module="configuration" fallback="Ajouter Produit" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b">
                    <th class="text-left py-2 px-4">
                      <Translate key="name" module="common" fallback="Nom" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="code" module="common" fallback="Code" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="barcode" module="configuration" fallback="Code-barres" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="purchase_price" module="common" fallback="Prix d'achat" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="sale_price" module="common" fallback="Prix de vente" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="stock" module="common" fallback="Stock" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="stock_threshold" module="configuration" fallback="Seuil d'alerte" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="description" module="common" fallback="Description" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="actions" module="common" fallback="Actions" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {#each products.filter(p => p.category === 'boutique') as product, index}
                    <tr class="border-b hover:bg-muted/50">
                      <td class="py-2 px-4">
                        <Input
                          bind:value={product.name}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_name_placeholder || 'Nom du produit'}
                          class={validateProduct(product.id).isValid && !hasDuplicate('name', product.name, index) ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          bind:value={product.code}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_code_placeholder || 'Code du produit'}
                          class={validateProduct(product.id).isValid && !hasDuplicate('code', product.code, index) ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          bind:value={product.barcode}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_barcode_placeholder || 'Code-barres'}
                          class={hasDuplicate('barcode', product.barcode, index) ? 'border-red-500' : ''}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.purchase_price}
                          placeholder="0.00"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.sale_price}
                          placeholder="0.00"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.stock}
                          placeholder="0"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.stock_threshold}
                          placeholder="5"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4" onkeydown={(e) => handleKeydown(e, index)}>
                        <Input
                          bind:value={product.description}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_description_placeholder || 'Description'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Button variant="destructive" onclick={() => removeProduct(product.id)} class="h-8 w-8 p-0">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </Button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>

              {#if products.filter(p => p.category === 'boutique').length === 0}
                <div class="text-center py-8 text-muted-foreground">
                  <Package class="w-12 h-12 mx-auto mb-4" />
                  <p>
                    <Translate key="no_products_yet" module="configuration" fallback="Aucun produit ajouté pour le moment" />
                  </p>
                  <p class="text-sm mt-2">
                    <Translate key="add_products_to_get_started" module="configuration" fallback="Ajoutez des produits pour commencer" />
                  </p>
                </div>
              {/if}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="lubrifiants" class="space-y-6 mt-6">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                <Translate key="lubricant_products" module="configuration" fallback="Produits Lubrifiants" />
              </CardTitle>
              <CardDescription>
                <Translate key="lubricant_products_description" module="configuration" fallback="Gérez les lubrifiants et produits pétroliers de votre station" />
              </CardDescription>
            </div>
            <div class="flex gap-2">
              <Button variant="outline" onclick={selectFile}>
                <Upload class="w-4 h-4 mr-2" />
                <Translate key="import_excel" module="configuration" fallback="Importer Excel" />
              </Button>
              <Button onclick={addProduct}>
                <Plus class="w-4 h-4 mr-2" />
                <Translate key="add_product" module="configuration" fallback="Ajouter Produit" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b">
                    <th class="text-left py-2 px-4">
                      <Translate key="name" module="common" fallback="Nom" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="code" module="common" fallback="Code" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="barcode" module="configuration" fallback="Code-barres" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="purchase_price" module="common" fallback="Prix d'achat" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="sale_price" module="common" fallback="Prix de vente" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="stock" module="common" fallback="Stock" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="stock_threshold" module="configuration" fallback="Seuil d'alerte" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="description" module="common" fallback="Description" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="actions" module="common" fallback="Actions" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {#each products.filter(p => p.category === 'lubrifiants') as product, index}
                    <tr class="border-b hover:bg-muted/50">
                      <td class="py-2 px-4">
                        <Input
                          bind:value={product.name}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_name_placeholder || 'Nom du produit'}
                          class={validateProduct(product.id).isValid && !hasDuplicate('name', product.name, index) ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          bind:value={product.code}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_code_placeholder || 'Code du produit'}
                          class={validateProduct(product.id).isValid && !hasDuplicate('code', product.code, index) ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          bind:value={product.barcode}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_barcode_placeholder || 'Code-barres'}
                          class={hasDuplicate('barcode', product.barcode, index) ? 'border-red-500' : ''}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.purchase_price}
                          placeholder="0.00"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.sale_price}
                          placeholder="0.00"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.stock}
                          placeholder="0"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.stock_threshold}
                          placeholder="5"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4" onkeydown={(e) => handleKeydown(e, index)}>
                        <Input
                          bind:value={product.description}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_description_placeholder || 'Description'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Button variant="destructive" onclick={() => removeProduct(product.id)} class="h-8 w-8 p-0">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </Button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>

              {#if products.filter(p => p.category === 'lubrifiants').length === 0}
                <div class="text-center py-8 text-muted-foreground">
                  <Droplets class="w-12 h-12 mx-auto mb-4" />
                  <p>
                    <Translate key="no_products_yet" module="configuration" fallback="Aucun produit ajouté pour le moment" />
                  </p>
                  <p class="text-sm mt-2">
                    <Translate key="add_products_to_get_started" module="configuration" fallback="Ajoutez des produits pour commencer" />
                  </p>
                </div>
              {/if}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="gaz" class="space-y-6 mt-6">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                <Translate key="gas_products" module="configuration" fallback="Produits Gaz" />
              </CardTitle>
              <CardDescription>
                <Translate key="gas_products_description" module="configuration" fallback="Gérez les produits gaz de votre station" />
              </CardDescription>
            </div>
            <div class="flex gap-2">
              <Button variant="outline" onclick={selectFile}>
                <Upload class="w-4 h-4 mr-2" />
                <Translate key="import_excel" module="configuration" fallback="Importer Excel" />
              </Button>
              <Button onclick={addProduct}>
                <Plus class="w-4 h-4 mr-2" />
                <Translate key="add_product" module="configuration" fallback="Ajouter Produit" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b">
                    <th class="text-left py-2 px-4">
                      <Translate key="name" module="common" fallback="Nom" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="code" module="common" fallback="Code" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="barcode" module="configuration" fallback="Code-barres" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="purchase_price" module="common" fallback="Prix d'achat" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="sale_price" module="common" fallback="Prix de vente" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="stock" module="common" fallback="Stock" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="stock_threshold" module="configuration" fallback="Seuil d'alerte" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="description" module="common" fallback="Description" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="actions" module="common" fallback="Actions" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {#each products.filter(p => p.category === 'gaz') as product, index}
                    <tr class="border-b hover:bg-muted/50">
                      <td class="py-2 px-4">
                        <Input
                          bind:value={product.name}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_name_placeholder || 'Nom du produit'}
                          class={validateProduct(product.id).isValid && !hasDuplicate('name', product.name, index) ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          bind:value={product.code}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_code_placeholder || 'Code du produit'}
                          class={validateProduct(product.id).isValid && !hasDuplicate('code', product.code, index) ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          bind:value={product.barcode}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_barcode_placeholder || 'Code-barres'}
                          class={hasDuplicate('barcode', product.barcode, index) ? 'border-red-500' : ''}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.purchase_price}
                          placeholder="0.00"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.sale_price}
                          placeholder="0.00"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.stock}
                          placeholder="0"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          bind:value={product.stock_threshold}
                          placeholder="5"
                          class={validateProduct(product.id).isValid ? '' : 'border-red-500'}
                        />
                      </td>
                      <td class="py-2 px-4" onkeydown={(e) => handleKeydown(e, index)}>
                        <Input
                          bind:value={product.description}
                          placeholder={get(i18nStore)?.resources?.configuration?.product_description_placeholder || 'Description'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Button variant="destructive" onclick={() => removeProduct(product.id)} class="h-8 w-8 p-0">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </Button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>

              {#if products.filter(p => p.category === 'gaz').length === 0}
                <div class="text-center py-8 text-muted-foreground">
                  <Wind class="w-12 h-12 mx-auto mb-4" />
                  <p>
                    <Translate key="no_products_yet" module="configuration" fallback="Aucun produit ajouté pour le moment" />
                  </p>
                  <p class="text-sm mt-2">
                    <Translate key="add_products_to_get_started" module="configuration" fallback="Ajoutez des produits pour commencer" />
                  </p>
                </div>
              {/if}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="services" class="space-y-6 mt-6">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                <Translate key="service_products" module="configuration" fallback="Services" />
              </CardTitle>
              <CardDescription>
                <Translate key="service_products_description" module="configuration" fallback="Gérez les services proposés par votre station" />
              </CardDescription>
            </div>
            <div class="flex gap-2">
              <Button variant="outline" onclick={selectFile}>
                <Upload class="w-4 h-4 mr-2" />
                <Translate key="import_excel" module="configuration" fallback="Importer Excel" />
              </Button>
              <Button onclick={addProduct}>
                <Plus class="w-4 h-4 mr-2" />
                <Translate key="add_service" module="configuration" fallback="Ajouter Service" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b">
                    <th class="text-left py-2 px-4">
                      <Translate key="name" module="common" fallback="Nom" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="code" module="common" fallback="Code" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="purchase_price" module="common" fallback="Prix d'achat" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="sale_price" module="common" fallback="Prix de vente" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="description" module="common" fallback="Description" />
                    </th>
                    <th class="text-left py-2 px-4">
                      <Translate key="actions" module="common" fallback="Actions" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {#each products.filter(p => p.category === 'services') as product, index}
                    <tr class="border-b hover:bg-muted/50">
                      <td class="py-2 px-4">
                        <Input
                          value={product.name}
                          oninput={(e) => updateProduct(index, 'name', e.currentTarget.value)}
                          placeholder={get(i18nStore)?.resources?.configuration?.service_name_placeholder || 'Nom du service'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          value={product.code}
                          oninput={(e) => updateProduct(index, 'code', e.currentTarget.value)}
                          placeholder={get(i18nStore)?.resources?.configuration?.service_code_placeholder || 'Code du service'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          value={product.purchase_price}
                          oninput={(e) => updateProduct(index, 'purchase_price', parseFloat(e.currentTarget.value) || 0)}
                          placeholder="0.00"
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          type="number"
                          value={product.sale_price}
                          oninput={(e) => updateProduct(index, 'sale_price', parseFloat(e.currentTarget.value) || 0)}
                          placeholder="0.00"
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Input
                          value={product.description}
                          oninput={(e) => updateProduct(index, 'description', e.currentTarget.value)}
                          onkeydown={(e) => handleLastFieldEnter(e, index)}
                          placeholder={get(i18nStore)?.resources?.configuration?.service_description_placeholder || 'Description'}
                        />
                      </td>
                      <td class="py-2 px-4">
                        <Button variant="destructive" onclick={() => removeProduct(product.id)} class="h-8 w-8 p-0">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </Button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>

              {#if products.filter(p => p.category === 'services').length === 0}
                <div class="text-center py-8 text-muted-foreground">
                  <Wrench class="w-12 h-12 mx-auto mb-4" />
                  <p>
                    <Translate key="no_services_yet" module="configuration" fallback="Aucun service ajouté pour le moment" />
                  </p>
                  <p class="text-sm mt-2">
                    <Translate key="add_services_to_get_started" module="configuration" fallback="Ajoutez des services pour commencer" />
                  </p>
                </div>
              {/if}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <!-- Section d'import -->
    <Card>
      <CardHeader>
        <CardTitle>
          <Translate key="import_products" module="configuration" fallback="Import de Produits/Services" />
        </CardTitle>
        <CardDescription>
          <Translate key="import_products_description" module="configuration" fallback="Importez vos produits et services via un fichier Excel" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-col sm:flex-row gap-4 items-center">
          <div class="flex-1">
            <p class="text-sm text-muted-foreground">
              <Translate key="import_template_info" module="configuration" fallback="Téléchargez un modèle Excel préformaté, complétez-le et importez-le pour ajouter plusieurs produits/services à la fois" />
            </p>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" onclick={downloadTemplate}>
              <Download class="w-4 h-4 mr-2" />
              <Translate key="download_template" module="configuration" fallback="Télécharger Modèle" />
            </Button>
            <Button variant="default" onclick={selectFile}>
              <Upload class="w-4 h-4 mr-2" />
              <Translate key="import_file" module="configuration" fallback="Importer Fichier" />
            </Button>
            <input
              type="file"
              id="excel-file-input"
              accept=".xlsx, .xls"
              class="hidden"
              onchange={handleFileSelect}
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Modale d'aperçu des données importées -->
    {#if importModalOpen}
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div class="bg-background rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <div class="p-6 flex-1 overflow-auto">
            <h3 class="text-lg font-semibold mb-4">
              <Translate key="import_preview" module="configuration" fallback="Aperçu de l'import" />
            </h3>

            {#if importErrors.length > 0}
              <div class="mb-6">
                <h4 class="font-medium text-destructive mb-2">
                  <Translate key="import_errors" module="configuration" fallback="Erreurs d'import" />
                </h4>
                <ul class="list-disc pl-5 space-y-1 max-h-40 overflow-auto">
                  {#each importErrors as error}
                    <li class="text-destructive">{error}</li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if importedData.length > 0}
              <div class="mb-6">
                <h4 class="font-medium mb-2">
                  <Translate key="imported_data" module="configuration" fallback="Données importées" />
                </h4>
                <div class="overflow-auto max-h-60">
                  <table class="w-full border">
                    <thead>
                      <tr class="bg-muted">
                        <th class="border p-2 text-left">
                          <Translate key="name" module="common" fallback="Nom" />
                        </th>
                        <th class="border p-2 text-left">
                          <Translate key="code" module="common" fallback="Code" />
                        </th>
                        <th class="border p-2 text-left">
                          <Translate key="category" module="common" fallback="Catégorie" />
                        </th>
                        <th class="border p-2 text-left">
                          <Translate key="purchase_price" module="common" fallback="Prix d'achat" />
                        </th>
                        <th class="border p-2 text-left">
                          <Translate key="sale_price" module="common" fallback="Prix de vente" />
                        </th>
                        <th class="border p-2 text-left">
                          <Translate key="stock" module="common" fallback="Stock" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each importedData as product, i}
                        <tr class="border-b hover:bg-muted/50">
                          <td class="border p-2">{product.name}</td>
                          <td class="border p-2">{product.code}</td>
                          <td class="border p-2">
                            {#if product.category === 'boutique'}
                              <Translate key="boutique" module="configuration" fallback="Boutique" />
                            {:else if product.category === 'lubrifiants'}
                              <Translate key="lubrifiants" module="configuration" fallback="Lubrifiants" />
                            {:else if product.category === 'gaz'}
                              <Translate key="gaz" module="configuration" fallback="Gaz" />
                            {:else if product.category === 'services'}
                              <Translate key="services" module="configuration" fallback="Services" />
                            {/if}
                          </td>
                          <td class="border p-2">{product.purchase_price}</td>
                          <td class="border p-2">{product.sale_price}</td>
                          <td class="border p-2">{product.stock}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            {/if}
          </div>

          <div class="p-4 border-t flex justify-end gap-2">
            <Button variant="outline" onclick={() => importModalOpen = false}>
              <Translate key="cancel" module="common" fallback="Annuler" />
            </Button>
            {#if importErrors.length === 0 && importedData.length > 0}
              <Button onclick={confirmImport}>
                <Translate key="confirm_import" module="configuration" fallback="Confirmer l'import" />
              </Button>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Boutons d'action -->
    <div class="flex justify-end gap-4 pt-6">
      <Button
        variant="outline"
        onclick={() => goto(`/dashboard/configuration/${stationId}`)}
      >
        <Translate key="back" module="common" fallback="Retour" />
      </Button>
      <Button
        variant="default"
        onclick={saveConfiguration}
        disabled={saving}
      >
        {#if saving}
          <Spinner class="w-4 h-4 mr-2" />
          <Translate key="saving" module="common" fallback="Enregistrement..." />
        {:else}
          <Translate key="save_configuration" module="configuration" fallback="Sauvegarder Configuration" />
        {/if}
      </Button>
    </div>
  {/if}
</div>