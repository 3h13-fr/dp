# Intégration API NHTSA pour données VIN

Ce document décrit l'intégration de l'API NHTSA (National Highway Traffic Safety Administration) pour récupérer automatiquement les données véhicule depuis un VIN (Vehicle Identification Number).

## Vue d'ensemble

L'API NHTSA vPIC (Vehicle Product Information Catalog) permet de décoder un VIN et d'obtenir des informations sur le véhicule telles que :
- Marque (Make)
- Modèle (Model)
- Année (Model Year)
- Trim/Série
- Type de carburant (Fuel Type)
- Transmission
- Type de traction (Drive Type)

## API utilisée

**Endpoint NHTSA** : `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{VIN}?format=json`

**Caractéristiques** :
- ✅ Gratuite, sans clé API requise
- ✅ Format JSON disponible
- ✅ Rate limit : 1000-2000 requêtes/minute
- ✅ Disponibilité : 24/7 avec 99% uptime cible
- ⚠️ Limitation : Couvre principalement les véhicules USA/Canada

## Architecture

```
Frontend (Step3VehicleIdentify.tsx)
  ↓ POST /vehicles/onboarding/validate-vin
  ↓ POST /vehicles/onboarding/fetch-vin-specs (si VIN valide)
Backend (VehiclesController)
  ↓ VinSpecsService.fetchSpecsByVin()
  ↓ NhtsaSpecProvider.getSpecsByVin()
  ↓ Appel API NHTSA
  ↓ MakeModelService (résolution/création Make/Model)
  ↓ Retour des données pré-remplies
```

## Configuration

### Variables d'environnement

Dans `.env` :

```env
# Activer/désactiver l'API NHTSA (par défaut: true)
VIN_API_ENABLED=true
```

Si `VIN_API_ENABLED=false`, le système utilisera uniquement la saisie manuelle.

## Mapping des champs NHTSA → Modèle interne

### Champs principaux

| NHTSA Variable | Valeur NHTSA (exemple) | Modèle interne | Mapping |
|----------------|------------------------|----------------|---------|
| `Make` | "VOLKSWAGEN" | `makeName` | Direct |
| `Model` | "GOLF" | `modelName` | Direct |
| `ModelYear` | "2020" | `modelYear` | Parse integer |
| `Trim` / `Series` | "GTI" | `trimLabel` | Direct (prefère Trim) |
| `Fuel Type - Primary` | "Gasoline" | `fuelType` | Mapping (voir ci-dessous) |
| `TransmissionStyle` | "Manual" | `transmissionType` | Mapping (voir ci-dessous) |
| `DriveType` | "FWD" | `driveType` | Mapping (voir ci-dessous) |

### Mapping Fuel Type

| NHTSA | Modèle interne (enum FuelType) |
|-------|--------------------------------|
| Gasoline, Gas | `petrol` |
| Diesel | `diesel` |
| Electric | `electric` |
| Hybrid | `hybrid` |
| LPG, Propane | `lpg` |
| Autre | `other` |

### Mapping Transmission Type

| NHTSA | Modèle interne (enum TransmissionType) |
|-------|----------------------------------------|
| Manual | `manual` |
| Automatic | `automatic` |
| Semi-Automatic | `semi_automatic` |
| CVT | `cvt` |
| Autre | `other` |

### Mapping Drive Type

| NHTSA | Modèle interne (enum DriveType) |
|-------|--------------------------------|
| FWD, FRONT | `fwd` |
| RWD, REAR | `rwd` |
| AWD, 4WD, ALL | `awd` |
| Autre | `other` |

## Flow d'onboarding

### 1. Validation VIN

L'utilisateur entre un VIN de 17 caractères. Le système valide le format :
- Longueur exacte : 17 caractères
- Pas de lettres I, O, Q
- Caractères valides uniquement (A-Z sauf I/O/Q, 0-9)

**Endpoint** : `POST /vehicles/onboarding/validate-vin`

### 2. Récupération des specs (automatique)

Si le VIN est valide, le système appelle automatiquement l'API NHTSA pour récupérer les données.

**Endpoint** : `POST /vehicles/onboarding/fetch-vin-specs`

