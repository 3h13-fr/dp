# Stratégie de vérification des URLs (frontend + backend)

## Objectif

Vérifier automatiquement que **toutes les routes** du projet répondent correctement (pas de 500, pas de "module not found", pages accessibles) **avant** d’ajouter ou de modifier les fonctionnalités (login, booking, etc.).

## Périmètre

| Zone | Base URL | Ce qu’on vérifie |
|------|----------|------------------|
| **API** | `http://localhost:4000` | Chaque endpoint renvoie un code HTTP attendu (200, 201, 401, 404, etc.) et pas 500. |
| **Frontend** | `http://localhost:3000` | Chaque page (avec locale) renvoie 200 ou 307, et pas 500. |

## Inventaire des routes

### Backend (API NestJS)

- **GET** `/` — racine (infos API)
- **GET** `/health` — santé
- **GET** `/auth/me` — utilisateur courant (401 sans token)
- **POST** `/auth/login` — login (400/401 sans body)
- **GET** `/listings` — liste annonces
- **GET** `/listings/:id` — détail annonce
- **GET** `/listings/:listingId/reviews` — avis
- **GET** `/listings/:listingId/reviews/stats` — stats avis
- **GET** `/bookings/my` — mes réservations (401 sans token)
- **GET** `/bookings/:id` — détail résa (401/404)
- **GET** `/admin/users` — admin (401/403)
- **GET** `/admin/listings` — admin
- **GET** `/admin/audit-logs` — admin
- **GET** `/notifications` — (401 sans token)
- **GET** `/users/:id` — (401/404)
- **GET** `/payments/booking/:bookingId` — (401/404)
- **GET** `/messages/thread` — (401/400)
- **POST** `/uploads/presign` — (401/400)

### Frontend (Next.js, avec locale)

- `/` → 307 vers `/en`
- `/[locale]` → 200 (en, fr)
- `/[locale]/listings` → 200
- `/[locale]/listings/[id]` → 200 ou 404
- `/[locale]/listings/[id]/checkout` → 200 ou 404
- `/[locale]/bookings` → 200
- `/[locale]/bookings/[id]` → 200 ou 404
- `/[locale]/bookings/[id]/pay` → 200 ou 404
- `/[locale]/login` → 200
- `/[locale]/admin` → 200
- `/[locale]/admin/users` → 200
- `/[locale]/admin/listings` → 200
- `/[locale]/admin/audit` → 200

## Outil : script `verify-urls`

- **Fichier** : `scripts/verify-urls.mjs`
- **Commande** : `pnpm verify:urls` (depuis la racine)
- **Prérequis** : API et frontend démarrés (`pnpm dev`).

Le script :

1. Envoie une requête HTTP à chaque URL (API + frontend).
2. Compare le code de réponse à une liste de codes **acceptés** (ex. 200, 401, 404).
3. Affiche un rapport : OK / FAIL par URL.
4. Quitte avec code **1** si au moins une URL est en FAIL.

Codes acceptés par type :

- **API** : 200, 201, 400, 401, 403, 404, 422 selon l’endpoint (pas de 500).
- **Frontend** : 200, 307 (redirection vers locale).

## Quand l’exécuter

- Après un `pnpm dev` (ou avant un commit) pour s’assurer qu’aucune route n’est cassée.
- Après une modification de structure (nouvelle page, nouveau controller).
- En priorité **avant** de développer les fonctionnalités métier (login, booking, etc.).

## Corriger une URL en FAIL

1. Lire le rapport : URL + code reçu + codes attendus.
2. Si **500** : regarder les logs du terminal (Next ou Nest) pour l’erreur serveur.
3. Si **404** : vérifier que la route existe (fichier `page.tsx` ou méthode controller) et le chemin (locale, segment dynamique).
4. Si **module not found** (Next) : supprimer `.next` et relancer `pnpm dev`, puis relancer `pnpm verify:urls`.

## Mise à jour de l’inventaire

- **Nouvelle page Next** : ajouter l’URL dans `scripts/verify-urls.mjs` (section `frontendRoutes`).
- **Nouvel endpoint API** : ajouter méthode + path dans `scripts/verify-urls.mjs` (section `apiRoutes`).

## Workflow états des lieux (complet)

Pour une vérification complète incluant les tests E2E, utiliser :

```bash
pnpm verify:state
```

Cette commande enchaîne : `verify:urls` → `verify:listings` → `test:e2e:no-server`.

Voir [WORKFLOW_ETATS_DES_LIEUX.md](./WORKFLOW_ETATS_DES_LIEUX.md) pour les prérequis et le détail.
