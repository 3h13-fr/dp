# Test du login admin — analyse et procédure

## Résultat des tests effectués

### 1. API : login admin (curl)

- **Requête :** `POST http://localhost:4000/auth/login`  
  Body : `{"email":"admin@example.com","password":"demo"}`
- **Réponse :** HTTP **201**
- **Body :** `{"access_token":"...","expires_in":"7d","role":"ADMIN"}`
- **Conclusion :** Le login côté API fonctionne (bcrypt, JWT, rôle ADMIN).

### 2. Logs d’erreurs observés

| Contexte | Erreur | Cause |
|----------|--------|--------|
| Démarrage API | `EADDRINUSE: address already in use :::4000` | Le port 4000 est déjà utilisé par une autre instance de l’API. |
| Solution | Arrêter l’autre process ou utiliser un autre port | `pnpm kill:ports` (si configuré) ou `lsof -i :4000` puis `kill <PID>` |

Aucune erreur métier lors du login (pas d’erreur 401, 500, ni message d’invalid credentials).

### 3. Parcours frontend après login

1. **Login** (`/en/login`) : formulaire → `POST /auth/login` → réception de `access_token` et `role`.
2. **Redirection** : `router.push(\`/${locale}/admin\`)` → `/en/admin`.
3. **Dashboard** : la page admin redirige vers `/en/admin/users`.
4. **Layout admin** : au montage, `GET /auth/me` avec `Authorization: Bearer <token>`.
   - Si **200** : l’utilisateur est affiché, sidebar visible.
   - Si **401** : `clearToken()` puis `router.replace(\`/${locale}/login\`)`.

Points à surveiller en cas de problème :

- **CORS** : l’API autorise `http://localhost:3000` (ou `CORS_ORIGIN` dans `.env`). Si le front tourne sur un autre port, ajouter cette origine dans `CORS_ORIGIN`.
- **URL de l’API** : le front utilise `NEXT_PUBLIC_API_URL` ou par défaut `http://localhost:4000`. Vérifier que l’API est bien joignable à cette URL.
- **Réponse `/auth/me`** : doit contenir au moins `id`, `email`, `role` (ex. `ADMIN`). Le layout vérifie `user.role === 'ADMIN'`.

### 4. Test manuel recommandé

1. Démarrer l’API : depuis la racine du monorepo  
   `cd /Applications/DP && pnpm run dev:api`
2. Démarrer le front :  
   `cd /Applications/DP/apps/web && pnpm dev`
3. Ouvrir `http://localhost:3000/en/login`.
4. Saisir **admin@example.com** / **demo** → Sign in.
5. Vérifier la redirection vers `/en/admin` puis `/en/admin/users`, sidebar « Admin » visible.
6. Ouvrir les DevTools (F12) → onglet **Network** :  
   - `POST .../auth/login` → 201, body avec `access_token` et `role`.  
   - `GET .../auth/me` → 200, body avec `role: "ADMIN"`.  
7. Onglet **Console** : aucune erreur rouge.

### 5. Compte de test (seed)

- **Email :** `admin@example.com`
- **Mot de passe :** `demo`
- **Rôle :** ADMIN  

(Idem pour `host@example.com` et `client@example.com` avec le même mot de passe.)

### 6. Test e2e (Playwright)

Un test e2e « admin can log in and reach dashboard » a été ajouté dans `apps/web/e2e/routes.spec.ts`.

Pour l’exécuter en local :

```bash
cd /Applications/DP/apps/web
pnpm exec playwright install   # une fois, pour installer les navigateurs
# Démarrer l’API (autre terminal) : depuis /Applications/DP → pnpm run dev:api
pnpm test:e2e e2e/routes.spec.ts
```

Le test remplit le formulaire de login avec `admin@example.com` / `demo`, vérifie la redirection vers `/admin`, affiche les erreurs console et les requêtes auth en échec s’il y en a.
