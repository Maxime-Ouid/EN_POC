---
name: design-system
description: Règles d'usage du design system de l'Espace Notarial (composants React, tokens de couleur, disposition de la navigation, personnalisation par office). À utiliser dès qu'une tâche touche à frontend/src — écrire ou modifier un écran, un composant, une couleur, une classe CSS, une police, un espacement, la navigation — et dès qu'il est question de personnalisation, d'apparence, de thème, de marque grise, de couleurs d'office ou de disposition du menu. À utiliser aussi avant d'ajouter une dépendance front (Tailwind, MUI, styled-components) ou de créer un nouveau composant : il en existe déjà plus de 90, la réponse est presque toujours de composer.
---

# Design system — Espace Notarial

Ce front n'est pas une page libre : c'est la reconstruction d'un prototype
validé avec le client, dont chaque couleur — et désormais la disposition de la
navigation — est réglable par office. Deux conséquences pour toute
modification :

- **Une couleur écrite en dur ne sera jamais personnalisable.** L'étude qui
  repeint son espace en vert verra ce point rester violet, et personne ne le
  remarquera avant la démo.
- **Un composant recréé à la main diverge.** Les composants existants portent
  déjà les états (survol, focus, vide, chargement) et l'accessibilité.

## Les trois réflexes, dans cet ordre

1. **Chercher le composant avant d'écrire du JSX.** `frontend/src/components/`
   est organisé en atoms / molecules / organisms / templates / pages. La liste
   est dans `references/composants.md`, et le catalogue interactif se lance avec
   `npm run dev` puis `?view=ui-kit` — chaque fiche montre le composant vivant
   et sa table de props, lue dans le code source.
2. **Prendre un token, jamais une valeur.** Toute couleur, tout rayon, toute
   police passe par `var(--…)`. Le catalogue des 55 tokens de couleur est dans
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
| `frontend/src/components/{atoms,molecules,organisms,templates,pages}` | les composants (92 fichiers) |
| `frontend/src/components/pages/v1/` | les 12 écrans de l'Espace Notarial **actuel** reconstruit |
| `frontend/src/theme/` | moteur de personnalisation (schéma, calcul du CSS, provider) |
| `frontend/src/api/` + `frontend/src/hooks/` | client HTTP, endpoints, hooks de données |
| `frontend/src/uikit/` | catalogue navigable (`?view=ui-kit`) |
| `frontend/src/v1/` | coquille de la reconstitution V1 (`?view=v1`, `?view=v1-app`) |
| `frontend/src/data/demo.tsx` | données de démonstration des écrans pas encore branchés |
| `docs/design-system/DESIGN_SYSTEM.md` | la doc de référence (typographie, ombres, grilles, §9 personnalisation) |
| `docs/espace-notarial-v1.md` | ce que fait l'application actuelle, écran par écran |
| `frontend/scripts/check-design-system.mjs` | le garde-fou |
| `frontend/scripts/gen-component-inventory.mjs` | régénère `references/composants.md` |

`references/composants.md` est **généré** : ne pas l'éditer à la main, corriger
le commentaire d'en-tête du composant puis relancer
`node scripts/gen-component-inventory.mjs` depuis `frontend/`. Limite connue :
le script ne descend pas dans les sous-dossiers, donc les 12 écrans de
`pages/v1/` n'y figurent pas — l'inventaire liste 80 fiches pour 92 fichiers.

## Les quatre vues du front

`main.tsx` lit `?view=` dans l'URL :

| URL | Ce qui est monté | Backend |
|---|---|---|
| *(aucune)* | l'application V2 branchée sur Django | oui |
| `?view=ui-kit` | le catalogue de composants | non |
| `?view=prototype-preview` | la reconstitution navigable du prototype V2 | non |
| `?view=v1` | l'Espace Notarial actuel, sur données de démonstration (`&screen=facturation` ouvre une rubrique) | non |
| `?view=v1-app` | la même navigation V1, branchée sur Django | oui |

Seules les vues « backend : oui » montent `ThemeProvider` avec un `transport`
(`usesBackend` dans `main.tsx`).

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

