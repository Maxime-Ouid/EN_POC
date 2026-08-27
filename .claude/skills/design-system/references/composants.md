# Inventaire des composants

Généré depuis le code : `node scripts/gen-component-inventory.mjs` (dans `frontend/`).
Ne pas modifier à la main — corriger le commentaire d'en-tête du composant, puis régénérer.

Le catalogue interactif, avec les props et les variantes réellement montées,
se lance avec `npm run dev` puis `?view=ui-kit`.

## Atomes — éléments indivisibles

| Composant | Rôle |
|---|---|
| `Avatar` | Initiales dans un cercle violet (ou neutre pour un compteur "+N") — §6.4. |
| `Badge` | Petit compteur rond (ex. nombre de dossiers dans la nav, questions dans un onglet). |
| `BarTrack` | Barre de progression fine (.bar-track / .bar-fill) — quota de stockage, part d'un espace client dans le total. |
| `Button` | Bouton capsule — voir DESIGN_SYSTEM.md §6.1 (.btn). |
| `Card` | Carte "verre dépoli" générique — §6.2. `padded` ajoute .card-pad (16-20px de padding interne) ; sans, la carte est pensée pour… |
| `Decor` | Monter une fois par zone (`.login-story`, `.login-panel`, `.main` de l'app) — ces conteneurs doivent être `position:relative`… |
| `Grid` | Grille responsive — .grid-2 (1.5fr/1fr), .grid-3, .grid-4 — repasse à 1-2 colonnes sous 980px (voir components.css). |
| `Icon` | Icône référençant le sprite SVG global (voir IconSprite.tsx, à monter une seule fois — main.tsx — dans l'app). |
| `IconButton` | Bouton icône seul, rond (cloche, notifications…) — voir .icon-btn dans la topbar. |
| `IconSprite` | — |
| `Nav` | — |
| `Pill` | Statut sémantique — voir DESIGN_SYSTEM.md §6.3. |
| `ProtoPill` | Bandeau "Aperçu — maquette visuelle" affiché dans le prototype — à retirer une fois l'app connectée à de vraies données… |
| `RowIcon` | Carré arrondi coloré associé à un type de ligne (dossier, fichier…) — §6.5. |
| `RowMenu` | Icône "…" en fin de ligne, ouvre un menu contextuel (à implémenter côté appli). |
| `Screen` | Conteneur d'un écran principal — `<section class="screen is-active">`. Un seul écran est monté à la fois côté React (le… |
| `Select` | — |
| `ShapeSwatch` | Carré d'aperçu du rayon de bordure. |
| `SoField` | Motif clé/valeur vertical utilisé dans le corps du slideover. |
| `Subscreen` | Panneau associé à un onglet — n'affiche ses enfants que si `active` (évite de monter le contenu des onglets inactifs,… |
| `SubscreenPanel` | Panneau d'onglet de second/troisième niveau (.subscreen2 / .subscreen3). |
| `Tag` | Classification libre (fond accent violet par défaut, ou .plain neutre). |
| `TextInput` | Input texte simple — hérite du style `.field input` quand placé dans <Field>. |
| `Textarea` | Attention : `textarea` n'a de style dédié que dans le contexte `.qa-reply` (voir QACard.tsx) — hors de ce contexte, prévoir un… |
| `Toggle` | Interrupteur maison (.toggle) — rendu accessible ici (role="switch" + aria-checked), corrigeant la dette notée en §7 point 6… |
| `TopbarRight` | — |
| `TypographySample` | Échantillon « Aa » rendu dans la police du preset. |

## Molécules — petits assemblages

| Composant | Rôle |
|---|---|
| `AvatarStack` | Pile d'avatars chevauchés, dernière entrée typiquement un "+N". |
| `Breadcrumb` | Fil d'ariane — utilisé à la fois dans la topbar (office > écran) et en tête d'écran détail dataroom (dossiers > portefeuille >… |
| `ButtonRow` | Regroupe des boutons/filtres sur une ligne avec un espacement cohérent (.btn-row). |
| `DocPanel` | Panneau de droite de l'explorer — §6.8. |
| `Dropzone` | Zone de dépôt en pointillés (logo de l'étude, ajout de pièces). |
| `FeedItem` | Ligne de fil d'activité — §6.9. La couleur de `iconBg`/`iconColor` encode le type d'évènement (dépôt = info, question =… |
| `Field` | Label + contrôle, empilés — §6.6. Enrober un <input>/<select> pour hériter du style de focus/bordure défini sur `.field input,… |
| `FieldRow` | Deux (ou plus) `<Field>` côte à côte, répartis équitablement. |
| `MetaBanner` | Bandeau de métadonnées clé/valeur en tête de fiche dataroom — §6.13. |
| `ModuleRow` | Ligne « module activable » de Personnalisation → Modules. |
| `NavGroup` | — |
| `NavItem` | — |
| `PageHeader` | En-tête d'écran : surtitre + titre + sous-titre, motif répété sur tous les écrans du prototype. |
| `PresetCard` | Vignette sélectionnable (.preset-card). |
| `PresetRow` | Rangée de vignettes de preset (typographie, formes) — §Personnalisation. |
| `RowName` | Cellule <td class="row-name"> = RowIcon + libellé, motif systématique des tableaux du prototype (dossiers, documents, membres…). |
| `SidebarBrand` | En-tête de la sidebar (logo + nom d'office/produit). |
| `SidebarFoot` | Pied de sidebar : utilisateur connecté (clic = déconnexion) + mention "propulsé par Notantis" — les tokens… |
| `StatCard` | Carte de statistique du dashboard — §6.2. |
| `TabStrip` | Bandeau d'onglets — §6.7. `active` désigne la clé active ; le panneau correspondant est à afficher par l'appelant (voir… |
| `TemplateOption` | Ligne « modèle de dataroom » (.tpl-option) — liste des modèles dans Personnalisation, et choix du modèle dans la modale de… |
| `TenantSwitcher` | Sélecteur d'office cliquable — pattern de la V1 (voir §6.14 / mémoire de projet "personnalisation") : à brancher sur l'échange… |
| `TokenItem` | Un champ de couleur : pastille + libellé + valeur hex (+ opacité si le token l'accepte). |
| `TopbarSearch` | — |

## Organismes — blocs autonomes

| Composant | Rôle |
|---|---|
| `AppearanceTab` | Personnalisation → Apparence (index_16.html #sub3-apparence). |
| `DocumentSlideover` | Volet latéral de fiche document — index_16.html #doc-slideover. |
| `Explorer` | Layout deux colonnes (arbre + panneau de documents) — §6.8. L'ouverture des noeuds est gérée ici (état purement UI) ; la… |
| `IdentityTab` | Personnalisation → Identité (index_16.html #sub3-identite). |
| `Modal` | Overlay + boîte modale — §6.11. `open` pilote `.overlay.is-active` (le prototype le faisait en JS via openModal()/closeModal()). |
| `ModulesTab` | Personnalisation → Modules & modèles (index_16.html #sub3-modules). |
| `NewDataroomModal` | Modale "Nouveau dossier" — index_16.html #modal-new. |
| `QACard` | Carte question/réponse — §6.10. |
| `Sidebar` | Conteneur latéral fixe, 236px — §6.14. Pas de repli mobile dans le design system d'origine (dette notée en §7 point 5) : à… |
| `Slideover` | Panneau latéral (fiche document) — §6.12. `open` pilote `.slideover.is-active`. |
| `TableCard` | Enveloppe une <table> dans .card > .table-wrap — §6.5. Passer les <tr> déjà composés en children (typiquement via… |
| `TokenEditor` | Toute la grille de couleurs, générée depuis TOKEN_SCHEMA et regroupée par TOKEN_GROUPS — équivalent React de renderGroups()… |
| `Topbar` | — |

## Gabarits — structure de page

| Composant | Rôle |
|---|---|
| `AppShell` | Assemble la coquille de l'app (sidebar + topbar + zone de contenu) — §6.14 + topbar. |

## Écrans — composition complète

| Composant | Rôle |
|---|---|
| `DataroomDetailScreen` | Écran détail dataroom — index_16.html #screen-dataroom (onglets Documents / Q&R / Membres / Historique). |
| `DataroomsListScreen` | Écran "Dossiers" (liste) — index_16.html #screen-datarooms. |
| `HomeScreen` | Écran d'accueil / dashboard — voir index_16.html #screen-dashboard. |
| `LoginScreen` | Écran de connexion — §6.15. Composant pur : `onSubmit` reçoit identifiant + mot de passe, à brancher sur POST /api/login/… |
| `ModuleScreen` | Écran d'un module activé pour l'office. |
| `PortfoliosScreen` | Écran "Portefeuilles" — index_16.html #screen-portfolios. |
| `SettingsScreen` | Écran Personnalisation — index_16.html #screen-settings. |
| `StatsScreen` | Écran Statistiques & facturation — index_16.html #screen-stats. |
