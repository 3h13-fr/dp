# Architecture SEO scalable Europe

Documentation de l'architecture SEO dynamique et scalable à l'échelle européenne.

## 1. Routes et verticales

| Route | Description | Indexation |
|-------|-------------|------------|
| `/[locale]/location` | Grille location (CAR_RENTAL) | index |
| `/[locale]/location/[slug]` | Détail offre location | index si offre active |
| `/[locale]/location/[slug]/checkout` | Checkout | noindex |
| `/[locale]/experience` | Grille expériences | index |
| `/[locale]/experience/[slug]` | Détail offre expérience | index si offre active |
| `/[locale]/ride` | Grille courses (chauffeur) | index |
| `/[locale]/ride/[slug]` | Détail offre ride | index si offre active |

## 2. Modèle de données géographique

- **Country** : pays (code ISO, slug, name i18n, mediaUrl)
- **Region** : région (countryId, slug, name i18n, mediaUrl)
- **City** : ville (countryId, regionId?, slug, name i18n, lat/lng, seoPriority)

**Listing.cityId** : liaison optionnelle vers City. Les champs `city` et `country` restent en fallback pendant la migration.

## 3. Modèles SEO

- **SeoTemplate** : templates dynamiques (vertical, scope, key, template avec variables `{{cityName}}`, `{{offerCount}}`, etc.)
- **SeoOverride** : contenus personnalisés pour villes stratégiques (entityType, entityId, vertical, key, value)
- **MediaAsset** : médias avec fallback (city → region → country → générique)

## 4. Règles d'indexation (à implémenter)

- Seuil minimal : ex. ≥ 3 offres actives pour une page ville/verticale
- Villes stratégiques (`seoPriority > 0`) : toujours indexables
- `robots` meta : `noindex, follow` si non indexable

## 5. Génération du contenu (à implémenter)

- `renderSeoTemplate(template, vars, locale)` : remplace `{{cityName}}`, `{{offerCount}}`, etc.
- Résolution des overrides avant application du template

## 6. Backoffice (à implémenter)

- Données géographiques (CRUD Country, Region, City)
- Templates SEO (CRUD SeoTemplate)
- Règles d'indexation (seuils, priorité)
- Bibliothèque médias (MediaAsset)
- Overrides (SeoOverride pour villes stratégiques)
