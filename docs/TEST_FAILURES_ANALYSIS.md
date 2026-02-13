# Analyse des échecs de tests e2e

## Résumé

Sur 50 tests e2e, **24 tests ont échoué** lors de l'exécution globale.

## Tests unitaires (API) ✅

- **Statut** : Tous réussis
- **Résultats** : 8 suites de tests, 60 tests passés
- **Temps** : ~17.7 secondes

## Tests e2e (Web) ❌

- **Statut** : 24 tests échoués sur 50
- **Temps total** : ~5.5 minutes

### Tests échoués par fichier

#### `host-listing-creation.spec.ts` (5 tests)
- `complete vehicle listing creation flow` (14.8s)
- `navigation between steps works correctly` (11.5s)
- `form validation prevents submission without required fields` (11.4s)
- `advanced pricing section can be toggled` (11.9s)
- `rules conditions sections can be expanded/collapsed` (11.9s)

#### `booking-payment.spec.ts` (4 tests)
- `checkout summary shows nights and total after filling dates` (4.8s)
- `checkout creates booking and redirects to pay page` (12.7s)
- `pay page shows payment form or Stripe message` (17.4s)
- `bookings list shows created booking after checkout` (17.1s)

#### `kyc.spec.ts` (3 tests)
- `host can open KYC page and sees status or form` (10.1s)
- `admin can open KYC review list` (5.4s)
- `admin can approve pending KYC and host then sees approved` (15.6s)

#### `listings.spec.ts` (3 tests)
- `click listing opens detail page with title and book button` (19.6s)
- `ride page loads and shows results for city filter` (12.4s)
- `click ride listing opens detail page with title and book button` (18.3s)

#### Autres fichiers (9 tests)
- `routes.spec.ts` : `/en/login loads` (401ms)
- `routes.spec.ts` : `header links navigate to correct pages` (16.5s)
- `admin.spec.ts` : `admin can change listing status` (24.1s)
- `auth.spec.ts` : `logged-in user can change password` (7.9s)
- `booking-cancel.spec.ts` : `client can cancel a pending booking` (19.8s)
- `booking-report-issue.spec.ts` : `client sees report issue button` (17.6s)
- `host.spec.ts` : `host can open listing detail` (16.3s)
- `messages.spec.ts` : `after creating a booking, client can send a message` (21.3s)
- `review.spec.ts` : `guest can leave a review` (11.9s)

## Causes probables

### 1. Serveur non démarré
- Le script `test:e2e:no-server` utilise `SKIP_WEBSERVER=1`, ce qui empêche Playwright de démarrer automatiquement le serveur
- Les tests essaient de se connecter à `http://localhost:3000` mais le serveur n'est pas disponible
- **Solution** : Utiliser `test:e2e` (sans `:no-server`) ou démarrer manuellement les serveurs avant les tests

### 2. API non démarrée
- Les tests e2e nécessitent que l'API soit accessible sur `http://localhost:4000`
- La configuration Playwright ne démarre que le serveur web, pas l'API
- **Solution** : Modifier la configuration pour démarrer les deux serveurs (API + Web)

### 3. Base de données non initialisée
- Certains tests nécessitent des données de test (listings, utilisateurs, etc.)
- La base de données peut ne pas être migrée ou seedée
- **Solution** : S'assurer que `pnpm db:migrate` et `pnpm db:seed` ont été exécutés

### 4. Problèmes de timing
- Certains tests peuvent échouer à cause de timeouts trop courts
- Les sélecteurs peuvent ne pas être trouvés assez rapidement
- **Solution** : Augmenter les timeouts ou améliorer les sélecteurs

## Solutions proposées

### Solution 1 : Utiliser le script avec serveur automatique

```bash
# Modifier le script pour utiliser test:e2e (sans :no-server)
pnpm test:e2e
```

La configuration Playwright démarrera automatiquement le serveur web.

### Solution 2 : Démarrer manuellement les serveurs

```bash
# Terminal 1 : Démarrer l'API et le Web
pnpm dev

# Terminal 2 : Lancer les tests
pnpm test:e2e:no-server
```

### Solution 3 : Créer un script de test complet

Créer un script qui :
1. Vérifie que la base de données est migrée et seedée
2. Démarre l'API et le Web en arrière-plan
3. Attend que les serveurs soient prêts
4. Lance les tests e2e
5. Arrête les serveurs après les tests

### Solution 4 : Améliorer la configuration Playwright

Modifier `playwright.config.ts` pour démarrer les deux serveurs :

```typescript
webServer: [
  {
    command: 'cd ../.. && pnpm dev:api',
    url: 'http://localhost:4000/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  {
    command: 'cd ../.. && pnpm dev:web',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
]
```

## Actions immédiates

1. ✅ Script `test:all` créé dans `package.json`
2. ✅ Configuration Playwright modifiée pour démarrer depuis la racine
3. ⏳ Vérifier que les serveurs peuvent être démarrés automatiquement
4. ⏳ Tester avec les serveurs démarrés manuellement
5. ⏳ Analyser les logs d'erreur détaillés pour identifier les causes spécifiques

## Prochaines étapes

1. Exécuter les tests avec les serveurs démarrés pour voir si cela résout les problèmes
2. Analyser les rapports HTML de Playwright pour voir les erreurs détaillées
3. Vérifier les logs de l'API et du Web pendant l'exécution des tests
4. Améliorer les timeouts et les sélecteurs si nécessaire
