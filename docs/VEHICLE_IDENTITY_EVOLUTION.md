# Vehicle Identity — Évolutions futures

Ce document décrit comment faire évoluer le système Vehicle Identity sans refactor majeur : branchement d’une API specs externe et support multi-langue.

---

## 1. Branchement d’une API specs (provider payant)

### Principe

- Introduire une **interface** `SpecProvider` avec une méthode `getSpecsByVin(vin: string)`.
- En onboarding, après validation du VIN : si un provider est configuré, l’appeler et **pré-remplir** le véhicule (make, model, year, trim, fuel, transmission, power, etc.) avec `source: system` et une confidence donnée.
- La structure actuelle (Vehicle + VehicleSpecMeta) reste inchangée ; on ajoute uniquement un branchement optionnel.

### Implémentation suggérée

1. **Créer l’interface** (ex. `apps/api/src/vehicles/spec-provider.interface.ts`) :
   ```ts
   export interface VinSpecsResult {
     makeName?: string;
     makeId?: string;   // si déjà résolu côté provider
     modelName?: string;
     modelYear?: number;
     trimLabel?: string;
     fuelType?: string;
     transmissionType?: string;
     driveType?: string;
     powerKw?: number;
     topSpeedKmh?: number;
     zeroTo100S?: number;
   }
   export interface SpecProvider {
     getSpecsByVin(vin: string): Promise<VinSpecsResult | null>;
   }
   ```

2. **Enregistrer un provider** (optionnel) via config ou module Nest : par ex. `SpecProviderModule` avec `useClass: NhtsaSpecProvider` si une clé API est présente.

3. **Dans le flow onboarding** (après `validate-vin`) :
   - Si provider configuré : appeler `getSpecsByVin(vin)`.
   - Résoudre make/model par nom (ou slug) via `MakeModelService` ; créer en unverified si absent.
   - Créer le `Vehicle` avec les champs renvoyés.
   - Pour chaque spec renvoyée : appeler `VehicleSpecService.upsertSpec(..., source: SpecSource.system, confidence: 0.85)`.

4. **Priorité des sources** : une correction ou confirmation par l’host (`host_confirmed` / `host_manual`) prime sur les données provider ; ne pas écraser une valeur déjà confirmée par l’host lors d’un rappel provider.

### Points d’attention

- Ne pas dépendre du provider pour la création du véhicule : si l’appel échoue (quota, réseau), garder le flow manuel (saisie make/model/year par l’host).
- Logger les appels provider (coût, erreurs) pour monitoring.

---

## 2. Multi-langue / multi-pays

### Noms Make / Model

- Aujourd’hui : `Make.name` et `Model.name` en `String` (une seule langue).
- Évolution : passer à un **JSON** `name` (ex. `{ en: "Renault", fr: "Renault", de: "Renault" }`) ou une table de traduction `MakeTranslation(modelId, locale, name)`.
- Migration : ajouter une colonne `name_i18n Json?` et remplir progressivement ; en lecture, utiliser `name_i18n?.[locale] ?? name` pour rétrocompatibilité.

### Canonical display name et slugs

- `VehicleDisplayService.canonicalDisplayName(vehicle, locale?)` : si `locale` est fourni et que les noms sont i18n, utiliser la clé correspondante.
- Les **slugs** (make.slug, model.slug) restent de préférence **uniques et indépendants de la langue** (ex. `renault`, `clio`) pour éviter des URLs différentes par langue ; le nom affiché varie selon la locale.

### Pays / marché

- Les références Make/Model sont globales ; pas de changement de schéma obligatoire pour “multi-pays”.
- Si besoin de marques visibles par pays : table d’association `MakeCountry(makeId, countryCode, isActive)` ou champ `allowedCountries` sur Make/Model.

---

## 3. Trim / version (ModelTrim)

- Le champ `Vehicle.trimLabel` (string libre) est déjà prévu.
- Évolution possible : table **ModelTrim** (`modelId`, `name`, `slug`) et `Vehicle.modelTrimId` (FK optionnelle) pour normaliser les versions et éviter les doublons (ex. “RS”, “GT Line”).
- `canonicalDisplayName` et `canonicalSlugComponents` utilisent déjà `trimLabel` ; avec ModelTrim, on utiliserait `modelTrim.name` à la place de `trimLabel` si présent.

---

## 4. Récapitulatif

| Évolution        | Impact schéma / code                    | Risque refactor |
|-----------------|----------------------------------------|------------------|
| API specs       | Interface + module optionnel, pas de changement Vehicle/SpecMeta | Faible |
| i18n noms       | `name` → Json ou table traduction + helper lecture | Moyen (migration données) |
| ModelTrim       | Nouvelle table + FK optionnelle Vehicle | Faible |
| Multi-pays      | Table association ou champ sur Make/Model | Faible |

En restant sur la séparation **Vehicle Identity** (données globales) vs **Listing Configuration** (données d’annonce), ces évolutions restent modulaires et ne remettent pas en cause l’architecture actuelle.
