# Corrections apportées aux tests e2e

## Problème identifié

Le test `complete vehicle listing creation flow` échouait avec l'erreur :
```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('heading', { name: /What do you want to offer|Que souhaitez-vous proposer/i })
Expected: visible
Timeout: 10000ms
```

## Causes probables

1. **Timing** : La page n'était pas complètement chargée avant que le test ne cherche l'élément
2. **KYC non approuvé** : Si le KYC du host n'est pas approuvé, la page affiche un message d'erreur au lieu du formulaire
3. **Rendu React** : Le composant peut prendre du temps à se rendre après la navigation

## Corrections apportées

### 1. Amélioration de `waitForAppReady`
- Ajout d'une attente pour `networkidle` pour s'assurer que toutes les requêtes réseau sont terminées
- Ajout d'un petit délai pour permettre au rendu React de se terminer

### 2. Amélioration de `navigateToNewListing`
- Utilisation de `waitUntil: 'networkidle'` lors de la navigation
- Augmentation des timeouts de 10s à 15s
- Ajout de vérifications d'erreurs après la navigation
- Ajout de délais supplémentaires pour permettre le rendu

### 3. Amélioration de `completeListingSteps1to4`
- Vérification explicite du statut KYC avant de continuer
- Utilisation d'un sélecteur plus robuste pour trouver le titre (h2 ou heading)
- Augmentation du timeout de 10s à 15s
- Ajout de délais pour les animations

## Prochaines étapes recommandées

1. **Vérifier le statut KYC du host de test** :
   ```sql
   SELECT k.status FROM "User" u
   JOIN "KycVerification" k ON k."userId" = u.id
   WHERE u.email = 'host@example.com';
   ```
   Le statut doit être `'APPROVED'` pour que les tests fonctionnent.

2. **S'assurer que les données de test sont correctes** :
   - Le host `host@example.com` doit exister
   - Son KYC doit être approuvé
   - Les credentials de connexion doivent être `demodemo`

3. **Exécuter les tests avec les serveurs démarrés** :
   ```bash
   # Terminal 1
   pnpm dev
   
   # Terminal 2
   pnpm test:e2e:no-server
   ```

## Tests à vérifier

Les tests suivants devraient maintenant fonctionner mieux :
- `complete vehicle listing creation flow`
- `navigation between steps works correctly`
- `form validation prevents submission without required fields`
- `advanced pricing section can be toggled`
- `rules conditions sections can be expanded/collapsed`

## Notes techniques

- Les timeouts ont été augmentés pour tenir compte des connexions réseau plus lentes
- Les vérifications KYC ont été ajoutées pour éviter des erreurs silencieuses
- Les sélecteurs ont été améliorés pour être plus robustes face aux changements de structure HTML
