# Tester les pages et formulaires Listings

## Test automatisé (sans navigateur)

Un script vérifie que les pages et formulaires sont accessibles et contiennent le bon contenu.

### 1. Démarrer l’app

Dans un terminal à la racine du projet :

```bash
pnpm dev
```

(Le front est sur http://localhost:3000, ou 3001 si 3000 est déjà pris.)

### 2. Lancer la vérification

Dans un autre terminal :

```bash
# Si le front est sur 3000 (défaut)
pnpm run verify:listings

# Si le front est sur 3001
VERIFY_WEB_URL=http://localhost:3001 pnpm run verify:listings
```

Le script contrôle :

- **Accueil** (`/en`, `/fr`) : présence des onglets Location, Expérience, Chauffeur
- **Redirection** : `/[locale]/listings` → `/[locale]/listings/location`
- **Page Location** : statut 200, titre « Location », formulaire (dates, lieu)
- **Page Expérience** : statut 200, titre « Experience » / « Expérience », formulaire
- **Page Chauffeur** : statut 200, titre « Chauffeur », formulaire (date, heure, durée)

En cas d’échec (serveur injoignable, délai dépassé), le script affiche un message et indique de lancer `pnpm dev`.

## Tests E2E Playwright

Les tests E2E (navigateur) pour les listings sont dans :

- `apps/web/e2e/listings.spec.ts` — onglets accueil, page location, détail
- `apps/web/e2e/routes.spec.ts` — redirection /listings, liens header
- `apps/web/e2e/i18n.spec.ts` — contenu FR/EN sur les pages listings

Pour les exécuter, le front (et si besoin l’API) doit tourner. Depuis `apps/web` :

```bash
# Installer les navigateurs (une fois)
pnpm exec playwright install chromium

# Lancer les tests (serveur déjà démarré sur 3000)
SKIP_WEBSERVER=1 pnpm exec playwright test e2e/listings.spec.ts e2e/routes.spec.ts e2e/i18n.spec.ts

# Si le front est sur 3001
SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3001 pnpm exec playwright test e2e/listings.spec.ts e2e/routes.spec.ts e2e/i18n.spec.ts
```

## Vérification globale des URLs

Le script `pnpm run verify:urls` inclut désormais les routes :

- `/[locale]/listings` (200 ou 302)
- `/[locale]/listings/location`
- `/[locale]/listings/experience`
- `/[locale]/listings/chauffeur`

Lancer après `pnpm dev` (et éventuellement avec `VERIFY_WEB_URL` / `VERIFY_API_URL` si les ports diffèrent).
