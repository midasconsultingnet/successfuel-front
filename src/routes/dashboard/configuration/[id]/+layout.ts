import type { LayoutLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { stationService } from '$lib/services/StationService';

export const load: LayoutLoad = async ({ params }) => {
  try {
    // Charger les informations de la station sans le fetch personnalisé dans Tauri
    const station = await stationService.getStationById(params.id);

    return {
      stationId: params.id,
      station: {
        id: station.id,
        name: station.nom,
        code: station.code,
        address: station.adresse,
        config: station.config // Inclure les données de configuration
      }
    };
  } catch (error) {
    console.error('Erreur lors du chargement des informations de la station:', error);

    // Si la station n'existe pas (erreur 404), rediriger vers la page de structure
    if ((error as any).status === 404 || (error as any).message?.includes('404') || (error as any).status === 400 || (error as any).message?.includes('400')) {
      throw redirect(302, '/dashboard/structure');
    }

    // Pour d'autres erreurs, retourner des valeurs par défaut
    return {
      stationId: params.id,
      station: {
        id: params.id,
        name: 'Station Inconnue',
        code: 'N/A',
        address: 'Adresse inconnue',
        config: null
      }
    };
  }
};