---
name: design-system
description: Règles d'usage du design system de l'Espace Notarial (composants React, tokens de couleur, personnalisation par office). À utiliser dès qu'une tâche touche à frontend/src — écrire ou modifier un écran, un composant, une couleur, une classe CSS, une police, un espacement — et dès qu'il est question de personnalisation, d'apparence, de thème, de marque grise ou de couleurs d'office. À utiliser aussi avant d'ajouter une dépendance front (Tailwind, MUI, styled-components) ou de créer un nouveau composant : il en existe déjà 72, la réponse est presque toujours de composer.
---

# Design system — Espace Notarial

Ce front n'est pas une page libre : c'est la reconstruction d'un prototype
validé avec le client, dont chaque couleur est réglable par office. Deux
conséquences pour toute modification :

- **Une couleur écrite en dur ne sera jamais personnalisable.** L'étude qui
  repeint son espace en vert verra ce point rester violet, et personne ne le
  remarquera avant la démo.
- **Un composant recréé à la main diverge.** Les 72 composants existants portent
  déjà les états (survol, focus, vide, chargement) et l'accessibilité.

## Les trois réflexes, dans cet ordre

1. **Chercher le composant avant d'écrire du JSX.** `frontend/src/components/`
   est organisé en atoms / molecules / organisms / templates / pages. La liste
   complète est dans `references/composants.md`, et le catalogue interactif se
   lance avec `npm run dev` puis `?view=ui-kit` — chaque fiche montre le
   composant vivant et sa table de props, lue dans le code source.
2. **Prendre un token, jamais une valeur.** Toute couleur, tout rayon, toute
   police passe par `var(--…)`. Le catalogue des 56 tokens de couleur est dans
   `frontend/src/theme/schema.ts` (avec libellé français et valeurs claire et
   sombre) ; les autres variables sont dans `frontend/src/styles/tokens.css`.
3. **Vérifier avant de dire que c'est fini** : `npm run check:ds`. Le script
   attrape les trois dérives que ni TypeScript ni oxlint ne voient — couleur en
   dur, classe CSS inexistante, classe de composant recopiée.

## Où est quoi

| Chemin | Contenu |
|---|---|
| `frontend/src/styles/tokens.css` | les variables CSS — **la palette, source de vérité** |
| `frontend/src/styles/components.css` | tous les styles de composants ; ne consomme que des tokens |
| `frontend/src/components/{atoms,molecules,organisms,templates,pages}` | les 72 composants |
| `frontend/src/theme/` | moteur de personnalisation (schéma, calcul du CSS, provider) |
| `frontend/src/uikit/` | catalogue navigable (`?view=ui-kit`) |
| `frontend/src/data/demo.tsx` | données de démonstration des écrans pas encore branchés |
| `docs/design-system/DESIGN_SYSTEM.md` | la doc de référence (typographie, ombres, grilles) |
| `frontend/scripts/check-design-system.mjs` | le garde-fou |

## Règles non négociables

**Pas de couleur littérale hors `tokens.css`.** Ni `#fff`, ni `rgba(…)`, ni dans
un `style={{}}` JSX. Si la couleur voulue n'existe pas en token, c'est une
décision de design : la poser dans `TOKEN_SCHEMA` (voir plus bas), pas
l'écrire sur place.

**Pas de classe CSS qui n'existe pas.** Une classe inventée ne produit aucune
erreur — juste un élément nu, souvent dans un état qu'on ne regarde pas
(chargement, liste vide, message d'erreur). Toute classe doit être définie dans
`components.css`.

**Pas de bibliothèque de style.** Ni Tailwind, ni MUI, ni styled-components :
`package.json` ne contient que React. Le style est intégralement porté par les
deux fichiers CSS, et c'est ce qui rend la personnalisation par office possible.

**La sidebar garde sa palette sombre en thème clair.** Les tokens `--shell-*`
sont une zone de marque, pas une zone de contenu. Ce n'est pas un bug à
corriger.

**Formes rondes par défaut.** Boutons et pastilles sont des capsules
(`border-radius:999px`), les conteneurs utilisent `--radius-lg`. Seuls les
tableaux et les champs de saisie ont des angles droits.

**Trois polices, un rôle chacune.** Poppins (`--font-display`) pour les titres
et la marque, Inter (`--font-ui`) pour tout le reste, IBM Plex Mono
(`--font-mono`) pour les nombres, tailles de fichier et références. Jamais
Poppins dans du texte courant, jamais Inter dans un `h1`.

## Personnalisation par office : comment ça marche

Chaque office (étude notariale) règle ses couleurs, sa typographie et ses
formes depuis **Personnalisation → Apparence**. Le trajet complet :

1. `theme/schema.ts` déclare les tokens éditables (clé, libellé, groupe, valeur
   claire, valeur sombre).
2. `theme/engine.ts` transforme l'état en feuille de style (`:root`,
   `prefers-color-scheme`, `[data-theme]`) et l'injecte dans un `<style>`.
