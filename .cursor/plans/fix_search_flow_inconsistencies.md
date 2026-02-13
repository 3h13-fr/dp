# Plan : Correction des incohérences du flux de recherche

## Problèmes identifiés

1. **Backend retourne tous les véhicules** : Quand `city=Marseille` est fourni mais que Marseille n'est pas trouvé dans la table `City`, le backend fait un fallback vers recherche textuelle dans le champ `city` des listings, ce qui retourne TOUS les véhicules avec "Marseille" dans leur champ city, peu importe leur localisation géographique.

2. **Carte affiche Paris au lieu de Marseille** : Quand `city` est fourni mais pas `lat`/`lng`, la carte utilise `initialCenter` qui par défaut est Paris (48.8566, 2.3522) au lieu de centrer sur la ville recherchée.

3. **Recherche de ville peut échouer silencieusement** : La recherche dans la table `City` utilise `string_contains` sur un champ JSON, ce qui peut ne pas fonctionner correctement avec Prisma. Si la ville n'est pas trouvée, le fallback retourne tous les véhicules au lieu de rien.

4. **Frontend ne récupère pas les coordonnées de la ville** : Le frontend envoie seulement `city=Marseille` au backend, mais ne récupère pas les coordonnées pour centrer la carte et mettre à jour l'URL.

## Solutions

### 1. Améliorer la recherche de ville dans le backend

**Fichier** : `apps/api/src/listings/listings.service.ts`

- **Problème** : La recherche utilise `string_contains` sur un champ JSON qui peut ne pas fonctionner correctement.
- **Solution** :
  - Améliorer la recherche pour utiliser aussi une recherche textuelle directe sur le champ `name` JSON.
  - Utiliser `Prisma.sql` pour faire une recherche JSONB plus robuste si nécessaire.
  - Si la ville n'est pas trouvée, retourner une liste vide au lieu de faire un fallback vers recherche textuelle dans les listings.
  - Ajouter des logs pour diagnostiquer pourquoi une ville n'est pas trouvée.

**Alternative** : Créer un endpoint `/cities/search?q=Marseille` pour rechercher une ville et retourner ses coordonnées, puis utiliser ces coordonnées dans la recherche de listings.

### 2. Frontend : Récupérer les coordonnées de la ville avant la recherche

**Fichier** : `apps/web/src/components/listings/MapDrivenSearch.tsx`

- **Problème** : Quand `city` est fourni mais pas `lat`/`lng`, le frontend ne récupère pas les coordonnées de la ville.
- **Solution** :
  - Créer une fonction `fetchCityCoordinates(city: string)` qui fait une requête au backend pour obtenir les coordonnées.
  - Au chargement initial, si `city` est présent mais pas `lat`/`lng`, appeler cette fonction.
  - Une fois les coordonnées obtenues :
    - Mettre à jour l'URL avec `lat` et `lng`
    - Centrer la carte sur ces coordonnées
    - Faire la recherche avec ces coordonnées
  - Si la ville n'est pas trouvée, afficher un message d'erreur au lieu de retourner tous les véhicules.

**Fichier** : `apps/api/src/listings/listings.controller.ts` (nouveau endpoint)

- Créer un endpoint `GET /cities/search?q=Marseille` qui retourne les coordonnées de la ville.
- Ou modifier l'endpoint `/listings` pour retourner aussi les coordonnées de la ville recherchée dans la réponse.

### 3. Corriger le fallback dans findMany

**Fichier** : `apps/api/src/listings/listings.service.ts`

- **Problème** : Si la ville n'est pas trouvée dans la table `City`, le code fait un fallback vers recherche textuelle qui retourne tous les véhicules.
- **Solution** :
  - Si la ville n'est pas trouvée dans la table `City`, retourner une liste vide au lieu de faire un fallback.
  - Ou lever une exception `NotFoundException` pour indiquer que la ville n'a pas été trouvée.
  - Le frontend pourra alors afficher un message approprié.

### 4. Améliorer le centrage initial de la carte

**Fichier** : `apps/web/src/components/listings/MapDrivenSearch.tsx`

- **Problème** : `initialCenter` utilise Paris par défaut si pas de coordonnées.
- **Solution** :
  - Si `city` est fourni mais pas `lat`/`lng`, ne pas utiliser Paris par défaut.
  - Attendre que les coordonnées de la ville soient récupérées avant de centrer la carte.
  - Ou utiliser un état de chargement pour la carte jusqu'à ce que les coordonnées soient disponibles.

## Fichiers à modifier/créer

1. **Backend** :
   - `apps/api/src/listings/listings.service.ts` : Améliorer la recherche de ville et supprimer le fallback problématique
   - `apps/api/src/listings/listings.controller.ts` : Optionnel : créer endpoint `/cities/search`

