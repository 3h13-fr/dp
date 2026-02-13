/**
 * Template CAR — 17 items obligatoires pour l'état des lieux voiture.
 * Ordre strict pour la validation.
 */
export const CAR_INSPECTION_ITEM_CODES = [
  'EXTERIOR_OVERVIEW', // photo 3/4 avant gauche
  'FRONT_BUMPER', // photo avant
  'LEFT_SIDE_BODY', // photo côté gauche
  'WHEEL_FRONT_LEFT', // photo jante AVG
  'WHEEL_REAR_LEFT', // photo jante ARG
  'REAR_BUMPER', // photo arrière
  'RIGHT_SIDE_BODY', // photo côté droit
  'WHEEL_REAR_RIGHT', // photo jante ARD
  'WHEEL_FRONT_RIGHT', // photo jante AVD
  'WINDSHIELD_WINDOWS', // photo pare-brise
  'LICENSE_PLATE_ID', // photo plaque
  'TRUNK_AREA', // photo coffre ouvert
  'FRONT_SEATS', // photo sièges avant
  'BACK_SEATS', // photo sièges arrière
  'FLOOR_MATS', // photo sols/tapis
  'DASHBOARD_AREA', // photo tableau de bord
  'ODOMETER', // photo compteur + mileage_value obligatoire
] as const;

export type CarInspectionItemCode = (typeof CAR_INSPECTION_ITEM_CODES)[number];

export const CAR_INSPECTION_ITEM_COUNT = CAR_INSPECTION_ITEM_CODES.length;

// Seuil pour devis obligatoire sur damage claim (€)
export const DAMAGE_CLAIM_QUOTE_THRESHOLD = 500;