3. `theme/ThemeProvider.tsx` tient l'état, applique à chaque changement, et
   enregistre.
4. `api/theme.ts` transporte vers `GET`/`PUT /api/tenant-theme/` — c'est
   **l'office, côté serveur, qui fait foi**.
5. `localStorage` ne sert que de cache anti-flash, sous une clé **suffixée par
   sous-domaine d'office** (`ent-tenant-theme-v2:briand-hamon`). Ne jamais
   revenir à une clé globale : deux offices ouverts dans le même navigateur se
   repeindraient l'un l'autre.

Côté Django : `Office.theme` (JSONField, `null` = jamais personnalisé),
validation dans `datarooms/validators.py::clean_theme_payload`, vue
`datarooms/views.py::tenant_theme`. Lecture ouverte à tout membre, **écriture
réservée aux rôles `admin` et `superadmin`**. `GET` répond `204` quand l'office
n'a rien personnalisé — c'est ce qui distingue « pas de thème » de « thème
volontairement blanc », ne pas le remplacer par un `200 {}`.

### Ajouter un token éditable

1. Ajouter l'entrée dans `TOKEN_SCHEMA` (`theme/schema.ts`) : clé en
   kebab-case, `group`, `label` en français, valeurs `light` et `dark`.
2. Ajouter la variable correspondante dans `tokens.css`, dans les trois blocs
   (clair, `prefers-color-scheme: dark`, `[data-theme="dark"]`).
3. L'utiliser dans `components.css` via `var(--ma-cle)`.
4. Rien à faire côté Django : le backend stocke un dictionnaire ouvert, aucune
   migration n'est nécessaire pour une nouvelle couleur. C'est délibéré.
5. Vérifier dans `?view=ui-kit` que le token apparaît dans l'éditeur et que
   changer sa valeur repeint bien la page.

## Pièges déjà rencontrés

- **L'ordre des imports CSS compte** : `tokens.css` puis `components.css` dans
  `main.tsx`. Le second ne fait que consommer les variables du premier.
- **Ne pas réintroduire `src/index.css`** (template Vite) : il posait
  `#root { width: 1126px }` et redéfinissait `--bg`, `--border`, `--accent`, ce
  qui bridait l'app en colonne centrée et entrait en collision avec les tokens.
- **Dans `components.css`, ne jamais accoler un astérisque et une accolade**
  dans un commentaire : la séquence ferme le commentaire CSS par accident et
  fait sauter les règles suivantes sans aucune erreur.
- **Le UI kit et la maquette n'ont pas de backend.** `ThemeProvider` y est monté
  sans `transport` : la personnalisation y reste locale, c'est voulu. Ne pas
  « corriger » en branchant l'API, elle répondrait 403.
- **Un échec d'enregistrement doit se voir.** `saveError` du contexte remplace
  le badge « Enregistré » : afficher les deux ferait croire que la couleur est
  partie au serveur alors qu'elle n'est que locale.

## Avant de dire que c'est fini

```bash
cd frontend
npm run check:ds     # écarts au design system (référence : scripts/design-system-baseline.json)
npm run build        # tsc -b + vite build
npm run lint         # oxlint
```

Et si le backend a été touché :

```bash
cd backend
python manage.py test datarooms
python manage.py makemigrations --check --dry-run   # doit dire « No changes detected »
```

`check:ds` compare à une **référence** : les écarts hérités du prototype sont
acceptés, tout écart nouveau fait échouer. `--update-baseline` ne se lance
qu'après avoir corrigé — jamais pour faire taire le script.
