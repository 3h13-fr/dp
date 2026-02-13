# Configuration des tests e2e

## Problème initial

Les tests e2e de création de listing échouaient systématiquement avec l'erreur :
```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('heading', { name: /What do you want to offer|Que souhaitez-vous proposer/i })
```

**Cause principale** : Le KYC n'était pas approuvé pour l'utilisateur host de test (`host@example.com`).

## Solution automatique

Un script de configuration automatique a été créé pour s'assurer que tout est prêt avant de lancer les tests :

```bash
pnpm test:setup
```

Ce script :
- ✅ Vérifie que les utilisateurs de test existent
- ✅ Crée ou approuve automatiquement le KYC pour `host@example.com`
- ✅ Affiche un résumé de la configuration

## Utilisation

### Option 1 : Configuration automatique (recommandé)

Les scripts de test incluent maintenant automatiquement la configuration :

```bash
# Les tests configureront automatiquement l'environnement avant de s'exécuter
pnpm test:e2e
pnpm test:e2e:no-server
pnpm test:all
```

### Option 2 : Configuration manuelle

Si vous préférez configurer manuellement :

```bash
# 1. Configurer l'environnement
pnpm test:setup

# 2. Lancer les tests (sans configuration automatique)
pnpm --filter web test:e2e:no-server
```

### Option 3 : Script SQL

Vous pouvez aussi utiliser le script SQL directement :

```bash
psql $DATABASE_URL -f scripts/approve-test-kyc.sql
```

## Améliorations apportées

### 1. Détection KYC améliorée

Les helpers de test détectent maintenant automatiquement si le KYC n'est pas approuvé et affichent des messages d'erreur clairs :

```
KYC verification is required before creating listings.
The host user (host@example.com) must have APPROVED KYC status.
Please ensure the test host has approved KYC before running tests.
```

### 2. Diagnostic amélioré

Si le contenu de la page n'est pas trouvé, les tests affichent maintenant :
- L'URL de la page
- Le titre de la page
- L'état de chargement
- Un extrait du contenu de la page
- Des suggestions sur les causes possibles

### 3. Scripts de configuration

- `scripts/setup-e2e-tests.mjs` : Configuration complète de l'environnement de test
- `scripts/approve-test-kyc.mjs` : Approuve uniquement le KYC
- `scripts/approve-test-kyc.sql` : Version SQL pour approuver le KYC

## Prérequis

Avant de lancer les tests e2e, assurez-vous que :

1. ✅ La base de données est migrée : `pnpm db:migrate`
2. ✅ Les utilisateurs de test existent (créés via seed ou manuellement)
3. ✅ Le KYC est approuvé pour `host@example.com` (fait automatiquement par `pnpm test:setup`)

## Dépannage

### Les tests échouent toujours avec "KYC not approved"

1. Vérifiez que le script de setup s'est exécuté correctement :
   ```bash
   pnpm test:setup
   ```

2. Vérifiez manuellement le statut KYC :
   ```sql
   SELECT u.email, k.status 
   FROM "User" u
   LEFT JOIN "KycVerification" k ON k."userId" = u.id
   WHERE u.email = 'host@example.com';
   ```

3. Si le KYC n'existe pas ou n'est pas approuvé, exécutez :
   ```bash
   pnpm db:approve-test-kyc
   ```

### Les tests échouent avec "Step 1 content not found"

Cela peut signifier :
1. Le KYC n'est pas approuvé (voir ci-dessus)
2. La page ne charge pas correctement (vérifiez que les serveurs sont démarrés)
3. Il y a une erreur JavaScript (vérifiez la console du navigateur dans les rapports Playwright)

### Les serveurs ne démarrent pas

Assurez-vous que :
- Les ports 3000 et 4000 sont libres : `pnpm kill:ports`
- La base de données est accessible
- Les variables d'environnement sont correctement configurées

## Commandes utiles

```bash
# Configuration complète de l'environnement de test
pnpm test:setup

# Approuver uniquement le KYC
pnpm db:approve-test-kyc

# Lancer tous les tests (unitaires + e2e)
pnpm test:all

# Lancer uniquement les tests e2e
pnpm test:e2e

# Lancer les tests e2e sans démarrer les serveurs (serveurs déjà démarrés)
pnpm test:e2e:no-server

# Voir les rapports de test
open apps/web/playwright-report/index.html
```

## Fichiers modifiés

- `apps/web/e2e/helpers.ts` : Améliorations des fonctions helper avec détection KYC
- `apps/web/e2e/host-listing-creation.spec.ts` : Améliorations des tests
- `package.json` : Ajout des scripts `test:setup` et `db:approve-test-kyc`
- `scripts/setup-e2e-tests.mjs` : Script de configuration automatique
- `scripts/approve-test-kyc.mjs` : Script pour approuver le KYC
- `scripts/approve-test-kyc.sql` : Version SQL pour approuver le KYC
- `docs/KYC_FOR_TESTS.md` : Documentation détaillée sur le KYC
- `docs/E2E_TEST_SETUP.md` : Ce document

## Notes

- Le script `test:setup` est appelé automatiquement avant `test:e2e` et `test:e2e:no-server`
- Si vous préférez ne pas exécuter la configuration automatique, utilisez directement les commandes Playwright
- Les messages d'erreur des tests ont été améliorés pour faciliter le diagnostic
