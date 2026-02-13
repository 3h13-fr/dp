# Workflow états des lieux

## Objectif

Vérifier périodiquement l’état fonctionnel du projet : routes accessibles, pages listings correctes, et parcours utilisateur E2E (auth, recherche, réservation, etc.).

## Commande unique

```bash
pnpm verify:state
```

Exécute dans l’ordre :

1. **verify:urls** — Vérification des routes API et frontend (codes HTTP attendus)
2. **verify:listings** — Vérification des pages listings (onglets, formulaires, redirections)
3. **test:e2e:no-server** — Tests E2E Playwright (auth, listings, booking, messages, admin, etc.)

## Prérequis

### 1. Base de données test

```bash
pnpm db:test:reset
```

Utilise `.env.test` si présent (avec `DATABASE_URL` pointant vers la base test), sinon `.env`.

### 2. Serveurs démarrés

L’API et le frontend doivent tourner avant d’exécuter le workflow :

```bash
# Terminal 1 — API (avec base test)
dotenv -e .env.test -- pnpm dev:api

# Terminal 2 — Frontend
pnpm dev:web
```

Ou avec une seule base :

```bash
pnpm dev
```

### 3. Navigateurs Playwright (premier run)

```bash
pnpm --filter web test:e2e:install-browsers
```

## Exécution

```bash
pnpm verify:state
```

En cas d’échec, le script s’arrête à la première étape en erreur. Corriger puis relancer.

## Détail des étapes

| Étape | Commande | Vérifie |
|-------|----------|---------|
| 1 | `verify:urls` | Toutes les routes API (18) et frontend (32+) répondent correctement |
| 2 | `verify:listings` | Accueil (onglets Location/Expérience/Chauffeur), redirection `/listings`, formulaires de recherche |
| 3 | `test:e2e:no-server` | Parcours smoke : auth, listings, booking, paiement, annulation, messages, host, admin, i18n |

## Quand l’exécuter

- Avant un push ou une PR
- Après une modification de routes ou de structure
- Périodiquement pour détecter les régressions

## Références

- [URL_VERIFICATION_STRATEGY.md](./URL_VERIFICATION_STRATEGY.md) — Détail de `verify:urls`
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) — Stratégie des tests E2E
- [E2E_TEST_SETUP.md](./E2E_TEST_SETUP.md) — Configuration des tests E2E
