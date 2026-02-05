# Design system — Référence Figma (Airbnb UI Kit)

Référence visuelle et source de vérité pour l’UI de la plateforme.

## Figma

**Airbnb UI Kit (Community)**  
https://www.figma.com/design/66fdWaCXgdEJVhMqdcXx2Q/Airbnb-UI-Kit--Community-?node-id=208-2874&p=f&t=3XG1FkFYFSYvKiNO-0

Ce fichier sert de base ; il pourra être dupliqué et modifié pour DrivePark (couleurs, typo, composants).

## Utilisation dans le projet

- **Couleurs, typographie, espacements, ombres** : définis dans `src/app/globals.css` (variables CSS) et `tailwind.config.ts`, alignés sur le kit.
- **Header / recherche** : style inspiré du header Airbnb (barre de recherche une ligne, bottom sheet mobile).
- **Composants** : boutons, champs, cartes listées peuvent s’appuyer sur les tokens ci‑dessous.

## Tokens (mapping Figma → code)

Les variables CSS dans `globals.css` reprennent les notions courantes du kit :

| Usage        | Variable CSS        | Figma (à recaler après vos modifs) |
|-------------|---------------------|-------------------------------------|
| Couleur principale (CTA, liens) | `--color-primary`   | Rausch / Coral (ex. #FF5A5F)        |
| Fond page   | `--background`      | Gris très clair                     |
| Texte       | `--foreground`      | Noir / gris foncé                   |
| Texte secondaire | `--muted-foreground` | Gris moyen                      |
| Bordures    | `--border`          | Gris clair                          |
| Rayon boutons / inputs | `--radius-button`, `--radius-input` | 8px, 50% (pill) |
| Ombres      | `--shadow-card`, `--shadow-dropdown` | Élévations du kit   |

Après modification du Figma, mettre à jour les valeurs dans `globals.css` et, si besoin, dans `tailwind.config.ts`.
