# Synchronisation automatique NHTSA Makes/Models

Ce document décrit le système de synchronisation automatique qui récupère **TOUS** les constructeurs et modèles depuis l'API NHTSA et les synchronise périodiquement.

## Vue d'ensemble

Le système synchronise automatiquement :
- **Tous les constructeurs (makes)** disponibles dans l'API NHTSA
- **Tous les modèles** pour chaque constructeur
- **Nouveautés** : Les nouveaux constructeurs et modèles sont automatiquement ajoutés lors des synchronisations périodiques

## Architecture

```
NHTSA API
  ↓ GetAllMakes (récupère tous les makes)
  ↓ Pour chaque make: GetModelsForMakeId (récupère tous les modèles)
NhtsaSyncService
  ↓ Upsert dans la base (Make/Model)
  ↓ Marquer comme source: 'nhtsa'
BullMQ Job (périodique)
  ↓ Exécute SyncService quotidiennement
  ↓ Détecte et ajoute les nouveautés
```

## Endpoints NHTSA utilisés

1. **GetAllMakes** : `https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json`
   - Retourne tous les constructeurs avec leur MakeId
   - Exemple de réponse : `{ "Count": 1234, "Results": [{ "Make_ID": 440, "Make_Name": "AUDI" }] }`

2. **GetModelsForMakeId** : `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeId/{makeId}?format=json`
   - Retourne tous les modèles pour un constructeur donné
   - Exemple de réponse : `{ "Count": 45, "Results": [{ "Make_ID": 440, "Model_ID": 1685, "Model_Name": "A3" }] }`

## Configuration

### Variables d'environnement

```env
# Pattern cron pour la synchronisation périodique (par défaut: tous les jours à 2h du matin)
NHTSA_SYNC_CRON=0 2 * * *

# Activer/désactiver l'API NHTSA (par défaut: true)
VIN_API_ENABLED=true
```

### Pattern cron

Le pattern cron suit la syntaxe standard :
- `0 2 * * *` : Tous les jours à 2h du matin (défaut)
- `0 */6 * * *` : Toutes les 6 heures
- `0 0 * * 0` : Tous les dimanches à minuit

## Synchronisation

### Synchronisation automatique

Un job BullMQ récurrent s'exécute automatiquement selon le pattern cron configuré. Le job :
1. Récupère tous les makes depuis NHTSA
2. Pour chaque make, récupère tous les modèles
3. Met à jour la base de données (upsert)
4. Log les statistiques (makes/models créés/mis à jour)

### Synchronisation manuelle (Admin)

Un endpoint admin permet de déclencher la synchronisation immédiatement :

```bash
POST /vehicles/admin/sync-nhtsa
Authorization: Bearer <admin_token>
```

**Réponse** :
```json
{
  "success": true,
  "stats": {
    "makesProcessed": 1234,
    "makesCreated": 200,
    "makesUpdated": 1034,
    "modelsProcessed": 15420,
    "modelsCreated": 3200,
    "modelsUpdated": 12220,
    "errors": []
  },
  "message": "NHTSA synchronization completed"
}
```

## Gestion des données

### Upsert intelligent

Le système utilise un mécanisme d'upsert intelligent :

1. **Recherche par slug** : Vérifie si le make/model existe déjà par slug
2. **Recherche par externalId** : Vérifie si le make/model existe déjà avec le même externalId NHTSA
3. **Déduplication** : Utilise `suggestMakeByName()` et `suggestModelByName()` pour détecter les doublons potentiels
4. **Mise à jour** : Si un make/model existe mais n'a pas `externalSource: 'nhtsa'`, met à jour les métadonnées

### Statut et source

- **Makes/Models NHTSA** : `status: verified`, `externalSource: 'nhtsa'`, `externalId: <NHTSA_ID>`
- **Makes/Models manuels** : `status: unverified`, `externalSource: 'crowd'`, `externalId: null`
- **Makes/Models existants** : Conservent leur statut, mais reçoivent `externalId` et `externalSource` si manquants

### Normalisation

- **Noms** : Normalisés (première lettre majuscule, reste minuscule)
- **Slugs** : Générés automatiquement depuis les noms normalisés
- **Caractères spéciaux** : Gérés par `normalizeForSlug()`

## Rate limiting

Le système respecte les limites de l'API NHTSA (1000-2000 req/min) :

