# Design system — Espace Notarial Next

> **Où vit la vérité.** Ce document décrit les tokens et les composants ; les
> valeurs qui font foi sont dans `frontend/src/styles/tokens.css` et
> `components.css`, qui ont continué d'évoluer depuis cette rédaction (fonds de
> cartes et dégradés de page passés en tokens éditables, notamment). En cas de
> divergence, le CSS a raison et ce document est à corriger.
>
> `tokens.json` et `tokens.py`, à côté, servent au code qui a besoin des valeurs
> hors navigateur : génération de PDF ou d'emails côté Django, scripts. Ce sont
> des copies — elles se régénèrent depuis `tokens.css`, elles ne se modifient
> pas à la main.

Extrait du prototype front-end « Espace Notarial Next » (maquette Notantis, artefact du 26/08/2026). Ce document décrit tous les tokens et composants visuels du prototype, avec pour objectif de permettre à un développeur Python (Flask/Django/FastAPI, génération de PDF, emails, etc.) de reproduire le style à l'identique sans avoir à rétro-ingénierier le HTML/CSS original.

Fichiers livrés à côté de ce document :

| Fichier | Contenu | Pour qui |
|---|---|---|
| `tokens.css` | Les ~60 custom properties CSS (couleurs, typo, rayons, ombres), thème clair + sombre | Tout gabarit HTML/Jinja2/Django servi par l'app |
| `components.css` | Tous les styles de composants (boutons, cartes, tableaux, formulaires…), ne consomme que `tokens.css` | Idem |
| `tokens.json` | Les mêmes tokens, à plat, en JSON (`light` / `dark`) | Tout outil non-Python qui a besoin des valeurs (design tools, scripts JS) |
| `tokens.py` | Les mêmes tokens en dict Python + un helper `resolve(theme)` | Génération PDF (ReportLab/WeasyPrint), graphiques (matplotlib/plotly), tout code Python qui a besoin d'une couleur/valeur sans dupliquer le CSS en dur |
| `style-guide.html` (publié en artefact) | Catalogue visuel interactif de tous les tokens et composants, rendu avec le vrai CSS | Référence visuelle, à garder ouverte pendant le dev |

Le prototype original est un fichier HTML unique (CSS et JS inline). Ce design system en a été **extrait verbatim** — aucune valeur n'a été réinterprétée ou arrondie.

---

## 1. Principes

1. **Un seul jeu de tokens, deux thèmes.** Toute couleur, ombre ou rayon passe par une custom property (`var(--xxx)`). Le thème sombre ne redéfinit que 54 des 60 tokens (les polices et quelques couleurs de marque fixes ne changent pas) — voir §3.
2. **Verre dépoli (glassmorphism) pour les surfaces flottantes.** Barre du haut, cartes de stats, cartes de contenu : fond semi-transparent + `backdrop-filter: blur(18px) saturate(160%)` + une ombre douce à deux couches (portée + reflet interne). C'est la signature visuelle du prototype, pas un simple `.card` classique.
3. **Deux typographies, un rôle chacune.** *Poppins* pour tout ce qui est titre/marque, *Inter* pour tout le reste, *IBM Plex Mono* pour les nombres et identifiants (tailles, poids de stockage, références). Ne jamais utiliser Poppins pour du texte courant ni Inter pour un `<h1>`.
4. **Formes rondes par défaut.** Boutons et pastilles (`pill`, `tag`, `btn`) sont en `border-radius:999px` (capsule). Les conteneurs (carte, modale) sont en `--radius-lg` (16px). Rien n'est à angle droit sauf les tableaux et les inputs.
5. **La sidebar et le contenu ont deux palettes distinctes.** La sidebar (`--shell-*`) reste sombre/violette même en thème clair — c'est une zone de marque, pas une zone de contenu. Le contenu (`--ink-*`, `--surface*`) suit le thème actif.

---

## 2. Typographie

| Rôle | Police | Token | Usage |
|---|---|---|---|
| Titres (h1–h4, marque) | Poppins 400/500/600/700 | `--font-display` | `.page-title`, `.section-title` (voir note), `.brand-name`, `h1`–`h4` |
| Texte courant / UI | Inter 400/500/600/700 | `--font-ui` | body, boutons, nav, formulaires |
| Nombres / code / identifiants | IBM Plex Mono 400/500 | `--font-mono` | `.mono` (stockage, tailles de fichier, références `#Q104`) |

Chargées via Google Fonts (`preconnect` + `<link>` — à servir localement ou garder le CDN Google selon votre politique réseau).

