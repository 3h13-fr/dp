# Canvas Listings — Location, Expérience, Chauffeur

Document de référence pour développer les différents listings (location, expérience, chauffeur) conformément au produit voulu. À utiliser par Cursor ou tout développeur pour implémenter les écrans et la logique.

---

## 1. Règle métier : véhicule et offres

**Un même véhicule peut être proposé :**
- à la **location** uniquement (self-drive),
- en **chauffeur** uniquement,
- ou **les deux** (location et chauffeur).

Dans tous les cas, **un seul calendrier** gère la disponibilité du véhicule : une réservation en location ou en chauffeur bloque les mêmes créneaux pour ce véhicule.

**Implémentation (en place) :**
- Un `Listing` par type (`ListingType` = `CAR_RENTAL` | `MOTORIZED_EXPERIENCE` | `CHAUFFEUR`). Le modèle **Vehicle** existe (Make, Model, VIN, etc.) et `Listing.vehicleId` est optionnel.
- **Calendrier par véhicule** : lorsqu’un listing a un `vehicleId`, les disponibilités sont stockées dans **VehicleAvailability** (un calendrier par véhicule, partagé par tous les listings de ce véhicule). Lecture/écriture (GET/PATCH availability) et vérification « plage disponible » utilisent ce calendrier. Les réservations (création) vérifient les chevauchements au niveau **véhicule** : une résa en location ou en chauffeur pour ce véhicule bloque les mêmes créneaux pour toute autre offre du même véhicule.
- Les listings sans `vehicleId` continuent d’utiliser **ListingAvailability** (un calendrier par listing).

---

## 2. Types de listings (schéma actuel)

| Type (Prisma)        | Usage frontend      | Description |
|----------------------|---------------------|-------------|
| `CAR_RENTAL`         | Location            | Location de véhicule (self-drive). Prix/jour, caution, catégorie, transmission, etc. |
| `MOTORIZED_EXPERIENCE` | Expérience        | Expérience motorisée (parcours, durée, nombre de participants). `durationMinutes`, `maxParticipants`. |
| `CHAUFFEUR`          | Chauffeur           | Véhicule avec chauffeur. `driverId` (User DRIVER), prix selon durée ou forfait. |

---

## 3. Accueil : onglets de navigation

- **Page d’accueil** (`/[locale]` ou `/`) : les trois types de listings sont **séparés et navigables par onglets**.
- Chaque onglet correspond à un type :
  - **Location** (CAR_RENTAL)
  - **Expérience** (MOTORIZED_EXPERIENCE)
  - **Chauffeur** (CHAUFFEUR)
- Au clic sur un onglet : navigation vers la **page listing dédiée** à ce type (voir §4), pas uniquement un filtre local sur la même page.
- L’accueil peut afficher un **aperçu** par type (ex. 3–6 annonces par onglet) avec lien « Voir tout » vers la page du type.

---

## 4. Une page listing par type + search form dédié

Chaque type a **sa propre route** et **sa propre page** avec un **formulaire de recherche (search form) adapté** au type.

### 4.1 Routes

Les routes réelles utilisées dans l’app sont les **verticales** sans préfixe `listings/` :

- `/[locale]/listings` — redirection vers `/[locale]/location` (avec query éventuelle).
- `/[locale]/location` — listings **Location** (CAR_RENTAL).
- `/[locale]/experience` — listings **Expérience** (MOTORIZED_EXPERIENCE).
- `/[locale]/ride` — listings **Chauffeur** (CHAUFFEUR).
- Détail d’une annonce : `/[locale]/location/[slug]`, `/[locale]/experience/[slug]`, `/[locale]/ride/[slug]` selon le type.
- Checkout : `/[locale]/location/[slug]/checkout`, `/[locale]/experience/[slug]/checkout`, `/[locale]/ride/[slug]/checkout`.

L’API supporte déjà le filtre `?type=CAR_RENTAL|MOTORIZED_EXPERIENCE|CHAUFFEUR` sur `GET /listings`.

### 4.2 Search form par type

- **Location** : lieu (ville, adresse ou lat/lng + rayon), dates (début / fin), éventuellement nombre de places, transmission, catégorie. Envoyer `type=CAR_RENTAL` + `city`/`country` ou `lat`/`lng`/`radius`.
- **Expérience** : lieu, date (ou période), durée ou thème si pertinent. `type=MOTORIZED_EXPERIENCE` + critères géo/dates.
- **Chauffeur** : lieu de prise en charge, date, heure, durée ou trajet. `type=CHAUFFEUR` + critères géo/dates.

Chaque page (`/location`, `/experience`, `/ride`) a **son propre composant de formulaire de recherche** (ex. `SearchBarLocation`, `SearchBarExperience`, `SearchBarChauffeur`) avec les champs et l’appel API adaptés. Les search bars redirigent vers `/[locale]/location`, `/[locale]/experience`, `/[locale]/ride` avec les paramètres de recherche.

### 4.3 Grille et détail

- Chaque page listing (location / experience / ride) affiche une **grille** d’annonces (composant type `ListingsGrid` ou équivalent) filtrée par `type`.
- Le détail est sur `/[locale]/location/[slug]`, `/[locale]/experience/[slug]` ou `/[locale]/ride/[slug]` ; la fiche peut adapter l’affichage (prix/jour, durée, chauffeur, etc.) selon le `listing.type`.

---

## 5. Navigation globale (header)

- Dans le header, **trois liens** (ou un menu) : **Location** (Véhicules), **Expérience**, **Chauffeur** (Courses), pointant vers `/[locale]/location`, `/[locale]/experience`, `/[locale]/ride`.
- Ou : un seul lien « Annonces » qui mène vers une page avec les trois onglets (comme sur l’accueil), puis chaque onglet mène à la page dédiée.

---

## 6. Récapitulatif technique

| Élément | Action |
|--------|--------|
| Accueil | Onglets Location / Expérience / Chauffeur → chaque onglet mène à la page du type. |
| Routes | `/[locale]/location`, `/[locale]/experience`, `/[locale]/ride` ; détail `/[locale]/{location,experience,ride}/[slug]` ; checkout `/…/[slug]/checkout`. |
| API | `GET /listings?type=CAR_RENTAL|MOTORIZED_EXPERIENCE|CHAUFFEUR` + city/country ou lat/lng/radius (déjà en place). |
| Search form | Un formulaire par page (location, experience, ride) avec champs adaptés au type ; soumission vers la même verticale avec query params. |
| Calendrier unique | À terme : un véhicule peut avoir plusieurs offres (location + chauffeur) partageant la même disponibilité (voir §1). |

---

## 7. i18n

- Ajouter les clés pour : **Location**, **Expérience**, **Chauffeur** (titres d’onglets, libellés de navigation, labels des search forms).
- Fichiers : `apps/web/messages/fr.json`, `apps/web/messages/en.json`.

Ce document constitue le **canvas de base** pour les listings ; toute évolution (ex. modèle Vehicle, calendrier partagé) doit rester cohérente avec ce qui est décrit ci‑dessus.