- **Délai entre appels** : 150ms entre chaque appel à `GetModelsForMakeId`
- **Gestion 429** : En cas de rate limit, attend 5 secondes et retry une fois
- **Timeout** : 30s pour GetAllMakes, 10s pour GetModelsForMakeId

## Performance

### Temps d'exécution

Une synchronisation complète peut prendre :
- **Makes** : ~2-3 minutes (1000+ makes × 150ms)
- **Models** : ~30-60 minutes (1000+ makes × modèles × 150ms)
- **Total** : ~1 heure pour une synchronisation complète

### Optimisations

- Les erreurs sur un make/model n'arrêtent pas la synchronisation
- Logging progressif (tous les 50 makes, tous les 100 modèles)
- Exécution en arrière-plan (job BullMQ)

## Monitoring

### Logs

Le système logge :
- Début/fin de synchronisation
- Progression (makes/models traités)
- Statistiques finales
- Erreurs rencontrées

### Exemple de logs

```
[NhtsaSyncService] Starting full NHTSA synchronization...
[NhtsaSyncService] Fetching all makes from NHTSA...
[NhtsaSyncService] Fetched 1234 makes from NHTSA
[NhtsaSyncService] Starting sync of 1234 makes...
[NhtsaSyncService] Progress: 50/1234 makes processed
[NhtsaSyncService] Makes sync completed: 1234 processed, 200 created, 1034 updated
[NhtsaSyncService] Syncing models for 1234 makes...
[NhtsaSyncService] Models progress: 100 models processed
[NhtsaSyncService] NHTSA sync completed: 1234 makes (200 created, 1034 updated), 15420 models (3200 created, 12220 updated)
```

## Gestion des erreurs

### Erreurs non bloquantes

- Erreur sur un make : Continue avec les autres makes
- Erreur sur les modèles d'un make : Continue avec les autres makes
- Erreur réseau temporaire : Retry automatique pour rate limit

### Erreurs bloquantes

- Erreur fatale lors de `GetAllMakes` : Arrête la synchronisation
- Erreur de base de données critique : Arrête la synchronisation

Toutes les erreurs sont loggées et incluses dans les statistiques retournées.

## Limitations

1. **Couverture géographique** : NHTSA couvre principalement USA/Canada
   - Les véhicules européens peuvent ne pas être complets
   - La création manuelle reste disponible pour les cas manquants

2. **Données historiques** : NHTSA peut contenir des constructeurs/modèles obsolètes
   - Le système les synchronise quand même pour exhaustivité
   - Le statut `verified` indique seulement que la source est officielle

3. **Performance** : Synchronisation complète longue
   - Exécuter en heures creuses (défaut: 2h du matin)
   - Peut être désactivée temporairement si nécessaire

## Désactiver la synchronisation

Pour désactiver la synchronisation automatique :

1. **Temporairement** : Ne pas définir `NHTSA_SYNC_CRON` ou le définir à une valeur invalide
2. **Définitivement** : Retirer `NhtsaSyncModule` de `VehiclesModule`

La synchronisation manuelle via l'endpoint admin reste disponible.

## Tests

### Test manuel de synchronisation

```bash
# Via curl (nécessite token admin)
curl -X POST http://localhost:4000/vehicles/admin/sync-nhtsa \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

### Vérification des données

```bash
# Compter les makes NHTSA
curl http://localhost:4000/vehicles/makes | jq '.items | length'

# Lister les makes NHTSA
curl http://localhost:4000/vehicles/makes | jq '.items[] | select(.externalSource == "nhtsa")'
```

## Maintenance

### Première synchronisation

Lors du premier démarrage de l'application, la synchronisation se déclenche automatiquement selon le cron. Pour une synchronisation immédiate :

1. Utiliser l'endpoint admin `/vehicles/admin/sync-nhtsa`
2. Ou attendre le prochain cycle cron

### Mise à jour du cron

Modifier `NHTSA_SYNC_CRON` dans `.env` et redémarrer l'application. Le nouveau pattern sera appliqué au prochain démarrage.

### Nettoyage

Les jobs BullMQ sont automatiquement nettoyés selon la configuration :
- Jobs complétés : conservés (count: 1000)
- Jobs échoués : conservés (count: 5000)

## Références

- [NHTSA vPIC API Documentation](https://vpic.nhtsa.dot.gov/api/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Cron Pattern Syntax](https://crontab.guru/)