Échelle de tailles réellement utilisée dans le prototype (aucune n'est tokenisée — à fixer en variables si vous étendez le système, voir §7) :

| Taille | Usage |
|---|---|
| 34px | `h1` de l'écran de connexion |
| 27px | `.stat-value` (chiffres clés du dashboard) |
| 23px | `.page-title` |
| 20px | `h2` de la carte de connexion |
| 16.5px | `.brand-name` |
| 15.5px | `.section-title` |
| 15px | titre de panneau (`.doc-panel-head h3`) |
| 14.5px | **taille de base** (`body`), interligne 1.45 |
| 14px | paragraphes de la story de connexion |
| 13–13.5px | boutons, onglets, texte de carte |
| 11–12.5px | libellés, métadonnées, `.tiny`, `.dim` |
| 10–10.5px | éyebrows, sous-libellés en capitales (`letter-spacing:.08–.09em`) |

`text-wrap:balance` est posé sur tous les titres pour éviter les veuves.

---

## 3. Couleurs

Toutes les couleurs passent par des custom properties. Le thème sombre s'active soit automatiquement (`prefers-color-scheme: dark`), soit explicitement via `data-theme="dark"` posé sur `<html>` — utile pour un switch piloté par préférence utilisateur côté serveur (voir §8).

### Neutres / surfaces

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `--bg` | `#fafafd` | `#100d1f` | fond de page |
| `--surface` | `#ffffff` | `#171330` | cartes, inputs, modales |
| `--surface-alt` | `#f5f4fb` | `#1c1740` | fonds secondaires (lignes de tableau au survol, champ de recherche) |
| `--border` | `#e5e2f0` | `#332a5e` | bordures standard |
| `--border-soft` | `#eeecf7` | `#2a2350` | séparateurs discrets (lignes de tableau) |

### Texte (échelle `ink`)

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `--ink-900` | `#211c3d` | `#efedf7` | texte principal, titres |
| `--ink-800` | `#342f52` | `#ddd9ec` | texte secondaire fort |
| `--ink-700` | `#5b5773` | `#b3aecb` | libellés de formulaire |
| `--ink-500` | `#7d7896` | `#9d97ba` | texte atténué (`.dim`) |
| `--ink-400` | `#8783a0` | `#8983a8` | texte le plus discret (en-têtes de tableau, placeholders) |

### Marque & accent

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `--brand-ink` | `#1a1258` | `#1a1258` (fixe) | bouton primaire, ligne active de l'arborescence |
| `--brand-ink-hover` | `#241a63` | `#241a63` (fixe) | survol du bouton primaire |
| `--brass-700`→`--brass-100` | `#6b3fd4` → `#f0e9fc` | `#b99cf7` → `rgba(150,104,244,.16)` | violet accent — CTA secondaire, badges, focus ring, icônes actives |
| `--success` / `-bg` | `#2f8f5b` / `#e4f5ec` | `#7fbf9c` / `rgba(47,143,91,.18)` | statut positif |
| `--warning` / `-bg` | `#b9820f` / `#fbf0d6` | `#e3b25b` / `rgba(185,130,15,.20)` | statut d'attention |
| `--critical` / `-bg` | `#c13f3f` / `#fbe6e6` | `#e08a8a` / `rgba(193,63,63,.20)` | statut bloquant |
| `--info` / `-bg` | `#5b7bfb` / `#e9edfe` | `#8fa8ff` / `rgba(91,123,251,.20)` | statut neutre informatif |

### Coquille (sidebar) — palette fixe, indépendante du thème de contenu

| Token | Valeur | Usage |
|---|---|---|
| `--shell-bg` / `--shell-bg-2` | `#1a1258` / `#2c2170` | fond sidebar, sélecteur d'office |
| `--shell-text` / `--shell-text-dim` | `#ffffff` / `#b6acdb` | texte sidebar |
| `--shell-active` | `#342a7a` | item de nav actif |
| `--shell-border` | `rgba(255,255,255,.10)` | séparateurs internes |
| `--brand-strong` / `--brand-soft` | `#2a1c66` / `#4e3f96` (clair) → `#ffffff` / `#a89ed4` (sombre) | nom d'utilisateur et mention « propulsé par Notantis » en pied de sidebar — token ajouté spécifiquement pour corriger un problème de contraste (voir historique projet) |

**Corrigé le 26/08/2026** : le fond dégradé de `#app-main` (violet/bleu pastel) n'était défini que pour le thème clair — en mode sombre, ce même dégradé pâle continuait de s'appliquer et délavait certains textes. Une variante sombre dédiée existe maintenant (dégradé `--bg`→`--surface-alt` + halos radiaux violet/bleu discrets), posée via les deux mêmes hooks `@media(prefers-color-scheme:dark)` / `:root[data-theme="dark"]` qu'ailleurs dans ce document (voir §7 point 1).

---

## 4. Espacements, rayons, ombres

### Rayons

| Token | Valeur | Usage |
|---|---|---|
| `--radius-sm` | 6px | petits éléments (non systématiquement utilisé — voir note) |
| `--radius-md` | 10px | tenant-switcher, inputs de formulaire |
| `--radius-lg` | 16px | cartes, modales, écran de connexion |
| *(non tokenisé)* 999px / 99px | — | capsules : boutons, pills, tags, barres de progression |
| *(non tokenisé)* 50% | — | avatars (cercle) |

*Note de cohérence* : quelques éléments s'écartent de l'échelle avec des valeurs codées en dur proches mais non identiques : la topbar est en `9px` (au lieu de `--radius-sm` 6px), les icônes de ligne (`.row-icon`) en `7px`, le badge clavier (`kbd`) en `4px`. Mineur visuellement, mais à unifier si vous étendez le système (§7).

### Ombres

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(26,18,88,.06)` | `0 1px 2px rgba(0,0,0,.4)` | petits reliefs (bouton de toggle) |
| `--shadow-md` | `0 8px 24px rgba(26,18,88,.10)` | `0 8px 24px rgba(0,0,0,.45)` | *défini mais peu utilisé directement* |
| `--shadow-lg` | `0 24px 56px rgba(26,18,88,.16)` | `0 24px 56px rgba(0,0,0,.6)` | modales, slideover, carte de connexion |

*Note de cohérence* : l'ombre « verre dépoli » des cartes/topbar (`0 8px 30px rgba(20,23,26,0.08), inset 0 1px 0 rgba(255,255,255,0.5)`) est **codée en dur à 3 endroits** (`.topbar`, `.card`, `.stat-card`) plutôt que de passer par un token dédié (ex. `--shadow-glass`). Toujours en attente (§7 point 2). **Corrigé séparément le 26/08/2026** : `.card`/`.stat-card` avaient en plus un *fond* (pas seulement l'ombre) codé en dur — blanc à 50 % d'opacité quel que soit le thème — qui les rendait quasi invisibles en dark mode ; des overrides sombres dédiés ont été ajoutés (voir §6.2 et §7 point 2).

### Espacements

Il n'existe **pas d'échelle d'espacement tokenisée** dans le prototype (pas de `--space-1`, `--space-2`…) : les paddings/marges/gaps sont des valeurs en dur choisies au cas par cas (majoritairement 8, 9, 10, 12, 14, 16, 18, 20, 22, 26, 30px). C'est le principal manque du design system actuel — voir recommandation §7.

---

## 5. Icônes

Toutes les icônes sont un **sprite SVG inline** défini une fois en tête de document (`<svg style="display:none"><symbol id="i-home">…</symbol>…</svg>`, 33 symboles) puis référencées par `<svg class="icon"><use href="#i-home"/></svg>`. `.icon` est 16×16px par défaut (`stroke-width` ~1.6–1.9, `stroke:currentColor` — l'icône hérite la couleur du texte parent).

Symboles disponibles : `home, layers, folder, file, msg, users, clock, settings, search, bell, chevr (droite), chevd (bas), plus, down, up, link, shield, building, lock, tag, check, x, filter, dots, eye, clip, logout, grid, list, arrleft, seal, zip, send`.

Pour un rendu serveur Python (Jinja2/Django), le plus simple est de coller le bloc `<svg style="display:none">…</svg>` une fois dans le layout de base, puis d'utiliser `<svg class="icon"><use href="#i-xxx"/></svg>` dans les templates comme dans le prototype.

---

## 6. Composants

Chaque composant est documenté avec ses classes, ses variantes/états et un extrait de markup copié du prototype. Tous consomment uniquement les tokens de §3–4.

### 6.1 Boutons — `.btn`

```html
<button class="btn">Secondaire</button>
<button class="btn btn-primary">Primaire</button>
<button class="btn btn-accent">Accent</button>
<button class="btn btn-ghost">Discret</button>
<button class="btn btn-sm">Petit</button>
<button class="btn btn-accent btn-sm"><svg class="icon"><use href="#i-plus"/></svg> Avec icône</button>
```
Forme capsule (`radius:999px`), padding `8px 16px` (`5px 10px` en `.btn-sm`). Variantes : `btn` (défaut, bordure + fond surface), `btn-primary` (fond `--brand-ink`), `btn-accent` (fond `--brass-600`, action de création/positive), `btn-ghost` (transparent, action tertiaire). Pas d'état `disabled` ni `loading` stylé dans le prototype actuel — à ajouter si votre backend en a besoin.

### 6.2 Cartes — `.card`, `.stat-card`

```html
<div class="card card-pad">…</div>

<div class="stat-card">
  <div class="stat-top">
    <span class="stat-label">Dossiers actifs</span>
    <div class="stat-icon" style="background:var(--info-bg);color:var(--info);"><svg class="icon"><use href="#i-folder"/></svg></div>
  </div>
  <div class="stat-value mono">64</div>
  <div class="stat-delta up"><svg class="icon"><use href="#i-up"/></svg> +6 ce mois</div>
</div>
```
Traitement « verre dépoli » : fond blanc à 50 % + flou + bordure blanche translucide + ombre à deux couches (voir §4) **en thème clair** ; en thème sombre (corrigé le 26/08/2026), fond `rgba(23,19,48,.55)` + bordure `rgba(255,255,255,.08)` + ombre assombrie — sinon les cartes restaient blanches et illisibles sur fond sombre. `.stat-delta` a deux variantes de couleur : `.up` (positif, vert) et `.warn-delta` (orange). Grilles associées : `.grid.grid-4` / `.grid-3` / `.grid-2` (1.5fr/1fr), qui repassent à 1–2 colonnes sous 980px.

### 6.3 Statuts — `.pill`, `.tag`

```html
<span class="pill success">Actif</span>
<span class="pill warning">…</span>
<span class="pill critical">…</span>
<span class="pill info">…</span>
<span class="pill neutral">Clôturé</span>

<span class="tag"><svg><use href="#i-tag"/></svg>Vente</span>
<span class="tag plain">Prioritaire</span>
```
`.pill` = statut sémantique (couleur + fond pâle assortis, voir §3). `.tag` = classification libre (fond accent violet par défaut, ou `.plain` neutre). Les deux sont des capsules, taille de texte ~11.5px, très utilisées ensemble dans les tableaux.

### 6.4 Avatars — `.avatar`, `.avatar-stack`

```html
<div class="avatar">CD</div>                 <!-- 30px, initiales, fond violet -->
<div class="avatar sm">DB</div>               <!-- 24px -->
<div class="avatar sm gray">+6</div>          <!-- variante neutre, pour compteur -->
<div class="avatar-stack">
  <div class="avatar sm">DB</div><div class="avatar sm gray">BH</div><div class="avatar sm gray">+6</div>
</div>
```
`.avatar-stack` chevauche les avatars (`margin-left:-7px`) avec une bordure `--surface` pour les détacher visuellement.

### 6.5 Tableaux

```html
<div class="card"><div class="table-wrap">
<table>
  <thead><tr><th>Dossier</th><th>Statut</th><th></th></tr></thead>
  <tbody>
    <tr style="cursor:pointer;" onclick="…">
      <td class="row-name"><div class="row-icon" style="background:var(--info-bg);color:var(--info);"><svg class="icon"><use href="#i-folder"/></svg></div>Dossier de vente Caudan</td>
      <td><span class="pill success">Actif</span></td>
      <td><svg class="icon" style="color:var(--ink-400);"><use href="#i-dots"/></svg></td>
    </tr>
  </tbody>
</table>
</div></div>
```
En-têtes en capitales, `--ink-400`, 11px. Lignes séparées par `--border-soft`, survol en `--surface-alt`. `.row-name` associe systématiquement une icône de type de fichier (`.row-icon`, carré arrondi 7px coloré selon le type) au libellé.

### 6.6 Formulaires — `.field`, `.toggle`

```html
<div class="field-row">
  <div class="field"><label>Portefeuille</label><select>…</select></div>
  <div class="field"><label>Espace client</label><select>…</select></div>
</div>
<div class="field"><label>Nom</label><input type="text" placeholder="…"></div>

<button class="toggle on" onclick="this.classList.toggle('on')"></button>
```
Inputs/selects : fond `--surface`, bordure `--border`, `radius:8px`, focus = bordure `--brass-500` (pas d'anneau `outline`, sauf `:focus-visible` global à `--brass-500` 2px). `.toggle` est un interrupteur maison (36×20px, pastille blanche qui glisse), pas un `<input type="checkbox">` stylé — à garder à l'esprit pour l'accessibilité si vous le reproduisez (ajouter `role="switch"` + `aria-checked`).

### 6.7 Onglets — `.tabstrip`

```html
<div class="tabstrip">
  <div class="tab active" data-sub="sub-docs"><svg class="icon"><use href="#i-folder"/></svg> Documents</div>
  <div class="tab" data-sub="sub-qa">Questions / Réponses <span class="badge">7</span></div>
</div>
<div class="subscreen is-active" id="sub-docs">…</div>
<div class="subscreen" id="sub-qa">…</div>
```
Soulignement 2px `--brass-500` sur l'onglet actif. Bascule en JS pur (voir §8) : ajoute `.active`/`.is-active` sur l'onglet et le panneau ciblés par `data-sub`, retire ailleurs. Il existe une deuxième instance parallèle (`data-sub2` / `.subscreen2`) pour un second groupe d'onglets sur la même page (écran statistiques).

### 6.8 Arborescence de documents — `.explorer`

```html
<div class="explorer">
  <div class="tree">
    <div class="tree-node">
      <div class="tree-row open" onclick="toggleTree(this)">
        <svg class="icon chev"><use href="#i-chevr"/></svg>
        <svg class="icon fic"><use href="#i-folder"/></svg>
        1. Aspects sociétaires<span class="tree-count">6</span>
      </div>
      <div class="tree-children open">
        <div class="tree-row active">…</div>
      </div>
    </div>
  </div>
  <div class="doc-panel">…</div>
</div>
```
Layout deux colonnes (`grid-template-columns:250px 1fr`) : arbre à gauche (fond `--surface-alt`), panneau de documents à droite (tableau, voir §6.5). Le chevron pivote 90° à l'ouverture (`.tree-row.open > svg.chev{transform:rotate(90deg)}`). Ligne sélectionnée en fond `--brand-ink`.

### 6.9 Fil d'activité — `.feed-item`

```html
<div class="feed-item">
  <div class="feed-icon" style="background:var(--info-bg);color:var(--info);"><svg class="icon"><use href="#i-file"/></svg></div>
  <div><div class="feed-text"><b>Delphine Briand</b> a déposé <b>3 pièces</b>…</div><div class="feed-time">Aujourd'hui, 10:42</div></div>
</div>
```
Icône colorée selon le type d'évènement (dépôt = info, question = warning, membre = success, export = accent, suppression = critical) — c'est une convention à documenter côté produit, pas une règle CSS automatique : le choix de couleur par type d'évènement doit être fait dans le code Python qui rend le feed.

### 6.10 Questions/réponses — `.qa-card`

```html
<div class="qa-card">
  <div class="qa-head">
    <span class="pill warning">Sans réponse</span>
    <span class="qa-obj">Question sur : EHF réel 15.07.2026</span>
    <span class="qa-meta">Réf. #Q104 · Sandrine ACQUÉREUR · aujourd'hui 09:15</span>
  </div>
  <div class="qa-body">« … »</div>
  <div class="qa-reply">
    <textarea placeholder="Répondre…"></textarea>
    <button class="btn btn-accent btn-sm"><svg class="icon"><use href="#i-send"/></svg> Répondre</button>
  </div>
  <!-- ou, si déjà répondu : -->
  <div class="qa-answer"><b>Delphine Briand</b> — « … » <span class="dim tiny">· hier 17:02</span></div>
</div>
```

### 6.11 Modale — `.overlay` / `.modal`

```html
<div class="overlay is-active" id="modal-new">
  <div class="modal">
    <div class="modal-head"><div>Nouveau dossier</div><svg class="icon" onclick="closeModal('modal-new')"><use href="#i-x"/></svg></div>
    <div class="modal-body">…</div>
    <div class="modal-foot">
      <button class="btn" onclick="closeModal('modal-new')">Annuler</button>
      <button class="btn btn-primary">Créer</button>
    </div>
  </div>
</div>
```
Centrée, `width:560px`, fond assombri `rgba(20,20,15,.42)`. Le `.tpl-option` (sélecteur de modèle) est réutilisé ici dans la modale de création.

### 6.12 Panneau latéral — `.slideover`

```html
<div class="slideover is-active" id="doc-slideover">
  <div class="slideover-head">…</div>
  <div class="slideover-body">
    <div class="so-field"><div class="k">Emplacement</div><div class="v">…</div></div>
  </div>
</div>
```
340px de large, ancré à droite, glisse via `transform:translateX()` (transition 0.18s). `.so-field` reprend le motif clé/valeur de `.meta-item` (§6.13) mais en disposition verticale.

### 6.13 Bandeau de métadonnées — `.meta-banner`

```html
<div class="meta-banner">
  <div class="meta-item"><div class="k">Créé le</div><div class="v">19 mai 2026 · Cyril Dumont</div></div>
  <div class="meta-item"><div class="k">Documents</div><div class="v">312 fichiers</div></div>
</div>
```

### 6.14 Navigation (sidebar) — `.sidebar`, `.nav-item`

```html
<aside class="sidebar">
  <div class="brand">…</div>
  <div class="tenant-switcher clickable">…</div>
  <nav class="nav">
    <div class="nav-group">
      <div class="nav-label">Général</div>
      <div class="nav-item active" data-screen="dashboard"><svg class="icon"><use href="#i-home"/></svg> Accueil</div>
      <div class="nav-item" data-screen="datarooms"><svg class="icon"><use href="#i-folder"/></svg> Dossiers <span class="badge">245</span></div>
    </div>
  </nav>
  <div class="sidebar-foot">…</div>
</aside>
```
`position:fixed`, largeur fixe 236px — le conteneur `.main` compense avec `padding-left:250px`. **Point d'attention en responsive** : ce couple fixed+padding n'a pas de repli mobile dans le prototype (pas de media query en dessous de 980px pour la sidebar) — à traiter si l'app doit être utilisable sur petit écran.

### 6.15 Écran de connexion — `.login-shell`

Deux colonnes : `.login-story` (fond `--shell-bg`, pitch produit + badges de confiance) et `.login-panel` (fond clair, `.login-card` centrée en verre dépoli). Les deux zones partagent un système de formes décoratives flottantes animées (`.accent-sq`, `.dot-grid`, `.login-orb`/`.app-orb`) — carrés à coins arrondis en `%` (pas en px, pour éviter l'effet cercle à grande taille), grilles de points en `radial-gradient` répété, animation `loginFloat` (translation + légère rotation, 7 à 16s, décalages aléatoires) désactivée sous `prefers-reduced-motion: reduce`. Un effet de parallaxe au pointeur est ajouté en JS sur `.login-panel` (voir §8).

Ce système décoratif est purement esthétique et peut être omis sans casser la mise en page — c'est le seul bloc du design system qui n'a pas de rôle fonctionnel.

---

## 7. Dette identifiée / pistes d'industrialisation

Points à corriger ou trancher avant d'aller plus loin, par ordre d'impact :

1. ~~**Fond de `#app-main` non défini pour le thème sombre**~~ — **corrigé le 26/08/2026.** Le dégradé pastel clair délavait certains textes en dark mode (ex. le "312" du dashboard) ; deux blocs `@media(prefers-color-scheme:dark)` / `:root[data-theme="dark"]` posent désormais un dégradé + halos radiaux adaptés (voir §3).
2. ~~**Fonds « verre dépoli » codés en dur, indépendants du thème**~~ — **corrigé le 26/08/2026.** Au-delà de l'ombre, `.card`/`.stat-card` avaient un fond blanc à 50 % d'opacité et une bordure blanche fixes quel que soit le thème — quasi invisibles en dark mode. Des overrides dédiés (`rgba(23,19,48,.55)` / bordure `rgba(255,255,255,.08)`) ont été ajoutés ; la piste d'un token `--shadow-glass`/`--card-glass-bg` unique partagé avec `.topbar` reste à faire (les opacités clair diffèrent — 50 % pour les cartes, 85 % pour la topbar — donc une fusion naïve romprait l'un des deux looks).
3. **Aucune échelle d'espacement tokenisée** (§4) — chaque padding/margin est une valeur ad hoc. Recommandation : introduire `--space-1` à `--space-8` sur une base de 4px (4/8/12/16/20/24/32/40) et migrer progressivement.
4. **Petits écarts de rayon** (`9px`, `7px`, `4px` hors échelle `--radius-sm/md/lg`, §4).
5. **Pas de repli mobile pour la sidebar fixe** (§6.14).
6. **`.toggle` n'est pas un composant accessible** — pas de sémantique de case à cocher/interrupteur (§6.6).
7. **Pas d'états `disabled`/`loading` sur les boutons et formulaires** — à définir avant intégration back-end réelle (le prototype est un aperçu statique, sans état de chargement).

