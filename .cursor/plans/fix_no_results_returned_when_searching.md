# Plan : Correction du problème de résultats vides lors des recherches

## Problème identifié

Après les modifications précédentes, aucune recherche ne retourne de résultats, même si la carte se centre correctement sur l'adresse recherchée. Cela suggère que :

1. PostGIS fonctionne mais ne trouve aucun véhicule dans le rayon (peut-être que les véhicules n'ont pas de coordonnées)
2. PostGIS échoue et le fallback retourne maintenant une liste vide au lieu d'essayer un fallback intelligent
3. Le filtrage est trop strict (rayon trop petit, ou problème avec les coordonnées)

## Analyse du problème

### Changement récent qui cause le problème

**Fichier** : `apps/api/src/listings/listings.service.ts`

**Ligne 106-114** : Le fallback dans `searchByLocation` retourne maintenant une liste vide au lieu d'appeler `findMany` :

```typescript
} catch (error) {
  // Fallback: Ne pas retourner tous les véhicules si PostGIS échoue
  return { items: [], total: 0 };
}
```

**Problème** : Si PostGIS échoue (extension non activée, erreur SQL, etc.), on retourne une liste vide au lieu d'essayer un fallback intelligent.

### Hypothèses sur la cause

1. **Hypothèse 1** : PostGIS fonctionne mais les véhicules n'ont pas de coordonnées géographiques
   - La requête PostGIS filtre `WHERE location IS NOT NULL` (ligne 78)
   - Si aucun véhicule n'a de `location`, la requête retourne 0 résultats
   - Mais le fallback ne s'active pas car il n'y a pas d'erreur, juste 0 résultats

2. **Hypothèse 2** : PostGIS échoue silencieusement
   - L'extension PostGIS n'est pas activée dans la base de données
   - La requête SQL échoue et le catch retourne une liste vide
   - Avant, on faisait un fallback vers `findMany` qui retournait tous les véhicules

3. **Hypothèse 3** : Le rayon est trop petit ou les coordonnées sont incorrectes
   - Le rayon de 20km pourrait être trop petit si les véhicules sont dispersés
   - Les coordonnées pourraient être incorrectes

## Solutions

### Solution 1 : Améliorer le fallback pour être plus intelligent (RECOMMANDÉ)

**Fichier** : `apps/api/src/listings/listings.service.ts`

**Modification** :
- Modifier `searchByLocation` pour accepter un paramètre `city` optionnel
- Si PostGIS échoue et que `city` est disponible, appeler `findMany` avec `city`
- Ajouter des logs de diagnostic pour comprendre pourquoi 0 résultats

**Code à modifier** :
```typescript
// Dans listings.service.ts - Modifier la signature
async searchByLocation(params: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  type?: ListingType;
  limit?: number;
  offset?: number;
  city?: string; // Ajouter city en paramètre optionnel
}): Promise<{ items: unknown[]; total: number }> {
  // ... code existant ...
  
  } catch (error) {
    console.error('[ListingsService.searchByLocation] PostGIS query failed:', error);
    console.error('[ListingsService.searchByLocation] Error details:', error instanceof Error ? error.message : String(error));
    console.error('[ListingsService.searchByLocation] Params:', { latitude, longitude, radius, type, limit, offset });
    
    // Fallback intelligent : si city est disponible, essayer findMany avec city
    if (params.city) {
      console.warn('[ListingsService.searchByLocation] Falling back to findMany with city filter');
      return this.findMany({
        type: params.type,
        city: params.city,
        limit: params.limit,
        offset: params.offset,
      });
    }
    
    // Sinon, retourner une liste vide
    return { items: [], total: 0 };
  }
}
```

### Solution 2 : Passer city depuis le controller

**Fichier** : `apps/api/src/listings/listings.controller.ts`

**Modification** :
- Passer `city` à `searchByLocation` pour permettre le fallback intelligent

**Code à modifier** :
```typescript
if (latitude != null && longitude != null && !Number.isNaN(latitude) && !Number.isNaN(longitude)) {
  return this.listings.searchByLocation({
    latitude,
    longitude,
    radiusMeters: radius ? parseInt(radius, 10) : undefined,
    type,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
    city: city, // Passer city au fallback
  });
}
```

### Solution 3 : Ajouter des logs de diagnostic

**Fichier** : `apps/api/src/listings/listings.service.ts`

**Modification** :
- Ajouter des logs pour diagnostiquer pourquoi 0 résultats sont retournés
- Vérifier combien de listings ont des coordonnées géographiques

**Code à ajouter** :
```typescript
// Avant la requête PostGIS
console.log('[ListingsService.searchByLocation] Starting search with:', {
  latitude,
  longitude,
  radius,
  type,
});

// Après la requête, même si 0 résultats
if (idsWithDistance.length === 0) {
  console.warn('[ListingsService.searchByLocation] No listings found in radius', {
    latitude,
    longitude,
    radius,
    type,
  });
  // Vérifier combien de listings actifs ont des coordonnées
  const totalWithLocation = await this.prisma.listing.count({
    where: {
      status: 'ACTIVE',
      location: { not: null },
      ...(type ? { type } : {}),
    },
  });
  console.log('[ListingsService.searchByLocation] Total active listings with location:', totalWithLocation);
}
```

## Fichiers à modifier

1. **`apps/api/src/listings/listings.service.ts`** :
   - Modifier `searchByLocation` pour accepter `city` en paramètre optionnel
   - Améliorer le fallback pour utiliser `findMany` avec `city` si PostGIS échoue
   - Ajouter des logs de diagnostic

2. **`apps/api/src/listings/listings.controller.ts`** :
   - Passer `city` à `searchByLocation` pour le fallback

## Tests à effectuer

1. **Test 1** : Vérifier les logs du backend pour voir si PostGIS échoue ou retourne 0 résultats
2. **Test 2** : Vérifier dans la base de données combien de listings ont `location IS NOT NULL`
3. **Test 3** : Rechercher "Marseille" → vérifier que le fallback fonctionne si PostGIS échoue
4. **Test 4** : Rechercher une adresse spécifique → vérifier que les résultats sont retournés

## Notes

- Il est important de comprendre pourquoi PostGIS ne retourne pas de résultats avant de modifier le fallback
- Le fallback intelligent avec `city` est une solution temporaire si PostGIS n'est pas disponible ou si les véhicules n'ont pas de coordonnées
- À long terme, il faut s'assurer que tous les véhicules ont des coordonnées géographiques et que PostGIS fonctionne correctement
