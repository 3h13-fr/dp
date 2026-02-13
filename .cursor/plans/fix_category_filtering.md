# Plan : Correction du filtrage par catégorie

## Problème identifié

Quand l'utilisateur clique sur l'onglet "Citadine" (ou toute autre catégorie), aucun résultat ne s'affiche alors qu'il y a des véhicules avec cette catégorie. L'URL est `http://localhost:3000/fr?type=CAR_RENTAL&category=citadine`.

## Causes du problème

1. **Filtrage incorrect dans le backend** : Dans `listings.service.ts` ligne 306, le code utilise `where.category = { equals: category }` mais `category` est une relation Prisma, pas un champ texte. Il faut filtrer par `category.slug` ou trouver la catégorie par son slug et utiliser `categoryId`.

2. **Paramètre category manquant dans searchByLocation** : La méthode `searchByLocation` n'accepte pas le paramètre `category`, donc le filtrage par catégorie ne fonctionne pas lors des recherches géographiques.

3. **Hook useSearchListings ne passe pas category** : Le hook lit `category` depuis l'URL mais ne l'envoie pas dans les paramètres de requête à l'API.

4. **Controller ne passe pas category à searchByLocation** : Le controller ne passe pas `category` à `searchByLocation`.

## Solutions

### 1. Corriger le filtrage par catégorie dans findMany

**Fichier** : `apps/api/src/listings/listings.service.ts`

**Problème** : Ligne 306 utilise `where.category = { equals: category }` mais `category` est une relation.

**Solution** : Filtrer par la relation `category.slug` au lieu d'essayer de comparer la relation directement.

```typescript
// Avant (incorrect)
if (category) where.category = { equals: category, mode: 'insensitive' };

// Après (correct)
if (category && type) {
  // Filtrer par category.slug via la relation
  where.category = {
    slug: { equals: category.toLowerCase().trim(), mode: 'insensitive' },
    vertical: type, // S'assurer que la catégorie correspond au bon type
  };
}
```

### 2. Ajouter le paramètre category à searchByLocation

**Fichier** : `apps/api/src/listings/listings.service.ts`

**Modifications** :
- Ajouter `category?: string` aux paramètres de `searchByLocation`
- Filtrer les résultats par catégorie après la récupération PostGIS
- Passer `category` au fallback `findMany`

### 3. Filtrer par catégorie dans searchByLocation

**Fichier** : `apps/api/src/listings/listings.service.ts`

**Modifications** :
- Après avoir récupéré les items depuis PostGIS, appliquer le filtre de catégorie si présent
- Utiliser la même logique de filtrage que dans `findMany`

### 4. Passer category depuis le controller

**Fichier** : `apps/api/src/listings/listings.controller.ts`

**Modifications** :
- Passer `category` à `searchByLocation` quand des coordonnées sont fournies

### 5. Passer category depuis useSearchListings

**Fichier** : `apps/web/src/hooks/useSearchListings.ts`

**Modifications** :
- S'assurer que `category` est bien envoyé dans les paramètres de requête à l'API

## Détails techniques

### Filtrage par catégorie corrigé

```typescript
// Dans findMany
if (category && type) {
  // Filtrer par category.slug via la relation
  where.category = {
    slug: { equals: category.toLowerCase().trim(), mode: 'insensitive' },
    vertical: type, // S'assurer que la catégorie correspond au bon type
  };
}
```

### Ajout de category à searchByLocation

```typescript
async searchByLocation(params: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  type?: ListingType;
  limit?: number;
  offset?: number;
  city?: string;
  startAt?: string;
  endAt?: string;
  category?: string; // Ajouter category
}): Promise<{ items: unknown[]; total: number }> {
  // ... code PostGIS ...
  
  // Après avoir récupéré les ids, filtrer par catégorie dans le findMany
  const ids = idsWithDistance.map((r) => r.id);
  
  const whereClause: Prisma.ListingWhereInput = {
    id: { in: ids },
    status: 'ACTIVE',
  };
  
  // Ajouter le filtre de catégorie si présent
  if (params.category && params.type) {
    whereClause.category = {
      slug: { equals: params.category.toLowerCase().trim(), mode: 'insensitive' },
      vertical: params.type,
    };
  }
  
  const items = await this.prisma.listing.findMany({
    where: whereClause,
    include: {
      photos: { orderBy: { order: 'asc' }, take: 5 },
      host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });
  
  // Réordonner selon l'ordre des ids
  const ordered = ids.map((id) => items.find((i) => i.id === id)).filter(Boolean) as typeof items;
  
  // ... reste du code ...
}
```

## Fichiers à modifier

1. **`apps/api/src/listings/listings.service.ts`**
   - Corriger le filtrage par catégorie dans `findMany` (ligne 306)
   - Ajouter `category` aux paramètres de `searchByLocation`
   - Filtrer par catégorie dans `searchByLocation` après PostGIS
   - Passer `category` au fallback `findMany`

2. **`apps/api/src/listings/listings.controller.ts`**
   - Passer `category` à `searchByLocation`

3. **`apps/web/src/hooks/useSearchListings.ts`**
   - Vérifier que `category` est bien envoyé dans les paramètres (déjà lu depuis l'URL)

## Tests à effectuer

1. Cliquer sur l'onglet "Citadine" → doit afficher les véhicules de cette catégorie
2. Rechercher avec une catégorie + ville → doit filtrer par les deux critères
3. Rechercher avec une catégorie + coordonnées → doit filtrer par les deux critères
4. Vérifier que le premier onglet (Nouveautés) continue de fonctionner