**Body** :
```json
{
  "vin": "WVWZZZ3CZWE123456"
}
```

**Réponse** (succès) :
```json
{
  "makeId": "make-123",
  "modelId": "model-456",
  "modelYear": 2020,
  "trimLabel": "GTI",
  "makeName": "VOLKSWAGEN",
  "modelName": "GOLF",
  "fuelType": "petrol",
  "transmissionType": "manual",
  "driveType": "fwd",
  "confidence": 0.85,
  "source": "nhtsa"
}
```

**Réponse** (échec ou VIN non trouvé) :
```json
null
```

### 3. Résolution Make/Model

Le système tente de résoudre le Make et Model depuis la base de données :
- Si trouvé : utilise l'ID existant
- Si non trouvé : crée un Make/Model avec `status: unverified`

### 4. Pré-remplissage du formulaire

Si des données sont récupérées, le formulaire est pré-rempli avec :
- Make (sélectionné)
- Model (sélectionné)
- Year
- Trim (si disponible)

L'utilisateur peut modifier ces valeurs si nécessaire.

### 5. Fallback manuel

Si l'API NHTSA échoue ou ne trouve pas le VIN :
- Le système continue avec la saisie manuelle
- Aucune erreur n'est affichée à l'utilisateur
- Le flow d'onboarding fonctionne normalement

## Gestion des erreurs

### Erreurs possibles

1. **VIN invalide** : Format incorrect → Validation échoue, pas d'appel API
2. **API NHTSA down** : Timeout ou erreur HTTP → Retour `null`, fallback manuel
3. **VIN non trouvé** : NHTSA ne connaît pas le VIN → Retour `null`, fallback manuel
4. **Données incomplètes** : Make/Model/Year manquants → Retour `null`, fallback manuel
5. **Erreur résolution Make/Model** : Erreur DB → Retour `null`, fallback manuel

### Logging

Tous les appels sont loggés avec :
- VIN utilisé
- Succès/échec
- Erreurs éventuelles
- Données récupérées (make, model, year)

## Limitations

1. **Couverture géographique** : NHTSA couvre principalement les véhicules USA/Canada. Les véhicules européens ou autres peuvent ne pas être trouvés.

2. **Rate limiting** : Bien que NHTSA supporte 1000-2000 req/min, il est recommandé de ne pas abuser de l'API.

3. **Données optionnelles** : Certains champs (trim, fuel type, transmission) peuvent être absents selon le VIN.

4. **Confiance** : Les données NHTSA ont une confiance de 0.85 (`source: system`) et peuvent être modifiées par l'utilisateur.

## Tests

### Tests unitaires

- `nhtsa-spec-provider.service.spec.ts` : Tests du provider NHTSA avec mocks HTTP
- `vin-specs.service.spec.ts` : Tests du service d'orchestration avec mocks des dépendances

### Tests manuels

1. Tester avec un VIN USA valide (ex: `5UXWX7C5*BA`)
2. Vérifier le pré-remplissage du formulaire
3. Tester avec un VIN invalide
4. Tester avec un VIN non trouvé par NHTSA
5. Vérifier le fallback manuel si l'API échoue

## Exemples de VIN de test

- **Volkswagen Golf** : `WVWZZZ3CZWE123456` (exemple, peut ne pas exister dans NHTSA)
- **BMW** : `WBA3B1C50EK123401` (exemple)
- **Tesla** : VINs commençant par `5YJ` (USA)

Pour tester avec de vrais VINs, utiliser des VINs de véhicules USA réels.

## Évolutions futures

1. **Support multi-providers** : Ajouter d'autres APIs VIN (CarMD, VINDecoder, etc.)
2. **Cache** : Mettre en cache les résultats pour éviter les appels répétés
3. **Internationalisation** : Support pour APIs européennes (ex: CarInfo API)
4. **Amélioration mapping** : Meilleur mapping des valeurs NHTSA vers nos enums

## Références

- [NHTSA vPIC API Documentation](https://vpic.nhtsa.dot.gov/api/)
- [VIN Decoder](https://www.nhtsa.gov/vin-decoder)
- [API FAQ](https://vpic.nhtsa.dot.gov/api/Home/Index/FAQ)
