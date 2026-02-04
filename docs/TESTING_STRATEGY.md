# Stratégie de test recommandée (ordre et ratio)

**Objectif :** couvrir les flux critiques avec peu de tests mais très utiles.

---

## Ordre de priorité et ratio

| Priorité | Type | Nombre | Rôle |
|----------|------|--------|------|
| **#1** | Smoke E2E (Playwright) | 10–15 | Parcours vitaux, confiance rapide |
| #2 | Tests API (Jest/Supertest) | ciblé | Contrats, logique métier |
| #3 | Tests unitaires composants | minimal | Composants réutilisables complexes |

Les **smoke E2E** donnent le plus de confiance le plus vite : ils valident que les parcours utilisateur essentiels fonctionnent de bout en bout.

---

## A. Smoke tests E2E (priorité #1)

Environ **10–15 tests Playwright** qui valident les parcours vitaux de la marketplace.

### Parcours couverts

| # | Parcours | Fichier spec | Description |
|---|----------|--------------|-------------|
| 1 | **Signup / Login (client)** | `auth.spec.ts` | Connexion client → redirection accueil ou bookings |
| 2 | **Recherche → filtre → page annonce** | `listings.spec.ts` | Liste annonces (ex. ville Paris) → clic → détail annonce |
| 3 | **Réserver → payer (mode test) → confirmation** | `booking-payment.spec.ts` | Checkout → page paiement → carte test Stripe → statut confirmé |
| 4 | **Annuler → statut + remboursement** | `booking-cancel.spec.ts` | Annulation résa → statut CANCELLED (refund pending si payé) |
| 5 | **Messagerie** | `messages.spec.ts` | Ouvrir conversation (booking) + envoyer un message |
| 6 | **Avis après prestation** | *À ajouter quand UI review existe* | Pour l’instant : non implémenté côté UI |
| 7 | **Hôte : voir annonces** | `host.spec.ts` | Connexion hôte → dashboard → liste annonces (création/publier via API/Prisma pour l’instant) |
| 8 | **Hôte : calendrier** | *À ajouter quand UI calendrier existe* | Bloquer une date (non implémenté en UI) |
| 9 | **Admin : modérer une annonce** | `admin.spec.ts` | Admin → Listings → changer statut (ex. PENDING → ACTIVE) |
| 10 | **i18n** | `i18n.spec.ts` | Changer langue (FR/EN) + fallback EN sur locale invalide |
| 11 | **Campagne email** | *À ajouter quand feature existe* | Créer campagne → preview → envoi segment test → log |

Les tests doivent **toujours tourner sur une base de données « test » réinitialisée** (migrations + seed) pour avoir des données déterministes.

---

## Base de données « test » pour E2E

- Créer un fichier **`.env.test`** à la racine (copier `.env` et adapter) avec une base dédiée :
  ```bash
  DATABASE_URL="postgresql://user:pass@localhost:5432/mobility_test"
  ```
- Avant la suite E2E, réinitialiser la base test :
  ```bash
  pnpm run db:test:reset
  ```
  Cela exécute `migrate:deploy` puis `db:seed` avec les variables de `.env.test`.
- Les tests partent du principe que les comptes seed existent :  
  `client@example.com`, `host@example.com`, `mohamedsakho@drivepark.net` (admin) — mot de passe `demo`.  
  Une annonce active « Citadine centre Paris » (ville Paris) est créée pour le host.

---

## Exécuter les E2E

```bash
# 0. (Une fois) Installer les navigateurs Playwright
pnpm --filter web test:e2e:install-browsers

# 1. Créer .env.test (copier .env) avec DATABASE_URL pointant vers la base test.

# 2. Réinitialiser la base test (depuis la racine du monorepo)
pnpm run db:test:reset

# 3. Démarrer l’API (avec la base test) + Web
dotenv -e .env.test -- pnpm run dev:api   # terminal 1
pnpm run dev:web                           # terminal 2
# Ou en un seul terminal avec la même base : pnpm run dev (avec .env contenant la base test)

# 4. Lancer les smoke tests (avec le serveur déjà démarré)
cd /Applications/DP && pnpm --filter web test:e2e:no-server
```

**Erreur « Executable doesn't exist » (chromium_headless_shell) ?** Installer les navigateurs une fois :  
`pnpm --filter web test:e2e:install-browsers` (depuis la racine du projet).

Sans `webServer` en CI, définir `PLAYWRIGHT_BASE_URL` (et s’assurer que l’API utilise la base test).

---

## Récap ratio

- **E2E smoke :** 27 tests actifs (~10 specs), priorité #1, exécution avant chaque merge / déploiement.
- **API / unit :** à ajouter progressivement sur les modules critiques (paiements, annonces, auth).

---

## Stabilisation (résumé)

- **404 / edge cases API :** `GET /bookings/:id` et `PATCH /bookings/:id/status` renvoient désormais `404` (NotFoundException) quand la réservation n’existe pas ou que l’utilisateur n’est pas guest/host.
- **Annulation + remboursement :** L’annulation déclenche déjà le refund Stripe côté API ; la page détail réservation affiche un message « Un remboursement sera effectué si la réservation était payée » lorsque le statut est CANCELLED.
- **Litiges basiques :** Endpoint `POST /bookings/:id/report-issue` (body `{ message }`) enregistre un signalement dans l’audit log (visible en admin). Bouton « Signaler un problème » sur la page détail réservation (guest ou host).
- **E2E smoke (fichiers) :** `auth.spec.ts`, `listings.spec.ts`, `booking-payment.spec.ts`, `booking-cancel.spec.ts`, `messages.spec.ts`, `host.spec.ts`, `admin.spec.ts`, `i18n.spec.ts`, `routes.spec.ts` + `review.spec.ts` / `email-campaign.spec.ts` (skipped jusqu’à implémentation des features).
