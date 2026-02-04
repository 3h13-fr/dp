# Récapitulatif des tests E2E (Playwright)

Les tests sont dans `apps/web/e2e/`. Ils ciblent **http://localhost:3000** (variable `PLAYWRIGHT_BASE_URL`).

**Prérequis :** l’API doit tourner sur le port 4000 avec des données seed (users + listings), et le front sur 3000. La commande `pnpm run test:e2e` **ne démarre pas** le serveur web (mode `SKIP_WEBSERVER=1`).

---

## 1. **routes.spec.ts** — Navigation

| Test | Description |
|------|-------------|
| home redirects to locale and shows DrivePark | `/` → redirection vers `/en` ou `/fr`, lien DrivePark visible |
| /en loads home with nav tabs | Onglets Véhicules / Experiences / Chauffeur visibles |
| /en/listings loads (redirects to location) | `/listings` → `/listings/location`, titre "Location" |
| /en/login loads | Page login avec heading "Log in" |
| /en/messages loads (no 404) | Messages ou redirection login, pas de 404 |
| /en/bookings loads | Bookings ou login, heading "My trips" ou "Loading" |
| /en/admin redirects or shows admin content | Admin visible ou contenu admin |
| header links navigate to correct pages | Clic Véhicules → listings/location, Menu → Account → login |

---

## 2. **i18n.spec.ts** — Langues

| Test | Description |
|------|-------------|
| French locale shows French content on listings | `/fr/listings` → contenu FR, heading "Location" |
| English locale shows English content on listings | `/en/listings` → contenu EN |
| French home shows French content | `/fr` → DrivePark + "Véhicules" |
| English home shows English content | `/en` → DrivePark + "Vehicles" |
| invalid locale falls back to 404 or default | `/de/listings` → 404 ou redirection vers `/en` |

---

## 3. **listings.spec.ts** — Annonces

| Test | Description |
|------|-------------|
| home redirects to locale and shows DrivePark with nav tabs | Accueil avec onglets Véhicules, Expériences, Chauffeur |
| listings page loads and shows results for city filter | `/listings?q=Paris` → liste avec "listing(s) found", lien Citadine |
| click listing opens detail page with title and book button | Clic annonce → page détail "Citadine centre Paris" + bouton Réserver (data-testid listing-book-link) |

---

## 4. **auth.spec.ts** — Authentification

**Nécessite API + users seed :** `client@example.com`, `mohamedsakho@drivepark.net` (admin), `host@example.com` (mot de passe `demo`).

Les tests utilisent le **formulaire démo** (email + mot de passe) affiché quand `?demo=1` est présent dans l’URL (`/login?demo=1`). Cela permet de garder les E2E stables sans flux OTP.

| Test | Description |
|------|-------------|
| client can log in and is redirected to home | Login client → URL locale, lien DrivePark |
| admin can log in and reach dashboard | Login admin → URL `/admin`, texte Admin/Dashboard/Users/Listings/Audit |
| host can log in and reach host dashboard | Login host → URL `/host`, heading "Partner dashboard" / "Tableau de bord partenaire" |

---

## 5. **booking-payment.spec.ts** — Réservation et paiement

**Nécessite :** client loggé, API + listings seed (ex. Paris, Citadine).

| Test | Description |
|------|-------------|
| checkout creates booking and redirects to pay page | Recherche Paris → Citadine → Réserver → dates → "Continue to payment" → URL `/bookings/.../pay`, heading "Complete payment", EUR/Total |
| pay page shows payment form or Stripe message | Même flux → page pay affiche formulaire ou message Stripe/Total/No payment required/etc. |

---

## 6. **booking-cancel.spec.ts** — Annulation

**Nécessite :** client loggé, API + listings.

| Test | Description |
|------|-------------|
| client can cancel a pending booking and status becomes CANCELLED | Création réservation → page booking → bouton "Cancel booking" → accepter dialog → redirection liste → retour détail → statut CANCELLED |

---

## 7. **messages.spec.ts** — Messagerie

**Nécessite :** client loggé, API + listings + création réservation.

| Test | Description |
|------|-------------|
| after creating a booking, client can open messages and send a message | Login → recherche Paris → Citadine → checkout → pay → Messages avec bookingId → heading "Messages", texte Citadine/Marie/Dupont → saisie message → Send → message visible |

---

## 8. **host.spec.ts** — Espace partenaire

**Nécessite :** API + host seed + listing "Citadine centre Paris".

| Test | Description |
|------|-------------|
| host sees dashboard and at least one listing (seed) | Login host → URL `/host`, heading "Host dashboard", texte "Citadine centre Paris" |
| host can open a listing from dashboard | Login host → clic "View" → URL listing, heading "Citadine centre Paris" |

---

## 9. **admin.spec.ts** — Admin

**Nécessite :** API + admin seed.

| Test | Description |
|------|-------------|
| admin sees listings moderation page | Login admin → lien /admin/listings → heading "Listings (moderation)", texte "total" |
| admin can change listing status (ACTIVE ↔ SUSPENDED) | Page admin/listings → select status sur une ligne → changer → vérifier valeur → remettre valeur initiale |

---

## 10. **review.spec.ts** — Avis

| Test | Description |
|------|-------------|
| UI for leaving a review not yet implemented | **Skip** — à implémenter plus tard |

---

## 11. **email-campaign.spec.ts** — Campagne email

| Test | Description |
|------|-------------|
| Campaign feature not yet in app | **Skip** — à implémenter plus tard |

---

## Lancer les tests

```bash
# Depuis la racine du monorepo
cd /Applications/DP

# 1. Démarrer l’API (terminal 1)
pnpm run dev:api

# 2. Démarrer le front (terminal 2)
pnpm run dev:web

# 3. Lancer les tests E2E (terminal 3) — installe Chromium si besoin puis exécute les tests
pnpm run test:e2e
```

Ou tout en un (API + web) puis tests dans un autre terminal :

```bash
pnpm run dev
# puis dans un autre terminal :
pnpm run test:e2e
```

Rapport HTML : `apps/web/playwright-report/` (après exécution).
