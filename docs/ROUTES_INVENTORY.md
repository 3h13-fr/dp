# Inventaire des routes Next.js vs checklist fonctionnelle

## Inventaire des pages (état actuel)

| Route | Fichier source | Dépendances API | Auth | État |
|-------|----------------|-----------------|------|------|
| `/` | (redirect → /en) | — | Non | OK |
| `/[locale]` | `app/[locale]/page.tsx` | — | Non | OK |
| `/[locale]/listings` | `app/[locale]/listings/page.tsx` | GET /listings (via ListingsGrid) | Non | OK |
| `/[locale]/listings/[id]` | `app/[locale]/listings/[id]/page.tsx` | GET /listings/:id | Non | OK |
| `/[locale]/listings/[id]/checkout` | `app/[locale]/listings/[id]/checkout/page.tsx` | POST /bookings | Oui (redirect login) | OK |
| `/[locale]/bookings` | `app/[locale]/bookings/page.tsx` | GET /bookings/my | Oui | OK |
| `/[locale]/bookings/[id]` | `app/[locale]/bookings/[id]/page.tsx` | GET /bookings/:id | Oui | OK |
| `/[locale]/bookings/[id]/pay` | `app/[locale]/bookings/[id]/pay/page.tsx` | GET /bookings/:id, POST /payments/create-payment-intent | Oui | OK |
| `/[locale]/login` | `app/[locale]/login/page.tsx` | POST /auth/login | Non | OK |
| `/[locale]/messages` | — | — | — | **404** |
| `/[locale]/admin` | `app/[locale]/admin/page.tsx` (redirect → users) | — | Oui (layout) | OK |
| `/[locale]/admin/users` | `app/[locale]/admin/users/page.tsx` | GET /admin/users | Oui | OK |
| `/[locale]/admin/listings` | `app/[locale]/admin/listings/page.tsx` | GET /admin/listings, PATCH /admin/listings/:id/status | Oui | OK |
| `/[locale]/admin/audit` | `app/[locale]/admin/audit/page.tsx` | GET /admin/audit-logs | Oui | OK |

**Note :** Les dossiers `app/admin/` (sans `[locale]`) existent mais ne sont pas utilisés par le routage actuel (middleware next-intl → tout sous `[locale]`).

---

## Comparaison avec la checklist fonctionnelle

| Page | Statut | Manque (vs checklist) | Fix proposé | Priorité |
|------|--------|------------------------|-------------|----------|
| `/[locale]` (accueil) | OK | Recherche : pas de sélection dates/heures, pas de filtres avancés type, pas de carte ni suggestions | Enrichir SearchBar + page résultats avec filtres, carte, dates | P2 |
| `/[locale]/listings` | OK | Pas de carte interactive, pas de filtres avancés (catégorie, boîte, énergie…), pas de tri par distance | Ajouter filtres, option carte, tri (API PostGIS déjà prête) | P2 |
| `/[locale]/listings/[id]` | OK | Pas de galerie HD dédiée, pas de calendrier dispo, pas d’avis/notes, pas de détail caution/assurance/annulation | Composants galerie, calendrier, bloc avis, bloc conditions | P2 |
| `/[locale]/listings/[id]/checkout` | OK | Pas de récap détaillé (options, assurances), pas de préautorisation caution explicite | Afficher récap + appeler création caution si besoin | P2 |
| `/[locale]/bookings` | OK | Pas de modification/annulation, pas de check-in/check-out digital, pas de support incident | Liens annulation, écrans check-in/out, déclaration sinistre | P2 |
| `/[locale]/bookings/[id]` | OK | Idem : pas d’annulation, check-in/out, incident | Idem | P2 |
| `/[locale]/bookings/[id]/pay` | OK | Facture/confirmation automatique (côté API/email) à vérifier | Vérifier webhook Stripe + email confirmation | P3 |
| `/[locale]/login` | OK | Pas d’inscription, pas de réinitialisation mot de passe | Page signup, page forgot-password | P2 |
| `/[locale]/messages` | **404** | Page absente (lien dans le header) | Créer page placeholder avec texte "Messages (à venir)" ou liste threads vide | **P1** |
| `/[locale]/admin/*` | OK | Pas de gestion catégories/villes, pas d’outils anti-fraude/KYC dédiés, pas d’analytics, pas de support/remboursements | Pages et API dédiées selon besoin | P3 |

---

## Résumé des corrections immédiates (P1)

- **`/[locale]/messages`** : route 404 car aucun fichier `app/[locale]/messages/page.tsx`. Fix : ajouter une page minimale pour que le lien du header ne casse pas. → **Corrigé** : `app/[locale]/messages/page.tsx` ajouté (placeholder « Coming soon »).

## Test de navigation (Playwright)

Un test E2E vérifie que les routes principales répondent et affichent le contenu attendu :

- Fichier : `apps/web/e2e/routes.spec.ts`
- Lancer l’app (`pnpm dev` depuis la racine), puis dans un autre terminal :
  ```bash
  cd apps/web && pnpm test:e2e
  ```
- Si le front tourne sur un autre port : `PLAYWRIGHT_BASE_URL=http://localhost:3001 pnpm test:e2e`
- Premier run : installer les navigateurs avec `npx playwright install`

---

## Légende

- **Auth** : page protégée (redirect login si non connecté) ou appel API protégé.
- **P1** : bloquant (404, lien cassé).
- **P2** : fonctionnalité manquante par rapport à la checklist, à planifier.
- **P3** : amélioration ou fonctionnalité secondaire.