2. **Frontend** :
   - `apps/web/src/components/listings/MapDrivenSearch.tsx` : Récupérer les coordonnées de la ville au chargement si nécessaire
   - `apps/web/src/lib/api.ts` : Ajouter fonction pour rechercher une ville (si endpoint créé)

## Détails techniques

### Recherche améliorée de ville

```typescript
// Dans listings.service.ts
if (city) {
  const cityLower = city.toLowerCase().trim();
  
  // Recherche améliorée dans la table City
  const matchingCity = await this.prisma.city.findFirst({
    where: {
      OR: [
        { slug: { equals: cityLower, mode: 'insensitive' } }, // Exact match sur slug
        { slug: { contains: cityLower, mode: 'insensitive' } }, // Partial match sur slug
        // Recherche dans le JSON name avec Prisma.sql pour plus de robustesse
        Prisma.sql`LOWER(name->>'en') LIKE ${`%${cityLower}%`}`,
        Prisma.sql`LOWER(name->>'fr') LIKE ${`%${cityLower}%`}`,
      ],
    },
    select: { latitude: true, longitude: true, id: true, slug: true },
  });
  
  if (matchingCity?.latitude != null && matchingCity?.longitude != null) {
    // Utiliser searchByLocation avec rayon de 20km
    return this.searchByLocation({
      latitude: matchingCity.latitude,
      longitude: matchingCity.longitude,
      radiusMeters: (radiusKm ?? 20) * 1000,
      type,
      limit,
      offset,
    });
  }
  
  // Si ville non trouvée, retourner liste vide au lieu de fallback
  return { items: [], total: 0 };
}
```

### Récupération des coordonnées côté frontend

```typescript
// Dans MapDrivenSearch.tsx
useEffect(() => {
  const city = searchParams.get('city');
  const hasCoords = searchParams.get('lat') && searchParams.get('lng');
  
  if (city && !hasCoords) {
    // Récupérer les coordonnées de la ville
    fetch(`${API_URL}/cities/search?q=${encodeURIComponent(city)}`)
      .then(res => res.json())
      .then(data => {
        if (data.latitude && data.longitude) {
          // Mettre à jour l'URL avec les coordonnées
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.set('lat', data.latitude.toString());
          newParams.set('lng', data.longitude.toString());
          router.push(`?${newParams.toString()}`, { scroll: false });
          
          // Centrer la carte et faire la recherche
          if (mapRef.current) {
            const map = mapRef.current.getMap();
            if (map) {
              map.flyTo({
                center: [data.longitude, data.latitude],
                zoom: 10,
                duration: 500,
              });
            }
          }
          
          // Faire la recherche avec les coordonnées
          fetchListings(data.latitude, data.longitude, 20000); // 20km
        } else {
          // Ville non trouvée, afficher message d'erreur
          setListings([]);
          setLoading(false);
        }
      })
      .catch(() => {
        setListings([]);
        setLoading(false);
      });
  }
}, [searchParams.get('city')]);
```

### Endpoint de recherche de ville (optionnel)

```typescript
// Dans listings.controller.ts
@Get('cities/search')
async searchCity(@Query('q') query?: string) {
  if (!query) {
    throw new BadRequestException('Query parameter q is required');
  }
  
  const city = await this.listings.findCityByName(query);
  if (!city) {
    throw new NotFoundException(`City "${query}" not found`);
  }
  
  return {
    id: city.id,
    slug: city.slug,
    name: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
  };
}
```

## Workflow corrigé

1. **Recherche initiale** :
   - Utilisateur saisit "Marseille" dans `HomeSearchBar`
   - Redirection vers `/location?city=Marseille&startAt=...&endAt=...`
   - `MapDrivenSearch` charge, détecte `city` mais pas `lat`/`lng`
   - Fait une requête pour obtenir les coordonnées de Marseille
   - Si trouvé : met à jour l'URL avec `lat`/`lng`, centre la carte, fait la recherche avec rayon de 20km
   - Si non trouvé : affiche message "Ville non trouvée" et liste vide

2. **Backend** :
   - Reçoit `city=Marseille` (ou `lat`/`lng` si déjà récupérés)
   - Cherche Marseille dans la table `City`
   - Si trouvé : utilise `searchByLocation` avec rayon de 20km
   - Si non trouvé : retourne liste vide (pas de fallback vers recherche textuelle)

3. **Affichage** :
   - La carte est centrée sur Marseille (ou la ville recherchée)
   - Seuls les véhicules dans un rayon de 20km sont affichés
   - La liste est synchronisée avec la carte
