<script lang="ts">
  import { onMount } from 'svelte';
  import { configurationService, type ConfigurationState } from '$lib/services/ConfigurationService';
  import { stationService } from '$lib/services/StationService';
  import { fuelService, type StationFuelPrice, type Fuel } from '$lib/services/FuelService';
  import { tankService, type Tank } from '$lib/services/TankService';
  import { tankInitialStockService, type TankInitialStock } from '$lib/services/TankInitialStockService';
  import { formatCurrency, formatNumber, roundCurrency } from '$lib/utils/numbers';
  //import { getCurrentCurrency, getCurrentLocale } from '$lib/utils/locale';
  import { i18nStore } from '$lib/i18n';
  import Translate from '$lib/i18n/Translate.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '$lib/components/ui/accordion';
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import { Spinner } from '$lib/components/ui/spinner';
  import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  // Récupérer les données de la page
  let stationId = $state<string>('');
  let stationInfo = $state({ name: 'Station Inconnue', code: 'N/A', address: 'Adresse inconnue' });

  // États
  let loading = $state(false); // Initialisé à false pour éviter le spinner initial
  let error = $state<string | null>(null);

  // Charger les données depuis les données de layout
  $effect(() => {
    const unsubscribe = page.subscribe((data) => {
      if (data.data?.stationId && stationId !== data.data?.stationId) {
        stationId = data.data.stationId;
      }
      if (data.data?.station) {
        stationInfo = data.data.station;
      }
    });
    return unsubscribe;
  });
  let activeTab = $state('fuels');

  // Données de configuration d'infrastructure
  let stationFuels = $state<StationFuelPrice[]>([]);
  let availableFuels = $state<Fuel[]>([]);
  let tanks = $state<Tank[]>([]);
  let pumps = $state<any[]>([]);
  let initialStocks = $state<TankInitialStock[]>([]);

  // États pour le formulaire d'ajout de carburant
  let showAddFuelDialog = $state(false);
  let selectedFuelId = $state('');
  let purchasePrice = $state(0);
  let salePrice = $state(0);

  // États pour l'édition de carburant
  let editingFuel = $state<StationFuelPrice | null>(null);
  let editPurchasePrice = $state(0);
  let editSalePrice = $state(0);
  let showEditDialog = $state(false);

  // États pour le formulaire d'ajout de cuve
  let showAddTankDialog = $state(false);
  let tankName = $state('');
  let tankCode = $state('');
  let tankCapacity = $state(0);
  let selectedTankFuelId = $state<string | undefined>(undefined);
  let tankCalibrationInput = $state(''); // Pour le mode bulk
  let addTankError = $state<string | null>(null); // Erreur spécifique au dialogue d'ajout de cuve
  let addTankTabValue = $state('basic'); // Onglet actif pour le dialogue d'ajout de cuve

  // États pour gérer les points de barémage individuels
  let calibrationPoints = $state<{hauteur: number, volume: number}[]>([]);
  let currentCalibrationHeight = $state(0);
  let currentCalibrationVolume = $state(0);

  // États pour la gestion des stocks initiaux
  let selectedTankForStock = $state<string>('');
  let initialTankLevel = $state<string>('');
  let editingStock = $state<TankInitialStock | null>(null);
  let editInitialLevel = $state<string>('');
  let showEditStockDialog = $state(false);
  let showAddStockDialog = $state(false);

  // Fonctions pour réinitialiser les champs des dialogues
  function resetAddTankFields() {
    tankName = '';
    tankCode = '';
    tankCapacity = 0;
    selectedTankFuelId = undefined;
    calibrationPoints = [];
    currentCalibrationHeight = 0;
    currentCalibrationVolume = 0;
    tankCalibrationInput = '';
    addTankError = null;
  }

  function resetEditTankFields() {
    editTankName = '';
    editTankCode = '';
    editTankCapacity = 0;
    editSelectedTankFuelId = undefined;
    editCalibrationPoints = [];
    editCurrentCalibrationHeight = 0;
    editCurrentCalibrationVolume = 0;
    editTankCalibrationInput = '';
    editTankError = null;
  }
  
  // Charger les données
  async function loadData() {
    try {
      console.log('Tentative de chargement des données pour la station:', stationId);
      loading = true;

      // Charger les carburants de la station, les carburants disponibles et les cuves
      const [stationFuelsData, availableFuelsData, tanksData] = await Promise.all([
        fuelService.getStationFuelPrices(stationId),
        fuelService.getFuels(),
        tankService.getStationTanks(stationId)
      ]);

      stationFuels = stationFuelsData;
      availableFuels = availableFuelsData;
      tanks = tanksData;

      // Charger les états initiaux pour chaque cuve
      const initialStocksData: TankInitialStock[] = [];
      for (const tank of tanks) {
        try {
          const initialStock = await tankInitialStockService.getTankInitialStock(tank.id);
          initialStocksData.push(initialStock);
        } catch (err) {
          // Si l'état initial n'existe pas (404), on continue sans erreur
          // C'est normal et signifie que la cuve n'a pas encore d'état initial
          if ((err as any).status !== 404) {
            console.error(`Erreur lors du chargement de l'état initial pour la cuve ${tank.id}:`, err);
          }
        }
      }

      initialStocks = initialStocksData;

    } catch (err) {
      console.error('Erreur lors du chargement des données d\'infrastructure:', err);
      error = 'Impossible de charger les données d\'infrastructure: ' + (err as Error).message;

      // Données par défaut en cas d'erreur
      stationFuels = [];
      availableFuels = [];
    } finally {
      loading = false;
      console.log('Chargement terminé, loading:', loading);
    }
  }
  
  // Sauvegarder la configuration
  async function saveConfiguration() {
    try {
      if (!stationId) {
        throw new Error('ID de station manquant');
      }

      // Pour l'instant, on simule la sauvegarde en attendant les vrais endpoints
      console.log('Sauvegarde de la configuration d\'infrastructure pour la station:', stationId);
      console.log({ stationFuels, tanks, pumps, initialStocks });

      // Ici, vous appellerez réellement le service
      // await configurationService.saveInfrastructureConfig(stationId, { stationFuels, tanks, pumps, initialStocks });
      alert('Configuration sauvegardée avec succès (simulation)');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la configuration:', err);
      error = 'Erreur lors de la sauvegarde de la configuration: ' + (err as Error).message;
    }
  }
  
  // Charger les données au montage
  onMount(() => {
    console.log('Composant infrastructure monté avec stationId:', stationId);

    // Charger les données maintenant que l'ID est disponible via les props
    if (stationId) {
      loadData();
    } else {
      console.log('Aucun ID de station trouvé dans les props');
    }
  });

  // Effet pour réinitialiser les erreurs quand les dialogues s'ouvrent
  $effect(() => {
    if (showAddTankDialog) {
      addTankError = null;
      tankCalibrationInput = '';
      addTankTabValue = 'basic'; // Réinitialiser l'onglet actif
    }
  });

  $effect(() => {
    if (showEditTankDialog) {
      editTankError = null;
      editTankCalibrationInput = '';
      editTankTabValue = 'basic'; // Réinitialiser l'onglet actif
    }
  });

  // Fonction pour ajouter un carburant à la station
  async function addFuelToStation() {
    try {
      if (!selectedFuelId || purchasePrice <= 0 || salePrice <= 0) {
        throw new Error('Veuillez remplir tous les champs correctement');
      }

      // Vérifier que le prix d'achat est inférieur au prix de vente
      if (purchasePrice >= salePrice) {
        throw new Error('Le prix d\'achat doit être inférieur au prix de vente');
      }

      // Vérifier que le carburant n'est pas déjà ajouté à la station
      if (stationFuels.some(fuel => fuel.carburant_id === selectedFuelId)) {
        throw new Error('Ce carburant est déjà configuré pour cette station');
      }

      const newFuel = await fuelService.addFuelToStation({
        carburant_id: selectedFuelId,
        station_id: stationId,
        prix_achat: purchasePrice,
        prix_vente: salePrice
      });

      // Compléter les informations du nouveau carburant avec celles de la liste des carburants disponibles
      const availableFuel = availableFuels.find(f => f.id === selectedFuelId);
      const completeFuel = {
        ...newFuel,
        carburant_libelle: availableFuel?.libelle || '',
        carburant_code: availableFuel?.code || ''
      };

      // Ajouter le nouveau carburant à la liste
      stationFuels = [...stationFuels, completeFuel];

      // Réinitialiser le formulaire
      showAddFuelDialog = false;
      selectedFuelId = '';
      purchasePrice = 0;
      salePrice = 0;

      console.log('Carburant ajouté avec succès:', newFuel);
    } catch (err) {
      console.error('Erreur lors de l\'ajout du carburant:', err);
      error = 'Impossible d\'ajouter le carburant: ' + (err as Error).message;
    }
  }

  // Fonction pour mettre à jour les prix d'un carburant
  async function updateFuelPrice() {
    try {
      if (!editingFuel) {
        throw new Error('Aucun carburant à éditer');
      }

      // Vérifier que le prix d'achat est inférieur au prix de vente
      if (editPurchasePrice >= editSalePrice) {
        throw new Error('Le prix d\'achat doit être inférieur au prix de vente');
      }

      const updatedFuel = await fuelService.updateFuelPrice(
        editingFuel.carburant_id,
        stationId,
        {
          prix_achat: editPurchasePrice,
          prix_vente: editSalePrice
        }
      );

      // Mettre à jour le carburant dans la liste
      stationFuels = stationFuels.map(fuel =>
        fuel.id === updatedFuel.id ? updatedFuel : fuel
      );

      // Réinitialiser l'état d'édition
      showEditDialog = false;
      editingFuel = null;

      console.log('Carburant mis à jour avec succès:', updatedFuel);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du carburant:', err);
      error = 'Impossible de mettre à jour le carburant: ' + (err as Error).message;
    }
  }

  // Fonction pour supprimer un carburant de la station
  async function removeFuelFromStation(fuelId: string, stationFuelId: string) {
    try {
      await fuelService.removeFuelFromStation(fuelId, stationId);

      // Retirer le carburant de la liste
      stationFuels = stationFuels.filter(fuel => fuel.id !== stationFuelId);

      console.log('Carburant supprimé avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression du carburant:', err);
      error = 'Impossible de supprimer le carburant: ' + (err as Error).message;
    }
  }

  // États pour l'édition de cuve
  let editingTank = $state<Tank | null>(null);
  let editTankName = $state('');
  let editTankCode = $state('');
  let editTankCapacity = $state(0);
  let editSelectedTankFuelId = $state<string | undefined>(undefined);
  let editTankCalibrationInput = $state('');
  let editCalibrationPoints = $state<{hauteur: number, volume: number}[]>([]);
  let editCurrentCalibrationHeight = $state(0);
  let editCurrentCalibrationVolume = $state(0);
  let showEditTankDialog = $state(false);
  let editTankError = $state<string | null>(null); // Erreur spécifique au dialogue d'édition de cuve
  let editTankTabValue = $state('basic'); // Onglet actif pour le dialogue d'édition de cuve

  // Fonction pour mettre à jour une cuve
  async function updateTank() {
    try {
      if (!editingTank || !editTankName || !editTankCode || editTankCapacity <= 0 || !editSelectedTankFuelId) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      // Valider le barémage
      const validation = validateCalibrationPoints(editCalibrationPoints, editTankCapacity);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Barémage invalide');
      }

      // Convertir les points de barémage en format texte
      const calibrationText = JSON.stringify(editCalibrationPoints);

      const updatedTank = await tankService.updateTank(editingTank.id, {
        nom: editTankName,
        code: editTankCode,
        capacite_maximale: editTankCapacity,
        carburant_id: editSelectedTankFuelId,
        barremage: calibrationText
      });

      // Compléter les informations de carburant avec celles de la liste des carburants disponibles
      const fuel = stationFuels.find(f => f.carburant_id === updatedTank.carburant_id);
      const completeTank = {
        ...updatedTank,
        carburant: fuel ? {
          id: fuel.carburant_id,
          libelle: fuel.carburant_libelle,
          code: fuel.carburant_code
        } : null
      };

      // Mettre à jour la cuve dans la liste
      tanks = tanks.map(tank => tank.id === updatedTank.id ? completeTank : tank);

      // Réinitialiser l'état d'édition
      showEditTankDialog = false;
      editingTank = null;
      editTankError = null; // Réinitialiser l'erreur

      console.log('Cuve mise à jour avec succès:', updatedTank);
    } catch (err) {
      console.error('Erreur lors de la mise à jour de la cuve:', err);
      editTankError = (err as Error).message;
    }
  }

  // Fonction pour grouper les cuves par carburant
  function groupTanksByFuel() {
    const grouped: { [key: string]: Tank[] } = {};

    tanks.forEach(tank => {
      const fuelLabel = tank.carburant?.libelle || 'Autre';
      if (!grouped[fuelLabel]) {
        grouped[fuelLabel] = [];
      }
      grouped[fuelLabel].push(tank);
    });

    return grouped;
  }

  // Fonction pour supprimer une cuve
  async function removeTank(tankId: string) {
    try {
      await tankService.deleteTank(tankId);

      // Retirer la cuve de la liste
      tanks = tanks.filter(tank => tank.id !== tankId);

      console.log('Cuve supprimée avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression de la cuve:', err);
      // Pour la suppression, on peut utiliser l'erreur globale car elle affecte la liste générale
      error = 'Impossible de supprimer la cuve: ' + (err as Error).message;
    }
  }

  // Fonction utilitaire pour convertir le barémage en tableau de points
  function parseCalibrationData(barremage: any): {hauteur: number, volume: number}[] {
    try {
      if (!barremage) {
        return [];
      } else if (typeof barremage === 'string') {
        if (barremage === 'null' || barremage === 'undefined' || barremage === '') {
          return [];
        }
        return sortCalibrationPoints(JSON.parse(barremage) || []);
      } else if (Array.isArray(barremage)) {
        return sortCalibrationPoints(barremage);
      } else if (typeof barremage === 'object') {
        // Si c'est un objet, on le convertit en tableau
        const barremageObj: any = barremage;
        return sortCalibrationPoints(Object.keys(barremageObj).map(key => ({
          hauteur: parseFloat(key),
          volume: parseFloat(barremageObj[key])
        })).filter(item => !isNaN(item.hauteur) && !isNaN(item.volume)));
      } else {
        return [];
      }
    } catch (e) {
      console.error('Erreur de parsing du barémage:', e);
      return [];
    }
  }

  // Fonction pour vérifier si le barémage est valide
  function isCalibrationValid(tank: Tank): { isValid: boolean, status: string, message: string } {
    if (!tank.barremage) {
      return { isValid: false, status: 'KO', message: 'Aucun barémage défini' };
    }

    const points = parseCalibrationData(tank.barremage);

    if (points.length === 0) {
      return { isValid: false, status: 'KO', message: 'Aucun point de barémage' };
    }

    if (points.length < 2) {
      return { isValid: false, status: 'KO', message: 'Moins de 2 points de barémage' };
    }

    // Vérifier si un point atteint ou dépasse la capacité maximale
    const maxCapacity = tank.capacite_maximale;
    const hasPointAtMaxCapacity = points.some(point => point.volume >= maxCapacity);

    if (!hasPointAtMaxCapacity) {
      return { isValid: false, status: 'KO', message: 'Aucun point atteignant la capacité maximale' };
    }

    // Vérifier que les volumes sont cohérents (croissants avec la hauteur)
    const inconsistentIndices = findInconsistentCalibrationPoints(points);
    if (inconsistentIndices.length > 0) {
      return { isValid: false, status: 'KO', message: get(i18nStore).resources?.configuration?.inconsistent_calibrations || 'Points de barémage incohérents détectés' };
    }

    return { isValid: true, status: 'OK', message: 'Barémage valide' };
  }

  // Fonction pour valider le barémage
  function validateCalibrationPoints(points: {hauteur: number, volume: number}[], maxCapacity: number): { isValid: boolean, error?: string } {
    if (points.length === 0) {
      return { isValid: true }; // Pas de barémage est acceptable
    }

    // Trier les points par hauteur
    const sortedPoints = [...points].sort((a, b) => a.hauteur - b.hauteur);

    // Vérifier que les volumes augmentent avec la hauteur
    for (let i = 1; i < sortedPoints.length; i++) {
      if (sortedPoints[i].volume <= sortedPoints[i - 1].volume) {
        const message = get(i18nStore).resources?.configuration?.volume_must_be_greater;
        if (message && typeof message === 'string') {
          return {
            isValid: false,
            error: message.replace('{height1}', sortedPoints[i].hauteur.toString()).replace('{height2}', sortedPoints[i - 1].hauteur.toString())
          };
        } else {
          return {
            isValid: false,
            error: `Le volume à la hauteur ${sortedPoints[i].hauteur} doit être supérieur au volume à la hauteur ${sortedPoints[i - 1].hauteur}`
          };
        }
      }
    }

    // Vérifier que la capacité maximale est atteinte
    const maxVolume = Math.max(...sortedPoints.map(p => p.volume));
    if (maxVolume < maxCapacity) {
      const message = get(i18nStore).resources?.configuration?.max_volume_not_reached;
      if (message && typeof message === 'string') {
        return {
          isValid: false,
          error: message.replace('{max_volume}', maxVolume.toString()).replace('{tank_capacity}', maxCapacity.toString())
        };
      } else {
        return {
          isValid: false,
          error: `Le volume maximum du barémage (${maxVolume} L) ne atteint pas la capacité maximale de la cuve (${maxCapacity} L)`
        };
      }
    }

    return { isValid: true };
  }

  // Fonction pour ajouter une cuve à la station
  async function addTankToStation() {
    try {
      if (!tankName || !tankCode || tankCapacity <= 0 || !selectedTankFuelId) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      // Valider le barémage
      const validation = validateCalibrationPoints(calibrationPoints, tankCapacity);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Barémage invalide');
      }

      // Convertir les points de barémage en format texte (JSON dans une chaîne)
      const calibrationText = JSON.stringify(calibrationPoints);

      const newTank = await tankService.createTank(stationId, {
        nom: tankName,
        code: tankCode,
        capacite_maximale: tankCapacity,
        carburant_id: selectedTankFuelId,
        barremage: calibrationText
      });

      // Compléter les informations de carburant avec celles de la liste des carburants disponibles
      const fuel = stationFuels.find(f => f.carburant_id === newTank.carburant_id);
      const completeTank = {
        ...newTank,
        carburant: fuel ? {
          id: fuel.carburant_id,
          libelle: fuel.carburant_libelle,
          code: fuel.carburant_code
        } : null
      };

      // Ajouter la nouvelle cuve à la liste
      tanks = [...tanks, completeTank];

      // Réinitialiser le formulaire
      showAddTankDialog = false;
      tankName = '';
      tankCode = '';
      tankCapacity = 0;
      selectedTankFuelId = undefined;
      tankCalibrationInput = '';
      calibrationPoints = [];
      addTankError = null; // Réinitialiser l'erreur

      console.log('Cuve ajoutée avec succès:', newTank);
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la cuve:', err);
      addTankError = (err as Error).message;
    }
  }

  // Fonction utilitaire pour trier les points de barémage par hauteur
  function sortCalibrationPoints(points: {hauteur: number, volume: number}[]) {
    return [...points].sort((a, b) => a.hauteur - b.hauteur);
  }

  // Fonction pour identifier les points de barémage incohérents
  function findInconsistentCalibrationPoints(points: {hauteur: number, volume: number}[]): number[] {
    if (points.length <= 1) {
      return []; // Pas de comparaison possible avec 0 ou 1 point
    }

    const inconsistentIndices: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const previous = i > 0 ? points[i - 1] : null;
      const next = i < points.length - 1 ? points[i + 1] : null;

      // Vérifier si le volume actuel est inférieur au volume précédent (alors qu'il devrait être ≥)
      if (previous && current.volume < previous.volume) {
        inconsistentIndices.push(i);
      }
      // Vérifier si le volume actuel est supérieur au volume suivant (alors qu'il devrait être ≤)
      else if (next && current.volume > next.volume) {
        inconsistentIndices.push(i);
      }
    }

    return inconsistentIndices;
  }

  // Fonction pour ajouter un point de barémage individuel
  function addCalibrationPoint() {
    if (currentCalibrationHeight < 0 || currentCalibrationVolume < 0) {
      addTankError = 'Les valeurs de hauteur et volume doivent être positives';
      return;
    }

    // Vérifier qu'il n'y a pas déjà un point avec cette hauteur
    if (calibrationPoints.some(p => p.hauteur === currentCalibrationHeight)) {
      addTankError = `Il existe déjà un point de barémage pour la hauteur ${currentCalibrationHeight}`;
      return;
    }

    // Ajouter le point au tableau et trier
    calibrationPoints = sortCalibrationPoints([
      ...calibrationPoints, {
        hauteur: currentCalibrationHeight,
        volume: currentCalibrationVolume
      }
    ]);

    // Réinitialiser les champs
    currentCalibrationHeight = 0;
    currentCalibrationVolume = 0;
    addTankError = null;
  }

  // Fonction pour supprimer un point de barémage
  function removeCalibrationPoint(index: number) {
    calibrationPoints = sortCalibrationPoints(calibrationPoints.filter((_, i) => i !== index));
  }

  // Fonction pour traiter l'ajout en mode bulk
  function addCalibrationBulk() {
    if (!tankCalibrationInput.trim()) {
      addTankError = 'Veuillez entrer des données de barémage';
      return;
    }

    const lines = tankCalibrationInput.trim().split('\n');
    const newPoints = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [heightStr, volumeStr] = line.split(/\s+/);
      const height = parseFloat(heightStr);
      const volume = parseFloat(volumeStr);

      if (isNaN(height) || isNaN(volume)) {
        addTankError = `Ligne ${i + 1} invalide: '${line}'. Format attendu: 'hauteur volume'`;
        return;
      }

      if (height < 0 || volume < 0) {
        addTankError = `Ligne ${i + 1}: Les valeurs doivent être positives`;
        return;
      }

      // Vérifier qu'il n'y a pas déjà un point avec cette hauteur
      if (calibrationPoints.some(p => p.hauteur === height)) {
        addTankError = `Hauteur ${height} déjà présente dans le barémage`;
        return;
      }

      newPoints.push({ hauteur: height, volume: volume });
    }

    // Ajouter les nouveaux points et trier
    calibrationPoints = sortCalibrationPoints([...calibrationPoints, ...newPoints]);
    tankCalibrationInput = '';
    addTankError = null;
  }

  // Fonctions pour édition des points de barémage
  function addEditCalibrationPoint() {
    if (editCurrentCalibrationHeight < 0 || editCurrentCalibrationVolume < 0) {
      editTankError = 'Les valeurs de hauteur et volume doivent être positives';
      return;
    }

    // Vérifier qu'il n'y a pas déjà un point avec cette hauteur
    if (editCalibrationPoints.some(p => p.hauteur === editCurrentCalibrationHeight)) {
      editTankError = `Il existe déjà un point de barémage pour la hauteur ${editCurrentCalibrationHeight}`;
      return;
    }

    // Ajouter le point au tableau et trier
    editCalibrationPoints = sortCalibrationPoints([
      ...editCalibrationPoints, {
        hauteur: editCurrentCalibrationHeight,
        volume: editCurrentCalibrationVolume
      }
    ]);

    // Réinitialiser les champs
    editCurrentCalibrationHeight = 0;
    editCurrentCalibrationVolume = 0;
    editTankError = null;
  }

  // Fonction pour supprimer un point de barémage en édition
  function removeEditCalibrationPoint(index: number) {
    editCalibrationPoints = sortCalibrationPoints(editCalibrationPoints.filter((_, i) => i !== index));
  }

  // Fonction pour traiter l'ajout en mode bulk en édition
  function addEditCalibrationBulk() {
    if (!editTankCalibrationInput.trim()) {
      editTankError = 'Veuillez entrer des données de barémage';
      return;
    }

    const lines = editTankCalibrationInput.trim().split('\n');
    const newPoints = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [heightStr, volumeStr] = line.split(/\s+/);
      const height = parseFloat(heightStr);
      const volume = parseFloat(volumeStr);

      if (isNaN(height) || isNaN(volume)) {
        editTankError = `Ligne ${i + 1} invalide: '${line}'. Format attendu: 'hauteur volume'`;
        return;
      }

      if (height < 0 || volume < 0) {
        editTankError = `Ligne ${i + 1}: Les valeurs doivent être positives`;
        return;
      }

      // Vérifier qu'il n'y a pas déjà un point avec cette hauteur
      if (editCalibrationPoints.some(p => p.hauteur === height)) {
        editTankError = `Hauteur ${height} déjà présente dans le barémage`;
        return;
      }

      newPoints.push({ hauteur: height, volume: volume });
    }

    // Ajouter les nouveaux points et trier
    editCalibrationPoints = sortCalibrationPoints([...editCalibrationPoints, ...newPoints]);
    editTankCalibrationInput = '';
    editTankError = null;
  }

  // Fonction pour initialiser un stock pour une cuve
  async function addInitialStock() {
    try {
      // Vérifier que les champs sont valides
      if (!selectedTankForStock) {
        throw new Error(get(i18nStore).resources?.configuration?.select_tank || 'Veuillez sélectionner une cuve');
      }

      // Convertir en nombre et vérifier la validité
      const levelValue = Number(initialTankLevel);
      if (isNaN(levelValue) || levelValue < 0) {
        throw new Error(get(i18nStore).resources?.configuration?.invalid_initial_level || 'Veuillez entrer un niveau initial valide');
      }

      // Vérifier que la cuve n'a pas déjà un stock initial
      if (initialStocks.some(stock => stock.cuve_id === selectedTankForStock)) {
        throw new Error(get(i18nStore).resources?.configuration?.tank_already_has_initial_stock || 'Cette cuve a déjà un stock initial');
      }

      const requestData = {
        hauteur_jauge_initiale: levelValue
      };

      const newInitialStock = await tankInitialStockService.createTankInitialStock(selectedTankForStock, requestData);

      // Ajouter le nouvel état initial à la liste
      initialStocks = [...initialStocks, newInitialStock];

      // Réinitialiser le formulaire
      selectedTankForStock = '';
      initialTankLevel = '';

      console.log('Stock initial ajouté avec succès:', newInitialStock);
    } catch (err) {
      console.error('Erreur lors de l\'ajout du stock initial:', err);
      error = 'Impossible d\'ajouter le stock initial: ' + (err as Error).message;
    }
  }

  // Fonction pour préparer l'édition d'un stock initial
  function prepareEditStock(stock: TankInitialStock) {
    editingStock = stock;
    editInitialLevel = stock.hauteur_jauge_initiale.toString();
    showEditStockDialog = true;
  }

  // Fonction pour modifier le stock initial d'une cuve
  async function updateInitialStock() {
    try {
      if (!editingStock) {
        throw new Error(get(i18nStore).resources?.configuration?.invalid_initial_level || 'Aucun stock à éditer');
      }

      // Convertir en nombre et vérifier la validité
      const levelValue = Number(editInitialLevel);
      if (isNaN(levelValue) || levelValue < 0) {
        throw new Error(get(i18nStore).resources?.configuration?.invalid_initial_level || 'Veuillez entrer un niveau initial valide');
      }

      const requestData = {
        hauteur_jauge_initiale: levelValue
      };

      const updatedStock = await tankInitialStockService.updateTankInitialStock(editingStock.cuve_id, requestData);

      // Mettre à jour la liste des stocks initiaux en préservant les données imbriquées
      // Si la mise à jour ne retourne pas la structure complète, on préserve les données existantes
      initialStocks = initialStocks.map(stock => {
        if (stock.id === updatedStock.id) {
          // On fusionne les données de la mise à jour avec les données existantes
          return {
            ...stock, // Conserver les données existantes (y compris cuve et cuve.carburant)
            ...updatedStock // Mettre à jour avec les nouvelles données de la réponse API
          };
        }
        return stock;
      });

      console.log('Stock initial mis à jour avec succès:', updatedStock);
    } catch (err) {
      console.error('Erreur lors de la mise à jour du stock initial:', err);
      error = 'Impossible de mettre à jour le stock initial: ' + (err as Error).message;
    } finally {
      // Toujours fermer la boîte de dialogue, même en cas d'erreur
      showEditStockDialog = false;
      editingStock = null;
    }
  }

  // Fonction pour supprimer un stock initial
  async function removeInitialStock(stockId: string, tankId: string) {
    try {
      await tankInitialStockService.deleteTankInitialStock(tankId);

      // Retirer le stock initial de la liste
      initialStocks = initialStocks.filter(stock => stock.id !== stockId);

      console.log('Stock initial supprimé avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression du stock initial:', err);
      error = 'Impossible de supprimer le stock initial: ' + (err as Error).message;
    }
  }

  // Fonction pour calculer la valorisation financière d'un stock initial
  function calculateValuation(stock: TankInitialStock): number {
    // Trouver le prix d'achat du carburant de cette cuve
    const fuelId = stock.cuve?.carburant?.id;
    const stationFuel = stationFuels.find(f => f.carburant_id === fuelId);

    if (!stationFuel || !stock.volume_initial_calcule) {
      return 0; // Retourner 0 si aucune donnée n'est disponible
    }

    // Calculer la valorisation: volume * prix d'achat
    const valuation = stock.volume_initial_calcule * stationFuel.prix_achat;
    // Utiliser l'utilitaire d'arrondi monétaire
    return roundCurrency(valuation);
  }
