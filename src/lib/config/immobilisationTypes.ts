/**
 * Configuration des types d'immobilisations prédéfinis
 */

export interface ImmobilisationType {
  key: string;
  label: string;
  description?: string;
  i18nKey?: string; // Clé de traduction optionnelle
}

// Types prédéfinis d'immobilisations
export const immobilisationTypes: ImmobilisationType[] = [
  {
    key: 'equipment',
    label: 'Équipement',
    description: 'Matériel et outillage',
    i18nKey: 'equipment'
  },
  {
    key: 'vehicle',
    label: 'Véhicule',
    description: 'Véhicules de transport',
    i18nKey: 'vehicle'
  },
  {
    key: 'building',
    label: 'Bâtiment',
    description: 'Constructions immobilières',
    i18nKey: 'building'
  },
  {
    key: 'land',
    label: 'Terrain',
    description: 'Terrains et propriétés',
    i18nKey: 'land'
  },
  {
    key: 'furniture',
    label: 'Mobilier',
    description: 'Meubles et aménagements',
    i18nKey: 'furniture'
  },
  {
    key: 'machinery',
    label: 'Machine',
    description: 'Machines et installations techniques',
    i18nKey: 'machinery'
  },
  {
    key: 'technology',
    label: 'Technologie',
    description: 'Équipements informatiques et technologiques',
    i18nKey: 'technology'
  },
  {
    key: 'other',
    label: 'Autres',
    description: 'Autres types d\'immobilisations',
    i18nKey: 'other'
  }
];