**Pas de largeur de navigation en dur.** `--nav-w` (rail) et `--nav-h` (barre
d'onglets) sont générés depuis le thème ; `.main` se décale avec
`calc(var(--nav-w) + var(--nav-gutter))`. Réintroduire un `236px` ou un
`padding-left:250px` recrée les deux constantes désynchronisées que ce mécanisme
a supprimées.

**Le rail reste `position:fixed` et `background:transparent`.** Ce n'est pas un
reliquat : c'est ce qui laisse le dégradé de `#app-main` courir sous lui d'un
bord à l'autre.

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

Chaque office (étude notariale) règle ses couleurs, sa typographie, ses formes
**et la disposition de sa navigation** depuis **Personnalisation → Apparence**
(`components/organisms/AppearanceTab.tsx`, écran généré depuis le schéma — aucun
champ n'y est écrit à la main). Le trajet complet :

1. `theme/schema.ts` déclare tout ce qui est éditable : `TOKEN_SCHEMA`
   (55 couleurs), `TYPOGRAPHY` et `SHAPE` (3 préréglages chacun), et le bloc de
   navigation `NAV_PLACEMENT` / `NAV_SIZE` / `NAV_DENSITY` / `NAV_ACTIVE` /
   `NAV_TOGGLES` avec `LAYOUT_DEFAULTS`.
2. `theme/engine.ts` transforme l'état en feuille de style (`:root`,
   `prefers-color-scheme`, `[data-theme]`) et l'injecte dans un `<style>` ;
   `applyLayoutAttributes` pose en plus les `data-nav-*` sur `<html>`.
3. `theme/ThemeProvider.tsx` tient l'état, applique à chaque changement, et
   enregistre. `applyThemeEarly()` (appelé dans `main.tsx`) applique le cache
   avant le premier rendu pour éviter le flash aux couleurs Notantis.
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

### Couleurs et disposition ne se traitent pas pareil

| | Couleurs (`colors`) | Navigation (`layout`) |
|---|---|---|
| Véhicule | custom properties `--<token>` | valeurs → `--nav-*` ; structure → `data-nav-*` sur `<html>` |
| Côté Django | dictionnaire **ouvert** : ajouter une couleur ne demande rien | **énumérations fermées** dans `validators.py::_clean_layout` |
| Absent du payload | valeurs par défaut du schéma | cas **normal** (thèmes d'avant le 28/08/2026) → `LAYOUT_DEFAULTS` |

Pourquoi cette différence : une valeur de couleur inconnue produit au pire une
teinte inattendue, alors qu'un `data-nav-placement` inconnu ne correspond à
aucun sélecteur — c'est-à-dire une navigation qui disparaît, sans message
d'erreur. Les quatre énumérations et les trois booléens sont donc bornés côté
serveur.

### Ajouter un token de couleur éditable

1. Ajouter l'entrée dans `TOKEN_SCHEMA` (`theme/schema.ts`) : clé en
   kebab-case, `group`, `label` en français, valeurs `light` et `dark`.
2. Ajouter la variable correspondante dans `tokens.css`, dans les trois blocs
   (clair, `prefers-color-scheme: dark`, `[data-theme="dark"]`).
3. L'utiliser dans `components.css` via `var(--ma-cle)`.
4. Rien à faire côté Django : le backend stocke un dictionnaire de couleurs
   ouvert, aucune migration n'est nécessaire. C'est délibéré.
5. Reporter dans le miroir Python `docs/design-system/tokens.py` (`TOKEN_SCHEMA`) —
   il sert au CSS généré hors navigateur (PDF, emails) et la divergence serait
   silencieuse.
6. Vérifier dans `?view=ui-kit` que le token apparaît dans l'éditeur et que
   changer sa valeur repeint bien la page.

### Ajouter une option de navigation

Différent du cas précédent : ici, **le backend doit suivre**.

1. Ajouter la clé dans la table concernée de `theme/schema.ts`
   (`NAV_PLACEMENT`, `NAV_SIZE`, `NAV_DENSITY`, `NAV_ACTIVE`, `NAV_TOGGLES`) —
   l'écran Apparence est généré, il n'y a rien à y ajouter.
2. Écrire la règle CSS correspondante dans `components.css`, sous le sélecteur
   `[data-nav-…]` attendu (ou consommer la nouvelle `--nav-*` si c'est une
   valeur).
3. **Ajouter la valeur à `THEME_NAV_ENUMS` (ou la clé à `THEME_NAV_FLAGS`) dans
   `backend/datarooms/validators.py`.** Sans ça, le `PUT` est refusé avec un
   message de validation et le réglage ne s'enregistre jamais.
4. Si le réglage change ce qui est *monté* (rail vs barre d'onglets), traiter le
   cas dans `templates/AppShell.tsx` / `organisms/NavBar.tsx` —
   `isHorizontalNav()` est le point de décision.
5. Vérifier les deux sens : `python manage.py test datarooms` (le validateur a
   des tests dédiés) et le rendu réel dans le navigateur.

Le détail du mécanisme (barre d'onglets bornée à 6 onglets, mode « icônes
seules » et son infobulle, panneau volant des sous-menus) est dans
`docs/design-system/DESIGN_SYSTEM.md` §9.6 — le lire avant de toucher à la
navigation, ces choix ont chacun une raison technique.

### Les miroirs du schéma

`theme/schema.ts` n'est pas seul : `index_16.html` (`window.TenantTheme`,
prototype de référence — **hors dépôt**, dans le dossier de travail `NotantisApp/`)
et `docs/design-system/tokens.py` (rendu hors navigateur)
portent le même schéma de **couleurs**, avec parité vérifiée caractère pour
caractère. Toute modification de `TOKEN_SCHEMA` doit y être reportée. Le bloc
`layout`, lui, n'existe que dans le front et le validateur Django — `tokens.py`
ne le connaît pas, et n'a pas à le connaître tant qu'aucun rendu serveur n'a
besoin de la navigation.

## Pièges déjà rencontrés

- **L'ordre des imports CSS compte** : `tokens.css` puis `components.css` dans
  `main.tsx`. Le second ne fait que consommer les variables du premier.
- **Ne pas réintroduire `src/index.css`** (template Vite) : il posait
  `#root { width: 1126px }` et redéfinissait `--bg`, `--border`, `--accent`, ce
  qui bridait l'app en colonne centrée et entrait en collision avec les tokens.
- **Dans `components.css`, ne jamais accoler un astérisque et une accolade**
  dans un commentaire : la séquence ferme le commentaire CSS par accident et
  fait sauter les règles suivantes sans aucune erreur.
- **Le UI kit, la maquette et `?view=v1` n'ont pas de backend.** `ThemeProvider`
  y est monté sans `transport` : la personnalisation y reste locale, c'est
  voulu. Ne pas « corriger » en branchant l'API, elle répondrait 403.
- **Un échec d'enregistrement doit se voir.** `saveError` du contexte remplace
  le badge « Enregistré » : afficher les deux ferait croire que la couleur est
  partie au serveur alors qu'elle n'est que locale.
- **Les variables `--nav-*` ne sont émises que dans `:root`**, jamais dans les
  blocs sombres : une largeur de rail ne change pas avec le thème, et l'y
  répéter ferait croire le contraire au prochain lecteur.
- **Une entrée de navigation est un `<button>`, pas un `<div onClick>`.** Les
  `<div>` ne recevaient ni le curseur pointeur (la règle
  `button/[role=button]/.clickable` ne les atteint pas) ni le focus clavier.
- **En mode « icônes seules », le libellé n'est jamais retiré du DOM** : il
  passe en infobulle, il reste lu par les lecteurs d'écran. Et les sous-menus ne
  sont pas masqués — ils deviennent un panneau volant, sinon les sous-entrées
  seraient inaccessibles.
- **Ne pas dupliquer une navigation dans une barre d'onglets** : la `TabStrip`
  de l'écran Personnalisation (V1) a été retirée parce que ses six sections
  figuraient déjà dans le sous-menu de la navigation — deux états à garder
  d'accord pour les mêmes six choix.

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

`check:ds` compare à une **référence** : les 56 écarts hérités du prototype sont
acceptés, tout écart nouveau fait échouer. `--update-baseline` ne se lance
qu'après avoir corrigé — jamais pour faire taire le script.

Si le script annonce d'un coup toute la référence en écarts nouveaux sans que
rien n'ait changé, c'est la référence qui n'est plus lue, pas le code qui a
régressé : `node scripts/check-design-system.mjs --self-test` le dit en trois
assertions (le cas s'est produit une fois, avec des chemins Windows en `\` face
à une référence en `/`).