</script>

<div class="space-y-6">
  <!-- Carte d'identification de la station -->
  {#if stationInfo}
    <Card class="border-primary/30 bg-primary/5">
      <CardHeader class="flex flex-row items-center justify-between space-x-4">
        <div class="flex flex-row items-center space-x-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
            ⛽
          </div>
          <div>
            <CardTitle class="text-lg">
              {get(i18nStore).resources?.configuration?.current_station
                ? get(i18nStore).resources?.configuration?.current_station.replace('{stationName}', stationInfo.name || 'Station Inconnue')
                : `Station: ${stationInfo.name || 'Station Inconnue'}`}
            </CardTitle>
            <p class="text-sm text-muted-foreground">
              <Translate key="code" module="common" fallback="Code" />: {stationInfo.code || 'N/A'} | {stationInfo.address || 'Adresse inconnue'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onclick={() => goto(`/dashboard/configuration/${stationId}`)}
          class="flex flex-row items-center space-x-2"
        >
          ←
          <Translate key="back_to_general_config" module="configuration" fallback="Retour config générale" />
        </Button>
      </CardHeader>
    </Card>
  {/if}

  <div>
    <h1 class="text-3xl font-bold tracking-tight">
      <Translate key="infrastructure_setup" module="configuration" fallback="Configuration Infrastructure" />
    </h1>
    <p class="text-muted-foreground">
      <Translate
        key="fuel_tanks_pumps_setup"
        module="configuration"
        fallback="Configurez les carburants, cuves et pompes de votre station"
      />
    </p>
  </div>

  {#if loading}
    <div class="flex justify-center items-center h-64">
      <Spinner class="w-8 h-8" />
    </div>
  {:else if error}
    <div class="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
      {error}
    </div>
  {:else}
    <Tabs bind:value={activeTab}>
      <TabsList class="grid w-full grid-cols-4">
        <TabsTrigger value="fuels">
          <Translate key="fuels" module="configuration" fallback="Carburants" />
        </TabsTrigger>
        <TabsTrigger value="tanks">
          <Translate key="tanks" module="configuration" fallback="Cuves" />
        </TabsTrigger>
        <TabsTrigger value="pumps">
          <Translate key="pumps" module="configuration" fallback="Pompes" />
        </TabsTrigger>
        <TabsTrigger value="stocks">
          <Translate key="initial_stocks" module="configuration" fallback="Stocks Initiaux" />
        </TabsTrigger>
      </TabsList>
      
      <!-- Onglet Carburants -->
      <TabsContent value="fuels" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Translate key="fuels" module="configuration" fallback="Carburants" />
            </CardTitle>
            <CardDescription>
              <Translate
                key="manage_fuels"
                module="configuration"
                fallback="Gérez les types de carburant vendus et leurs prix"
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              {#each stationFuels as fuel (fuel.id)}
                <Card class="p-4">
                  <div class="grid grid-cols-4 gap-4 items-center">
                    <div>
                      <Label>
                        <Translate key="fuel_type" module="configuration" fallback="Type" />
                      </Label>
                      <p class="font-medium">{fuel.carburant_libelle}</p>
                      <p class="text-sm text-muted-foreground">{fuel.carburant_code}</p>
                    </div>
                    <div>
                      <Label>
                        <Translate key="purchase_price" module="configuration" fallback="Prix d'achat" />
                      </Label>
                      <p>{formatCurrency(fuel.prix_achat)}</p>
                    </div>
                    <div>
                      <Label>
                        <Translate key="sale_price" module="configuration" fallback="Prix de vente" />
                      </Label>
                      <p>{formatCurrency(fuel.prix_vente)}</p>
                    </div>
                    <div class="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => {
                          editingFuel = fuel;
                          editPurchasePrice = fuel.prix_achat;
                          editSalePrice = fuel.prix_vente;
                          showEditDialog = true;
                        }}
                      >
                        <Translate key="edit" module="common" fallback="Éditer" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        class="text-destructive border-destructive"
                        onclick={() => removeFuelFromStation(fuel.carburant_id, fuel.id)}
                      >
                        <Translate key="delete" module="common" fallback="Supprimer" />
                      </Button>
                    </div>
                  </div>
                </Card>
              {/each}

              <Dialog bind:open={showAddFuelDialog}>
                <DialogTrigger>
                  <Button class="w-full">
                    <Translate key="add_fuel" module="configuration" fallback="Ajouter un carburant" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      <Translate key="add_fuel" module="configuration" fallback="Ajouter un carburant" />
                    </DialogTitle>
                    <DialogDescription>
                      <Translate
                        key="add_fuel_description"
                        module="configuration"
                        fallback="Sélectionnez un carburant à ajouter à cette station"
                      />
                    </DialogDescription>
                  </DialogHeader>
                  <div class="space-y-4 py-4">
                    <div class="space-y-2">
                      <Label for="fuelSelect">
                        <Translate key="fuel_type" module="configuration" fallback="Type de carburant" />
                      </Label>
                      <Select.Root
                        type="single"
                        bind:value={selectedFuelId}
                      >
                        <Select.Trigger id="fuelSelect">
                          <span data-slot="select-value">
                            {selectedFuelId
                              ? availableFuels.find(f => f.id === selectedFuelId)?.libelle + ' (' + availableFuels.find(f => f.id === selectedFuelId)?.code + ')'
                              : get(i18nStore).resources?.configuration?.select_fuel_placeholder || 'Sélectionnez un carburant'}
                          </span>
                        </Select.Trigger>
                        <Select.Content>
                          {#each availableFuels.filter(f => !stationFuels.some(sf => sf.carburant_id === f.id)) as fuel}
                            <Select.Item value={fuel.id}>
                              {fuel.libelle} ({fuel.code})
                            </Select.Item>
                          {/each}
                        </Select.Content>
                      </Select.Root>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-2">
                        <Label for="purchasePrice">
                          <Translate key="purchase_price" module="configuration" fallback="Prix d'achat" />
                        </Label>
                        <Input
                          id="purchasePrice"
                          type="number"
                          bind:value={purchasePrice}
                          placeholder="0"
                        />
                      </div>

                      <div class="space-y-2">
                        <Label for="salePrice">
                          <Translate key="sale_price" module="configuration" fallback="Prix de vente" />
                        </Label>
                        <Input
                          id="salePrice"
                          type="number"
                          bind:value={salePrice}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onclick={() => {
                        showAddFuelDialog = false;
                        selectedFuelId = '';
                        purchasePrice = 0;
                        salePrice = 0;
                      }}
                    >
                      <Translate key="cancel" module="common" fallback="Annuler" />
                    </Button>
                    <Button
                      onclick={addFuelToStation}
                      disabled={!selectedFuelId || purchasePrice <= 0 || salePrice <= 0 || purchasePrice >= salePrice || stationFuels.some(fuel => fuel.carburant_id === selectedFuelId)}
                    >
                      <Translate key="add" module="common" fallback="Ajouter" />
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <!-- Dialog pour l'édition de carburant -->
        <Dialog bind:open={showEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <Translate key="edit_fuel" module="configuration" fallback="Éditer le carburant" />
              </DialogTitle>
              <DialogDescription>
                {editingFuel?.carburant_libelle} {editingFuel?.carburant_code ? `(${editingFuel?.carburant_code})` : ''}
              </DialogDescription>
            </DialogHeader>
            <div class="space-y-4 py-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="editPurchasePrice">
                    <Translate key="purchase_price" module="configuration" fallback="Prix d'achat" />
                  </Label>
                  <Input
                    id="editPurchasePrice"
                    type="number"
                    bind:value={editPurchasePrice}
                    placeholder="0"
                  />
                </div>

                <div class="space-y-2">
                  <Label for="editSalePrice">
                    <Translate key="sale_price" module="configuration" fallback="Prix de vente" />
                  </Label>
                  <Input
                    id="editSalePrice"
                    type="number"
                    bind:value={editSalePrice}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div class="flex justify-end space-x-2">
              <Button
                variant="outline"
                onclick={() => {
                  showEditDialog = false;
                  editingFuel = null;
                }}
              >
                <Translate key="cancel" module="common" fallback="Annuler" />
              </Button>
              <Button
                onclick={updateFuelPrice}
                disabled={!editingFuel || editPurchasePrice <= 0 || editSalePrice <= 0 || editPurchasePrice >= editSalePrice}
              >
                <Translate key="save" module="common" fallback="Sauvegarder" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TabsContent>
      
      <!-- Onglet Cuves -->
      <TabsContent value="tanks" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Translate key="tanks" module="configuration" fallback="Cuves" />
            </CardTitle>
            <CardDescription>
              <Translate
                key="manage_tanks"
                module="configuration"
                fallback="Configurez les cuves de stockage de carburant"
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              {#if stationFuels.length === 0}
                <div class="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
                  <Translate key="tank_requires_fuels" module="configuration" fallback="Veuillez ajouter des carburants avant de créer des cuves" />
                </div>
              {:else}
                {@const groupedTanks = groupTanksByFuel()}
                {@const fuelTypes = Object.keys(groupedTanks).sort()}
                {#each fuelTypes as fuelType}
                  <div class="mb-6">
                    <h3 class="text-lg font-semibold mb-3 ml-2">
                      {fuelType}
                      <span class="text-sm text-muted-foreground ml-2">({groupedTanks[fuelType].length} cuve{groupedTanks[fuelType].length > 1 ? 's' : ''})</span>
                    </h3>
                    {#each groupedTanks[fuelType] as tank (tank.id)}
                      <Card class="p-4 mb-2">
                        <div class="grid grid-cols-5 gap-4 items-center">
                          <div>
                            <Label>
                              <Translate key="code" module="common" fallback="Code" />
                            </Label>
                            <p class="font-medium">{tank.code}</p>
                          </div>
                          <div>
                            <Label>
                              <Translate key="name" module="common" fallback="Nom" />
                            </Label>
                            <p>{tank.nom}</p>
                          </div>
                          <div>
                            <Label>
                              <Translate key="capacity" module="configuration" fallback="Capacité" />
                            </Label>
                            <p>{formatNumber(tank.capacite_maximale, 0)} L</p>
                          </div>
                          <div>
                            <Label>
                              <Translate key="calibration_status" module="configuration" fallback="Statut barémage" />
                            </Label>
                            <div>
                              {#if isCalibrationValid(tank).isValid}
                                <Badge variant="default">OK</Badge>
                              {:else}
                                <Badge variant="destructive">KO</Badge>
                              {/if}
                            </div>
                          </div>
                          <div class="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onclick={() => {
                                editingTank = tank;
                                editTankName = tank.nom;
                                editTankCode = tank.code;
                                editTankCapacity = tank.capacite_maximale;
                                editSelectedTankFuelId = tank.carburant_id;

                                // Charger le barémage existant
                                editCalibrationPoints = parseCalibrationData(tank.barremage);

                                showEditTankDialog = true;
                              }}
                            >
                              <Translate key="edit" module="common" fallback="Éditer" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              class="text-destructive border-destructive"
                              onclick={() => removeTank(tank.id)}
                            >
                              <Translate key="delete" module="common" fallback="Supprimer" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    {/each}
                  </div>
                {/each}

                <Dialog bind:open={showAddTankDialog}>
                  <DialogTrigger>
                    <Button class="w-full" disabled={stationFuels.length === 0}>
                      <Translate key="add_tank" module="configuration" fallback="Ajouter une cuve" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent class="sm:max-w-2xl md:max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>
                        <Translate key="add_tank" module="configuration" fallback="Ajouter une cuve" />
                      </DialogTitle>
                      <DialogDescription>
                        <Translate
                          key="manage_tanks"
                          module="configuration"
                          fallback="Configurez les cuves de stockage de carburant"
                        />
                      </DialogDescription>
                    </DialogHeader>
                    <div class="py-4">
                      {#if addTankError}
                        <div class="bg-destructive/10 border border-destructive text-destructive p-3 rounded-md text-sm mb-4">
                          {addTankError}
                        </div>
                      {/if}

                      <Tabs value={addTankTabValue} onValueChange={(value) => addTankTabValue = value} class="w-full">
                        <TabsList class="grid w-full grid-cols-2">
                          <TabsTrigger value="basic">
                            <Translate key="basic_info" module="configuration" fallback="Informations de base" />
                          </TabsTrigger>
                          <TabsTrigger value="calibration">
                            <Translate key="tank_calibration" module="configuration" fallback="Barémage" />
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" class="space-y-4 mt-4">
                          <div class="space-y-4">
                            <div class="space-y-2">
                              <Label for="tankName">
                                <Translate key="tank_name" module="configuration" fallback="Nom de la cuve" />
                              </Label>
                              <Input
                                id="tankName"
                                bind:value={tankName}
                                placeholder={get(i18nStore).resources?.configuration?.tank_name || 'Nom de la cuve'}
                              />
                            </div>

                            <div class="space-y-2">
                              <Label for="tankCode">
                                <Translate key="tank_code" module="configuration" fallback="Code de la cuve" />
                              </Label>
                              <Input
                                id="tankCode"
                                bind:value={tankCode}
                                placeholder={get(i18nStore).resources?.configuration?.tank_code || 'Code de la cuve'}
                              />
                            </div>

                            <div class="space-y-2">
                              <Label for="tankCapacity">
                                <Translate key="tank_capacity" module="configuration" fallback="Capacité maximale (L)" />
                              </Label>
                              <Input
                                id="tankCapacity"
                                type="number"
                                bind:value={tankCapacity}
                                placeholder="0"
                              />
                            </div>

                            <div class="space-y-2">
                              <Label for="tankFuel">
                                <Translate key="tank_fuel" module="configuration" fallback="Carburant" />
                              </Label>
                              <Select.Root
                                type="single"
                                bind:value={selectedTankFuelId}
                              >
                                <Select.Trigger id="tankFuel">
                                  <span data-slot="select-value">
                                    {selectedTankFuelId
                                      ? stationFuels.find(f => f.carburant_id === selectedTankFuelId)?.carburant_libelle + ' (' + stationFuels.find(f => f.carburant_id === selectedTankFuelId)?.carburant_code + ')'
                                      : get(i18nStore).resources?.configuration?.select_fuel_placeholder || 'Sélectionnez un carburant'}
                                  </span>
                                </Select.Trigger>
                                <Select.Content>
                                  {#each stationFuels as fuel}
                                    <Select.Item value={fuel.carburant_id}>
                                      {fuel.carburant_libelle} ({fuel.carburant_code}) - {formatCurrency(fuel.prix_achat)}/{formatCurrency(fuel.prix_vente)}
                                    </Select.Item>
                                  {/each}
                                </Select.Content>
                              </Select.Root>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="calibration" class="space-y-4 mt-4">
                          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Colonne gauche - Saisie individuelle et en bloc -->
                            <div class="space-y-4">
                              <Label>
                                <Translate key="tank_calibration" module="configuration" fallback="Barémage" />
                              </Label>
                              <p class="text-sm text-muted-foreground">
                                <Translate key="calibration_help" module="configuration" fallback="Le barémage est utilisé pour le calcul des jauges Hauteur - Volume. Fournissez les valeurs au format 'Hauteur Volume' par ligne. Nécessite des mesures jusqu'à la capacité maximale." />
                              </p>

                              <!-- Formulaire pour ajouter un point individuel -->
                              <div class="grid grid-cols-2 gap-2">
                                <div class="space-y-1">
                                  <Label for="calibrationHeight">
                                    <Translate key="height" module="configuration" fallback="Hauteur" />
                                  </Label>
                                  <Input
                                    id="calibrationHeight"
                                    type="number"
                                    bind:value={currentCalibrationHeight}
                                    placeholder="0"
                                    class="h-8"
                                  />
                                </div>
                                <div class="space-y-1">
                                  <Label for="calibrationVolume">
                                    <Translate key="volume" module="configuration" fallback="Volume" />
                                  </Label>
                                  <Input
                                    id="calibrationVolume"
                                    type="number"
                                    bind:value={currentCalibrationVolume}
                                    placeholder="0"
                                    class="h-8"
                                  />
                                </div>
                              </div>
                              <Button type="button" onclick={addCalibrationPoint} variant="outline" class="w-full text-sm h-8">
                                <Translate key="add_calibration_point" module="configuration" fallback="Ajouter point" />
                              </Button>

                              <!-- Formulaire pour ajout en mode bulk -->
                              <div class="space-y-2">
                                <Label for="tankCalibrationBulk">
                                  <Translate key="bulk_input" module="configuration" fallback="Saisie en bloc" />
                                </Label>
                                <textarea
                                  id="tankCalibrationBulk"
                                  bind:value={tankCalibrationInput}
                                  placeholder="H1 V1&#10;H2 V2&#10;..."
                                  class="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                ></textarea>
                                <Button type="button" onclick={addCalibrationBulk} variant="outline" class="w-full text-sm h-8">
                                  <Translate key="add_bulk_calibrations" module="configuration" fallback="Ajouter en bloc" />
                                </Button>
                              </div>
                            </div>

                            <!-- Colonne droite - Affichage des points de barémage existants -->
                            <div class="space-y-4">
                              <Label>
                                <Translate key="calibration_points" module="configuration" fallback="Points de barémage" />
                              </Label>
                              <div class="border rounded-md max-h-80 overflow-y-auto text-sm">
                                {#if calibrationPoints.length > 0}
                                  {@const inconsistentPoints = findInconsistentCalibrationPoints(calibrationPoints)}
                                  <table class="w-full">
                                    <thead class="bg-muted sticky top-0">
                                      <tr>
                                        <th class="p-1 text-left"><Translate key="height" module="configuration" fallback="H" /></th>
                                        <th class="p-1 text-left"><Translate key="volume" module="configuration" fallback="V" /></th>
                                        <th class="p-1 text-left"><Translate key="actions" module="common" fallback="A" /></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {#each calibrationPoints as point, i}
                                        <tr class={i % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                                          <td class="p-1">{formatNumber(point.hauteur)}</td>
                                          <td class="p-1" class:inconsistent={inconsistentPoints.includes(i)}>{formatNumber(point.volume)}</td>
                                          <td class="p-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              class="text-destructive h-6 w-6 p-0"
                                              onclick={() => removeCalibrationPoint(i)}
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                <path d="M10 11v6M14 11v6"/>
                                              </svg>
                                            </Button>
                                          </td>
                                        </tr>
                                      {/each}
                                    </tbody>
                                  </table>
                                {:else}
                                  <div class="p-2 text-center text-muted-foreground">
                                    <Translate key="no_calibrations" module="configuration" fallback="Aucun" />
                                  </div>
                                {/if}
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    <div class="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onclick={() => {
                          showAddTankDialog = false;
                          resetAddTankFields();
                        }}
                      >
                        <Translate key="cancel" module="common" fallback="Annuler" />
                      </Button>
                      <Button
                        onclick={addTankToStation}
                        disabled={!tankName || !tankCode || tankCapacity <= 0 || !selectedTankFuelId}
                      >
                        <Translate key="add" module="common" fallback="Ajouter" />
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <!-- Dialog d'édition de cuve -->
                <Dialog bind:open={showEditTankDialog}>
                  <DialogContent class="sm:max-w-2xl md:max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>
                        <Translate key="edit_tank" module="configuration" fallback="Éditer la cuve" />
                      </DialogTitle>
                      <DialogDescription>
                        {editingTank?.nom} ({editingTank?.code})
                      </DialogDescription>
                    </DialogHeader>
                    <div class="py-4">
                      {#if editTankError}
                        <div class="bg-destructive/10 border border-destructive text-destructive p-3 rounded-md text-sm mb-4">
                          {editTankError}
                        </div>
                      {/if}

                      <Tabs value={editTankTabValue} onValueChange={(value) => editTankTabValue = value} class="w-full">
                        <TabsList class="grid w-full grid-cols-2">
                          <TabsTrigger value="basic">
                            <Translate key="basic_info" module="configuration" fallback="Informations de base" />
                          </TabsTrigger>
                          <TabsTrigger value="calibration">
                            <Translate key="tank_calibration" module="configuration" fallback="Barémage" />
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" class="space-y-4 mt-4">
                          <div class="space-y-4">
                            <div class="space-y-2">
                              <Label for="editTankName">
                                <Translate key="tank_name" module="configuration" fallback="Nom de la cuve" />
                              </Label>
                              <Input
                                id="editTankName"
                                bind:value={editTankName}
                                autocomplete="one-time-code"
                                placeholder={get(i18nStore).resources?.configuration?.tank_name || 'Nom de la cuve'}
                              />
                            </div>

                            <div class="space-y-2">
                              <Label for="editTankCode">
                                <Translate key="tank_code" module="configuration" fallback="Code de la cuve" />
                              </Label>
                              <Input
                                id="editTankCode"
                                bind:value={editTankCode}
                                autocomplete="one-time-code"
                                placeholder={get(i18nStore).resources?.configuration?.tank_code || 'Code de la cuve'}
                              />
                            </div>

                            <div class="space-y-2">
                              <Label for="editTankCapacity">
                                <Translate key="tank_capacity" module="configuration" fallback="Capacité maximale (L)" />
                              </Label>
                              <Input
                                id="editTankCapacity"
                                type="number"
                                bind:value={editTankCapacity}
                                placeholder="0"
                              />
                            </div>

                            <div class="space-y-2">
                              <Label for="editTankFuel">
                                <Translate key="tank_fuel" module="configuration" fallback="Carburant" />
                              </Label>
                              <Select.Root
                                type="single"
                                bind:value={editSelectedTankFuelId}
                              >
                                <Select.Trigger id="editTankFuel">
                                  <span data-slot="select-value">
                                    {editSelectedTankFuelId
                                      ? stationFuels.find(f => f.carburant_id === editSelectedTankFuelId)?.carburant_libelle + ' (' + stationFuels.find(f => f.carburant_id === editSelectedTankFuelId)?.carburant_code + ')'
                                      : get(i18nStore).resources?.configuration?.select_fuel_placeholder || 'Sélectionnez un carburant'}
                                  </span>
                                </Select.Trigger>
                                <Select.Content>
                                  {#each stationFuels as fuel}
                                    <Select.Item value={fuel.carburant_id}>
                                      {fuel.carburant_libelle} ({fuel.carburant_code}) - {formatCurrency(fuel.prix_achat)}/{formatCurrency(fuel.prix_vente)}
                                    </Select.Item>
                                  {/each}
                                </Select.Content>
                              </Select.Root>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="calibration" class="space-y-4 mt-4">
                          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Colonne gauche - Saisie individuelle et en bloc -->
                            <div class="space-y-4">
                              <Label>
                                <Translate key="tank_calibration" module="configuration" fallback="Barémage" />
                              </Label>
                              <p class="text-sm text-muted-foreground">
                                <Translate key="calibration_help" module="configuration" fallback="Le barémage est utilisé pour le calcul des jauges Hauteur - Volume. Fournissez les valeurs au format 'Hauteur Volume' par ligne. Nécessite des mesures jusqu'à la capacité maximale." />
                              </p>

                              <!-- Formulaire pour ajouter un point individuel -->
                              <div class="grid grid-cols-2 gap-2">
                                <div class="space-y-1">
                                  <Label for="editCalibrationHeight">
                                    <Translate key="height" module="configuration" fallback="Hauteur" />
                                  </Label>
                                  <Input
                                    id="editCalibrationHeight"
                                    type="number"
                                    bind:value={editCurrentCalibrationHeight}
                                    placeholder="0"
                                    class="h-8"
                                  />
                                </div>
                                <div class="space-y-1">
                                  <Label for="editCalibrationVolume">
                                    <Translate key="volume" module="configuration" fallback="Volume" />
                                  </Label>
                                  <Input
                                    id="editCalibrationVolume"
                                    type="number"
                                    bind:value={editCurrentCalibrationVolume}
                                    placeholder="0"
                                    class="h-8"
                                  />
                                </div>
                              </div>
                              <Button type="button" onclick={addEditCalibrationPoint} variant="outline" class="w-full text-sm h-8">
                                <Translate key="add_calibration_point" module="configuration" fallback="Ajouter point" />
                              </Button>

                              <!-- Formulaire pour ajout en mode bulk -->
                              <div class="space-y-2">
                                <Label for="editTankCalibrationBulk">
                                  <Translate key="bulk_input" module="configuration" fallback="Saisie en bloc" />
                                </Label>
                                <textarea
                                  id="editTankCalibrationBulk"
                                  bind:value={editTankCalibrationInput}
                                  placeholder="H1 V1&#10;H2 V2&#10;..."
                                  class="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                ></textarea>
                                <Button type="button" onclick={addEditCalibrationBulk} variant="outline" class="w-full text-sm h-8">
                                  <Translate key="add_bulk_calibrations" module="configuration" fallback="Ajouter en bloc" />
                                </Button>
                              </div>
                            </div>

                            <!-- Colonne droite - Affichage des points de barémage existants -->
                            <div class="space-y-4">
                              <Label>
                                <Translate key="calibration_points" module="configuration" fallback="Points de barémage" />
                              </Label>
                              <div class="border rounded-md max-h-80 overflow-y-auto text-sm">
                                {#if editCalibrationPoints.length > 0}
                                  {@const inconsistentEditPoints = findInconsistentCalibrationPoints(editCalibrationPoints)}
                                  <table class="w-full">
                                    <thead class="bg-muted sticky top-0">
                                      <tr>
                                        <th class="p-1 text-left"><Translate key="height" module="configuration" fallback="H" /></th>
                                        <th class="p-1 text-left"><Translate key="volume" module="configuration" fallback="V" /></th>
                                        <th class="p-1 text-left"><Translate key="actions" module="common" fallback="A" /></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {#each editCalibrationPoints as point, i}
                                        <tr class={i % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                                          <td class="p-1">{formatNumber(point.hauteur)}</td>
                                          <td class="p-1" class:inconsistent={inconsistentEditPoints.includes(i)}>{formatNumber(point.volume)}</td>
                                          <td class="p-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              class="text-destructive h-6 w-6 p-0"
                                              onclick={() => removeEditCalibrationPoint(i)}
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                <path d="M10 11v6M14 11v6"/>
                                              </svg>
                                            </Button>
                                          </td>
                                        </tr>
                                      {/each}
                                    </tbody>
                                  </table>
                                {:else}
                                  <div class="p-2 text-center text-muted-foreground">
                                    <Translate key="no_calibrations" module="configuration" fallback="Aucun" />
                                  </div>
                                {/if}
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    <div class="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onclick={() => {
                          showEditTankDialog = false;
                          editingTank = null;
                          resetEditTankFields();
                        }}
                      >
                        <Translate key="cancel" module="common" fallback="Annuler" />
                      </Button>
                      <Button
                        onclick={updateTank}
                        disabled={!editingTank || !editTankName || !editTankCode || editTankCapacity <= 0 || !editSelectedTankFuelId}
                      >
                        <Translate key="save" module="common" fallback="Sauvegarder" />
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              {/if}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <!-- Onglet Pompes -->
      <TabsContent value="pumps" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Translate key="pumps" module="configuration" fallback="Pompes" />
            </CardTitle>
            <CardDescription>
              <Translate 
                key="manage_pumps" 
                module="configuration" 
                fallback="Configurez les pompes liées aux cuves" 
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Translate key="number" module="configuration" fallback="Numéro" />
                  </TableHead>
                  <TableHead>
                    <Translate key="name" module="common" fallback="Nom" />
                  </TableHead>
                  <TableHead>
                    <Translate key="linked_tank" module="configuration" fallback="Cuve liée" />
                  </TableHead>
                  <TableHead>
                    <Translate key="initial_index" module="configuration" fallback="Index initial" />
                  </TableHead>
                  <TableHead class="text-right">
                    <Translate key="actions" module="common" fallback="Actions" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each pumps as pump (pump.id)}
                  <TableRow>
                    <TableCell class="font-medium">{pump.number}</TableCell>
                    <TableCell>{pump.name}</TableCell>
                    <TableCell>
                      {tanks.find(t => t.id === pump.tank_id)?.nom || pump.tank_id}
                    </TableCell>
                    <TableCell>{pump.initial_index}</TableCell>
                    <TableCell class="text-right">
                      <div class="flex justify-end space-x-2">
                        <Button variant="outline" size="sm">
                          <Translate key="edit" module="common" fallback="Éditer" />
                        </Button>
                        <Button variant="outline" size="sm" class="text-destructive border-destructive">
                          <Translate key="delete" module="common" fallback="Supprimer" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                {/each}
              </TableBody>
            </Table>
            
            <Button class="mt-4 w-full">
              <Translate key="add_pump" module="configuration" fallback="Ajouter une pompe" />
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      
      <!-- Onglet Stocks Initiaux -->
      <TabsContent value="stocks" class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Translate key="initial_stocks" module="configuration" fallback="Stocks Initiaux" />
            </CardTitle>
            <CardDescription>
              <Translate 
                key="manage_initial_stocks" 
                module="configuration" 
                fallback="Configurez les niveaux initiaux et la valorisation des stocks" 
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Translate key="tank" module="configuration" fallback="Cuve" />
                  </TableHead>
                  <TableHead>
                    <Translate key="fuel_type" module="configuration" fallback="Type de carburant" />
                  </TableHead>
                  <TableHead>
                    <Translate key="initial_level" module="configuration" fallback="Niveau initial" />
                  </TableHead>
                  <TableHead>
                    <Translate key="volume" module="configuration" fallback="Volume" />
                  </TableHead>
                  <TableHead>
                    <Translate key="valuation" module="configuration" fallback="Valorisation" />
                  </TableHead>
                  <TableHead class="text-right">
                    <Translate key="actions" module="common" fallback="Actions" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each initialStocks as stock (stock.id)}
                  <TableRow>
                    <TableCell>
                      {stock.cuve?.nom || stock.cuve_id}
                    </TableCell>
                    <TableCell>
                      {stock.cuve?.carburant?.libelle || 'Carburant non défini'}
                    </TableCell>
                    <TableCell>{stock.hauteur_jauge_initiale} cm</TableCell>
                    <TableCell>{stock.volume_initial_calcule} L</TableCell>
                    <TableCell>{formatCurrency(calculateValuation(stock))}</TableCell>
                    <TableCell class="text-right">
                      <div class="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onclick={() => prepareEditStock(stock)}>
                          <Translate key="edit" module="common" fallback="Éditer" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          class="text-destructive border-destructive"
                          onclick={() => removeInitialStock(stock.id, stock.cuve_id)}
                        >
                          <Translate key="delete" module="common" fallback="Supprimer" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                {/each}
              </TableBody>
            </Table>

            {#if tanks.length > 0}
              <Dialog bind:open={showAddStockDialog}>
                <DialogTrigger>
                  <Button class="w-full">
                    <Translate key="add_initial_stock" module="configuration" fallback="Ajouter un stock initial" />
                  </Button>
                </DialogTrigger>
                <DialogContent class="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      <Translate key="add_initial_stock" module="configuration" fallback="Ajouter un stock initial" />
                    </DialogTitle>
                    <DialogDescription>
                      <Translate key="select_tank_and_level" module="configuration" fallback="Sélectionnez une cuve et entrez le niveau initial" />
                    </DialogDescription>
                  </DialogHeader>
                  <div class="space-y-4 py-4">
                    <div class="space-y-2">
                      <Label for="tank-select">
                        <Translate key="tank" module="configuration" fallback="Cuve" />
                      </Label>
                      <Select.Root
                        type="single"
                        bind:value={selectedTankForStock}
                      >
                        <Select.Trigger id="tank-select" class="w-full">
                          <span data-slot="select-value">
                            {selectedTankForStock
                              ? tanks.find(t => t.id === selectedTankForStock)?.nom + ' (' + tanks.find(t => t.id === selectedTankForStock)?.code + ') - ' + (tanks.find(t => t.id === selectedTankForStock)?.carburant?.libelle || 'Carburant non défini')
                              : get(i18nStore).resources?.configuration?.select_tank || 'Sélectionner une cuve'}
                          </span>
                        </Select.Trigger>
                        <Select.Content>
                          {#each tanks.filter(t => !initialStocks.some(stock => stock.cuve_id === t.id)) as tank}
                            <Select.Item value={tank.id}>
                              {tank.nom} ({tank.code}) - {tank.carburant?.libelle || 'Carburant non défini'}
                            </Select.Item>
                          {/each}
                        </Select.Content>
                      </Select.Root>
                    </div>
                    <div class="space-y-2">
                      <Label for="initial-level">
                        <Translate key="initial_level" module="configuration" fallback="Niveau initial (cm)" />
                      </Label>
                      <Input
                        id="initial-level"
                        type="number"
                        bind:value={initialTankLevel}
                        placeholder={get(i18nStore).resources?.configuration?.initial_level_placeholder || 'Hauteur en cm'}
                      />
                    </div>
                  </div>
                  <div class="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onclick={() => {
                        showAddStockDialog = false;
                        selectedTankForStock = '';
                        initialTankLevel = '';
                      }}
                    >
                      <Translate key="cancel" module="common" fallback="Annuler" />
                    </Button>
                    <Button
                      disabled={!selectedTankForStock || initialTankLevel === ''}
                      onclick={addInitialStock}
                    >
                      <Translate key="set_initial_stock" module="configuration" fallback="Définir le stock initial" />
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            {/if}

            <!-- Dialogue d'édition d'un stock initial -->
            {#if editingStock}
              <Dialog bind:open={showEditStockDialog}>
                <DialogContent class="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      <Translate key="edit_initial_stock" module="configuration" fallback="Éditer le stock initial" />
                    </DialogTitle>
                    <DialogDescription>
                      {editingStock.cuve?.nom || editingStock.cuve_id}
                      ({editingStock.cuve?.carburant?.libelle || 'Carburant non défini'})
                    </DialogDescription>
                  </DialogHeader>
                  <div class="space-y-4 py-4">
                    <div class="space-y-2">
                      <Label for="edit-initial-level">
                        <Translate key="initial_level" module="configuration" fallback="Niveau initial (cm)" />
                      </Label>
                      <Input
                        id="edit-initial-level"
                        type="number"
                        bind:value={editInitialLevel}
                        placeholder={get(i18nStore).resources?.configuration?.initial_level_placeholder || 'Hauteur en cm'}
                      />
                    </div>
                    <div class="text-sm text-muted-foreground">
                      <p>
                        <Translate key="current_volume" module="configuration" fallback="Volume actuel:" /> {editingStock.volume_initial_calcule} L
                      </p>
                    </div>
                  </div>
                  <div class="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onclick={() => showEditStockDialog = false}
                    >
                      <Translate key="cancel" module="common" fallback="Annuler" />
                    </Button>
                    <Button
                      onclick={updateInitialStock}
                      disabled={isNaN(Number(editInitialLevel)) || Number(editInitialLevel) < 0}
                    >
                      <Translate key="save" module="common" fallback="Sauvegarder" />
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            {/if}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    
    <!-- Bouton de sauvegarde -->
    <div class="flex justify-end">
      <Button onclick={saveConfiguration}>
        <Translate key="save_configuration" module="configuration" fallback="Sauvegarder la configuration" />
      </Button>
    </div>
  {/if}
</div>

<style>
  .inconsistent {
    background-color: #fee2e2 !important; /* Rouge clair */
    color: #dc2626; /* Texte rouge foncé */
    font-weight: bold;
  }
</style>