---

## 8. Comportements JS du prototype

Le prototype est un fichier unique sans framework : la navigation change juste des classes CSS (`is-active`, `active`, `open`). Utile à connaître même si vous réimplémentez ça côté serveur/framework Python (rendu de pages distinctes plutôt que classes JS) :

| Fonction JS | Effet |
|---|---|
| `showScreen(name)` | bascule l'écran principal actif (`.screen.is-active`), l'item de nav actif, et le fil d'ariane |
| `openDataroom()` / retour liste | affiche l'écran détail d'un dossier |
| onglets `data-sub` / `data-sub2` / `data-sub3` | bascule `.tab.active` + `.subscreen(2\|3).is-active` — `data-sub3`/`.subscreen3` est l'espace de noms dédié à l'écran Personnalisation (§10), pour ne pas entrer en collision avec `data-sub2` (déjà utilisé, avec un scope différent, par l'écran Statistiques) |
| `toggleTree(row)` | ouvre/ferme un nœud de l'arborescence de documents |
| `openModal(id)` / `closeModal(id)` | ajoute/retire `.is-active` sur `.overlay` |
| `openDoc(row,name,loc)` / `closeSlideover()` | remplit et ouvre le panneau latéral de fiche document |
| `goApp()` / `goLogin()` | bascule entre écran de connexion et application |
| parallaxe pointeur (IIFE en tête de script) | déplace légèrement `.login-orb`/`.login-card` selon la position du curseur sur `.login-panel`, désactivé si `prefers-reduced-motion` |

Le thème (clair/sombre) n'a **pas de contrôle UI** dans le prototype actuel — il suit uniquement `prefers-color-scheme`. Le hook `data-theme="dark"|"light"` existe déjà dans le CSS (§3) et est prêt à être piloté par votre backend (ex. préférence utilisateur en base, posée en attribut sur `<html>` au rendu serveur).

---

## 9. Personnalisation par l'étude (« marque grise ») — écran Apparence

Ajouté le 26/08/2026, révisé le même jour dans l'après-midi. Le prototype expose un écran **Personnalisation → Apparence** (`#screen-settings`, onglet `data-sub3="sub3-apparence"`) où une étude notariale peut modifier sa propre déclinaison du design system, avec effet immédiat sur tout le tableau de bord (sidebar, boutons, badges, cartes, fonds, statuts, typographie, coins arrondis). **Cette logique est pensée pour la production, pas seulement pour la démo** : elle est portée à la fois en JS (prototype, `window.TenantTheme`) et en Python (`tokens.py`), avec parité numérique vérifiée entre les deux — un futur backend peut donc calculer exactement le même CSS qu'un rendu déjà appliqué côté client.

### 9.1 Historique : d'une dérivation à 2 ancres vers l'édition totale

La première version (26/08/2026 matin) limitait l'édition à 2 couleurs ancres — « couleur principale » et « couleur d'accent » — et calculait tout le reste (survols, fonds pâles, variante sombre) par des écarts HSL mesurés une fois sur la palette Notantis d'origine. L'objectif était de garantir la cohérence par construction plutôt que par discipline de l'utilisateur. Mais un audit a montré que **les fonds et dégradés de l'application (`#app-main`) et le fond des cartes (`.card`/`.stat-card`) étaient en réalité codés en dur dans le CSS des composants**, sans variable pilotable du tout — les tokens `--app-grad-1..4` existaient dans `tokens.css` mais n'étaient référencés par aucune règle. Résultat concret : même les 2 ancres ne permettaient pas de changer ces fonds, ce que l'utilisateur a signalé directement (« je ne peux pas changer les couleurs et gradient des background »), accompagné d'une demande plus large : **rendre absolument toutes les variables éditables, y compris les couleurs de texte, d'icônes et de statut** — en rejetant explicitement l'option d'étendre le modèle à dérivation.

Deux changements en ont découlé :

1. **Correction du bug** : `#app-main` et `.card`/`.stat-card` consomment désormais réellement des variables CSS (`--app-grad-base-from/to`, `--app-grad-1..4`, `--card-bg`, `--card-border`) au lieu de couleurs figées dans les règles — ces fonds sont maintenant pilotables, ce qu'ils n'ont jamais été avant cette révision.
2. **Changement d'architecture** : abandon complet de la dérivation HSL au profit d'un **schéma plat et déclaratif** (`TOKEN_SCHEMA`, 55 variables) où chaque couleur — y compris les 4 couleurs de statut (succès/alerte/bloquant/info) — est éditable indépendamment, par thème clair/sombre, sans aucun calcul dérivé entre tokens. Il n'y a donc plus de garde-fou de cohérence automatique : une étude peut en théorie choisir des couleurs peu contrastées. C'est un compromis assumé et explicitement demandé par l'utilisateur, à mettre en balance avec un contrôle éditorial (charte imposée par Notantis) si le produit réel l'exige.

### 9.2 Le schéma de tokens (`TOKEN_SCHEMA`)

Chaque entrée du schéma décrit une variable CSS éditable :

- `key` — nom de la variable CSS (sans le préfixe `--`).
- `group` — regroupement pour l'UI (8 groupes, voir `GROUPS` : *Fonds & surfaces*, *Dégradé de fond*, *Cartes*, *Texte*, *Marque & accent*, *Barre latérale*, *Statuts*, *Écran de connexion*).
- `label` — libellé affiché à l'utilisateur.
- `type` — `hex` (couleur opaque, un seul input couleur), `rgba` (couleur + input d'opacité en %, recomposé en `rgba()` si l'opacité est < 100 %), ou `orb` (halo radial à 2 arrêts — seule la teinte est éditable ; l'écart d'opacité centre/bord `a_from`/`a_to` reste fixe par thème pour préserver l'effet de lueur, ce n'est pas une dérivation entre tokens mais une simple recomposition de format).
- `light` / `dark` — valeurs par défaut (celles de la palette Notantis d'origine) pour chaque thème.

Les 55 variables couvrent : fonds et surfaces, dégradé de fond du tableau de bord (`#app-main`), cartes (effet verre), toutes les couleurs de texte (`--ink-*`, y compris les icônes qui héritent de `--ink-400`/`--ink-500`), marque et accent, barre latérale, les 4 couleurs de statut (texte + fond de chacune), et l'écran de connexion. Typographie et forme des coins restent des préréglages (3 chacun) plutôt que des variables libres — ce sont des choix de composition typographique/géométrique, pas des couleurs, et un curseur libre par variable n'y apporterait pas de valeur perçue supplémentaire.

### 9.3 Persistance et propagation (prototype)

`window.TenantTheme` (IIFE tout en haut de `<script>`, avant même la feuille de style des composants, pour éviter un flash de branding Notantis par défaut) :

- `load()` — lit `localStorage['ent-tenant-theme-v2']` (clé changée depuis la v1, car la forme de l'état a changé de manière incompatible), fusionne avec `DEFAULTS` via `normalizeState`, applique.
- `apply(state)` — calcule les 3 blocs CSS (`:root`, `@media dark`, `:root[data-theme="dark"]`) et les injecte dans `<style id="tenant-theme-vars">` — donc **toute règle CSS qui consomme déjà une variable `--*` se met à jour automatiquement**, sans toucher à `components.css`.
- `save(state)` — applique puis persiste dans `localStorage`.
- `reset()` — efface le `localStorage` et revient aux valeurs Notantis par défaut.
- `parseColor(str)` / `composeColor(hex, a)` — conversion entre une valeur CSS couleur (hex 3/6/8, `rgb()`/`rgba()` en syntaxe virgules OU syntaxe moderne espaces + `/ alpha%`) et une paire `{hex, a}` pour piloter les deux inputs (couleur + opacité) d'un token `rgba`.

L'écran Apparence (bas de fichier, IIFE scopée à `#screen-settings`) génère dynamiquement la liste des 55 champs à partir de `TOKEN_SCHEMA`/`GROUPS` (plus de markup statique par champ) dans un conteneur défilant (`.token-groups-scroll`), avec un **bouton bascule clair/sombre** (`.theme-edit-toggle`) qui, en plus de changer le thème affecté par les modifications, force l'attribut `data-theme` sur `<html>` pour que **toute l'application** (pas seulement l'écran de réglages) reflète en direct le thème en cours d'édition. Chaque champ applique en direct sur `input` et persiste + flash de confirmation sur `change`.

### 9.4 Portage Python (`tokens.py`)

`TOKEN_SCHEMA`, `GROUPS`, `TYPOGRAPHY_PRESETS`, `SHAPE_PRESETS`, `parse_color`, `compose_color`, `TenantTheme`, `default_state`, `normalize_state`, `theme_vars`, `theme_css` sont un port strict du moteur JS ci-dessus — mêmes clés, mêmes valeurs par défaut, même logique de composition pour les tokens `orb`. Comme il n'y a plus de dérivation, ce port est nettement plus simple que la version précédente (plus de maths HSL — juste `re` pour parser les couleurs CSS et un merge de dictionnaires). Parité vérifiée numériquement : état par défaut et état modifié (plusieurs tokens `hex`/`rgba`/`orb` changés, y compris typographie et forme) produisent un CSS strictement identique caractère pour caractère entre `TenantTheme.apply()` (JS, exécuté dans un contexte `vm` Node stub) et `tokens.theme_css()` (Python).

```python
from tokens import TenantTheme, default_state, normalize_state, theme_css, theme_vars

# Depuis un enregistrement base de données (dict partiel — clés manquantes = valeurs par défaut) :
state = normalize_state({"colors": {"light": {"bg": "#f6f4ff"}, "dark": {"success": "#00ff88"}},
                          "typography": "moderne", "shape": "arrondi"})
theme_vars(state, "dark")["success"]   # '#00ff88'

# CSS complet (3 blocs :root / @media dark / [data-theme=dark], prêt à écrire ou injecter) :
css = theme_css(state)
# → à écrire dans un fichier statique par tenant (ex. /static/tenants/<id>/theme.css),
#   ou à injecter inline dans le <head> juste avant components.css.
```

**Si les deux moteurs divergent un jour** (l'un des deux fichiers évolue sans que l'autre suive), ce sera silencieux — pas d'erreur, juste un rendu légèrement différent entre ce qu'une étude a vu en prototype/preview et ce que la production sert. Documenté en tête de `tokens.py` : reporter tout changement de schéma dans les deux fichiers.

### 9.5 Ce que ce modèle n'empêche plus (compromis assumé)

En l'absence de dérivation, rien n'empêche techniquement une étude de choisir un texte clair sur un fond clair, ou une couleur d'accent qui casse le contraste avec le fond de sidebar. Ce n'est pas un oubli : c'est le choix explicitement demandé (édition totale, sans garde-fou automatique) plutôt que la dérivation à 2 ancres initialement proposée. Si un contrôle de qualité devient nécessaire, deux pistes n'imposent pas de refonte de l'architecture : un calcul de contraste (WCAG) affiché à côté de chaque paire texte/fond au moment de l'édition (avertissement, pas blocage), ou une validation côté serveur avant d'accepter un `theme_css()` en production.

---

### 9.6 Disposition et style de la navigation (28/08/2026)

La personnalisation ne portait que sur les **couleurs**, la typographie et les rayons : la
navigation restait un rail vertical de 236 px à gauche, pour toutes les études. Ce
paragraphe documente l'extension à sa **disposition** et à son **style**.

#### Ce qui bloquait

`.sidebar` fixait `width:236px` et `.main` compensait avec `padding-left:250px` — deux
constantes séparées, à tenir synchronisées à la main, dans deux règles qui ne se
regardent pas. Aucune personnalisation n'était possible sans les désynchroniser. Elles
sont remplacées par `--nav-w` et `calc(var(--nav-w) + var(--nav-gutter))` : une seule
valeur, un seul endroit.

À noter, car ce n'est pas évident à la lecture : **le rail est `position:fixed` et
`background:transparent`**. Ce n'est pas un reliquat — c'est ce qui laisse le dégradé de
`#app-main` courir sous lui d'un bord à l'autre de la fenêtre. Un rail en flux normal et
opaque casserait ce fond. Toute reprise du layout doit préserver ces deux propriétés.

#### Deux natures de réglage

| Nature | Véhicule | Exemples |
|---|---|---|
| Valeur | custom properties `--nav-*` (générées par `buildLayoutBody`) | largeur, hauteur de barre, paddings, taille d'icône |
| Structure | attributs `data-nav-*` sur `<html>` (posés par `applyLayoutAttributes`) | `data-nav-placement`, `data-nav-size`, `data-nav-active` |

Une custom property ne déplace pas un élément fixe d'un bord à l'autre et ne transforme
pas une pastille de fond en trait latéral : il faut un sélecteur. Les attributs servent
aussi à `AppShell`, qui doit savoir **ce qu'il monte** — un rail vertical ou une barre
d'onglets sont deux composants, pas deux feuilles de style.

Les variables `--nav-*` sont émises **uniquement dans le bloc `:root`**, jamais dans les
blocs sombres : une largeur de rail n'a pas de raison de changer avec le thème, et les y
répéter ferait croire le contraire au prochain lecteur.

#### Le référentiel

`frontend/src/theme/schema.ts` porte `NAV_PLACEMENT`, `NAV_SIZE`, `NAV_DENSITY`,
`NAV_ACTIVE`, `NAV_TOGGLES` et `LAYOUT_DEFAULTS`. L'écran Apparence est **généré** depuis
ces tables : ajouter un placement ou un style d'indicateur ne demande de toucher ni à
l'écran ni au CSS des composants — seulement d'écrire la règle correspondante.

`LAYOUT_DEFAULTS` reproduit exactement la navigation d'avant (rail à gauche, large,
confortable, fond plein, sans intitulés de section, avec compteurs et mention Notantis).

#### Haut et bas : barre d'onglets, pas rail couché

Le modèle retenu pour les dispositions horizontales est celui d'une **barre d'onglets**
(icône + libellé court, une seule profondeur visible), pas le rail vertical basculé. Trois
conséquences assumées, portées par `organisms/NavBar.tsx` :

1. **Le nombre d'onglets est borné** (`MAX_VISIBLE_TABS = 6`). Au-delà, le reste part dans
   un menu « Plus ». L'entrée active est toujours ramenée dans la partie visible, même si
   son rang la reléguait au menu — sinon la barre n'indique plus où l'on est.
2. **Les sous-entrées ne sont pas dépliées** dans la barre : elles s'ouvrent en menu sous
   leur onglet. Le clic sur une rubrique à sous-menu ouvre ce menu **et** navigue vers sa
   première sous-entrée, comme le rail.
3. **Le sélecteur d'office et la déconnexion remontent dans la topbar** : sans rail, il n'y
   a plus de pied de sidebar où les loger. Le CSS `.topbar-right .tenant-switcher` les
   repeint aux couleurs de surface — dessinés pour le fond sombre du rail, ils y
   apparaîtraient sinon comme un bloc violet sans rapport avec ce qui les entoure.

#### Mode « icônes seules »

Le rail se réduit à une colonne de pastilles de 38 px (62 px de large au total), la marque
prise dans une tuile de même forme au sommet. Chaque entrée **révèle son libellé au
survol**, dans une infobulle posée à côté de son icône, aux couleurs d'accent de l'étude
(`--brass-500`) — donc elle aussi personnalisée.

Le libellé n'est **jamais retiré du DOM** : il change de présentation, il reste lu par les
lecteurs d'écran. L'infobulle apparaît aussi au `:focus-visible`, pas seulement au survol.

L'attribut `title` natif a été essayé d'abord et retiré : il n'a ni le délai, ni l'aspect,
ni les couleurs de l'étude, et il ferait doublon avec l'infobulle.

Deux techniques de positionnement, pour une raison précise à chaque fois :

- **Rail vertical** — `position:fixed`, coordonnées fournies par
  `atoms/navTooltip.ts` sur `onMouseEnter`/`onFocus`. Nécessaire parce que `.nav` porte
  `overflow-y:auto` pour faire défiler les rubriques : un navigateur ne sait pas faire
  `overflow-y:auto` avec `overflow-x:visible` — il ramène le second à `auto`, et une
  infobulle en `position:absolute` serait rognée à 62 px, c'est-à-dire invisible. Le JS ne
  fournit que la géométrie ; le CSS choisit le bord depuis `[data-nav-placement]`.
- **Barre horizontale** — `position:absolute` tout simplement : `.navbar` ne défile pas.
  Et son `backdrop-filter` ferait d'elle le bloc conteneur d'un descendant `fixed`, ce qui
  rendrait des coordonnées de fenêtre fausses — piège à connaître avant d'uniformiser les
  deux cas.

Chevrons, sous-menus et intitulés de section disparaissent pour de bon dans ce mode : sans
libellé, il n'y a plus rien à côté de quoi les afficher. Les compteurs, eux, se replient en
pastille sur le coin de l'icône.

#### Sous-menus en mode réduit : panneau volant, pas suppression

Premier réflexe, et première erreur : masquer `.nav-sub` en mode « icônes seules ».
Une rubrique à sous-entrées reste cliquable et ouvre sa **première** sous-entrée — les
autres deviennent purement inaccessibles. « Dossiers » perd « Exports multiples » et
« Espaces clients », « Personnalisation » perd cinq de ses six sections.

Le sous-menu est donc **toujours rendu** dès que la rubrique en a (`AppShell`), et c'est le
CSS qui décide de sa forme : replié sous l'entrée en mode large (`.nav-sub.is-open`),
panneau volant au survol en mode réduit. Le panneau porte le nom de la rubrique en
en-tête — auquel cas l'infobulle ferait doublon et est supprimée.

Deux détails qui ne se voient qu'à l'usage, et qui cassent la fonctionnalité s'ils
manquent :

- le panneau reste ouvert sur `:hover` **et** `:focus-within` de son conteneur, pas
  seulement de l'icône : sans ça il se referme dès qu'on quitte l'icône pour aller
  cliquer dedans ;
- un pseudo-élément fait le **pont** par-dessus les 10 px de vide entre l'icône et le
  panneau, sinon la souris « sort » dans l'intervalle.

#### Personnalisation : le sous-menu remplace la barre d'onglets

Les six sections de Personnalisation (Coordonnées et logo, En-tête des emails, Apparence,
Accueil & mentions, Espace client, Modules & modèles) existaient **deux fois** : dans le
sous-menu « Personnalisation » de la navigation, et dans une `TabStrip` en haut de
l'écran. Les mêmes six choix, à deux endroits, avec deux états à garder d'accord.

La barre a été retirée le 28/08/2026 ; la navigation reste seule maîtresse de la section
affichée. Le titre de page porte désormais le nom de la section et non plus
« Personnalisation » — sans la barre, c'est le seul repère qui dit où l'on se trouve.

`SettingsScreen` (l'écran Personnalisation de l'application V2, trois onglets : Identité,
Apparence, Modules) **garde sa barre d'onglets** : sa navigation n'expose pas ces trois
entrées en sous-menu, les retirer les rendrait inaccessibles. À aligner si la navigation V2
adopte le même découpage.

#### `.nav-item` et `.nav-subitem` sont des `<button>`

Le prototype en faisait des `<div onClick>`. Conséquences constatées : **pas de curseur de
pointeur au survol** (la règle `button, [role="button"], .clickable{cursor:pointer}` ne les
atteignait pas), pas de focus clavier, pas de sémantique pour un lecteur d'écran. Corrigé
le 28/08/2026, comme l'avait déjà été `PresetCard`. Les trois neutralisations habituelles
du `<button>` (`width:100%`, `text-align:left`, `background:none`, `font-family:inherit`)
sont regroupées dans une seule règle au-dessus de `.nav-item`. `aria-current="page"` marque
l'entrée active, `aria-expanded` l'état du sous-menu.

#### Persistance

Le bloc `layout` voyage dans le même document que les couleurs (`Office.theme`,
`PUT /api/tenant-theme/`). Côté Django, `validators._clean_layout` borne les quatre
énumérations et les trois booléens : contrairement aux tokens de couleur, ce sont des
ensembles **fermés et petits**, et laisser passer une valeur inconnue produirait un
attribut `data-nav-*` qu'aucun sélecteur ne reconnaît — c'est-à-dire une navigation qui
disparaît sans message d'erreur.

**Un thème sans bloc `layout` est le cas normal, pas une anomalie** : tous ceux enregistrés
avant le 28/08/2026 n'en ont pas. Le validateur les accepte tels quels et ne leur en ajoute
pas ; `normalizeLayoutState` les complète clé par clé côté front avec les valeurs par
défaut. Refuser ces thèmes aurait rendu toute étude déjà personnalisée incapable
d'enregistrer quoi que ce soit.

#### Divergence des miroirs, assumée

Le §9 pose que `schema.ts`, `index_16.html` et `tokens.py` restent alignés. **Le bloc
`layout` n'existe que dans `schema.ts`** (et son bornage dans `validators.py`) :

- `index_16.html` est le prototype de référence figé ; y rétroporter une navigation
  déplaçable reviendrait à réécrire sa coquille entière, sans bénéfice.
- `tokens.py` sert la génération de PDF et d'emails, où il n'y a **pas de navigation** —
  la parité numérique qu'il garantit porte sur les couleurs, elle n'est pas entamée.

---

## 10. Pour un développeur Python

Ce design system est volontairement **agnostique du framework** : ce sont des fichiers CSS/JSON/Python statiques, pas un paquet à installer.

**Intégration Flask / Django / FastAPI (Jinja2)**
1. Servir `tokens.css` et `components.css` comme fichiers statiques (`/static/design-system/`), inclus dans cet ordre dans le `<head>` du gabarit de base — `components.css` dépend des variables de `tokens.css`.
2. Poser `data-theme="{{ user_theme }}"` sur la balise `<html>` du gabarit de base si vous pilotez le thème côté serveur (sinon, omettre l'attribut et laisser `prefers-color-scheme` décider).
3. Reprendre les extraits HTML de la section 6 comme macros Jinja2 (`{% macro pill(label, kind) %}`) ou `{% include %}` Django — les noms de classes ne changent pas, seul le contenu est dynamique.
4. Copier une fois le sprite SVG (bloc `<svg style="display:none">…</svg>`, §5) dans le gabarit de base.

**Usage hors HTML (PDF, e-mail, graphiques)**
```python
from tokens import resolve, LIGHT, DARK_OVERRIDES

palette = resolve("light")          # dict complet, thème clair
palette["brass-600"]                # '#7d52dc' — pour un bouton dans un PDF ReportLab
palette["success"]                  # '#2f8f5b' — pour une courbe matplotlib
```
`tokens.json` donne la même donnée pour tout script non-Python (génération d'assets design, tooling JS).

**Ce que ce design system NE fournit PAS** : composants Python packagés (ex. classes Django Forms stylées), tests visuels de non-régression, breakpoints mobiles pour la sidebar (§7 point 5). À prévoir séparément si le produit doit dépasser le stade maquette.
