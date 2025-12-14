import type { LayoutLoad } from './$types';
import { stationService } from '$lib/services/StationService';

export const load: LayoutLoad = async ({ params }) => {
  try {
    // Charger les informations de la station
    const station = await stationService.getStationById(params.id);
    
    return {
      stationId: params.id,
      station: {
        id: station.id,
        name: station.nom,
        code: station.code,
        address: station.adresse
      }
    };
  } catch (error) {
    console.error('Erreur lors du chargement des informations de la station:', error);
    // Retourner des valeurs par défaut en cas d'erreur
    return {
      stationId: params.id,
      station: {
        id: params.id,
        name: 'Station Inconnue',
        code: 'N/A',
        address: 'Adresse inconnue'
      }
    };
  }
};