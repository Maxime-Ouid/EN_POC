# Inventaire des composants

Généré depuis le code : `node scripts/gen-component-inventory.mjs` (dans `frontend/`).
Ne pas modifier à la main — corriger le commentaire d'en-tête du composant, puis régénérer.

Le catalogue interactif, avec les props et les variantes réellement montées,
se lance avec `npm run dev` puis `?view=ui-kit`.

## Atomes — éléments indivisibles

| Composant | Rôle |
|---|---|
| `AppBgSwatch` | Vignette d'aperçu d'un fond d'application. |
| `Avatar` | Initiales dans un cercle violet (ou neutre pour un compteur "+N") — §6.4. |
| `Badge` | Petit compteur rond (ex. nombre de dossiers dans la nav, questions dans un onglet). |
| `BarTrack` | Barre de progression fine (.bar-track / .bar-fill) — quota de stockage, part d'un espace client dans le total. |
| `Button` | Bouton capsule — voir DESIGN_SYSTEM.md §6.1 (.btn). |
| `Card` | Carte "verre dépoli" générique — §6.2. `padded` ajoute .card-pad (16-20px de padding interne) ; sans, la carte est pensée pour… |
| `Decor` | Monter une fois par zone (`.login-story`, `.login-panel`) — l'espace connecté n'en porte plus depuis le 01/09/2026, son fond… |
| `Grid` | Grille responsive — .grid-2 (1.5fr/1fr), .grid-3, .grid-4 — repasse à 1-2 colonnes sous 980px (voir components.css). |
| `Highlight` | Souligne dans `text` les lettres trouvées par la recherche. |
| `Icon` | Icône référençant le sprite SVG global (voir IconSprite.tsx, à monter une seule fois — main.tsx — dans l'app). |
| `has3d`, `Icon3d` | Illustrations 3D (src/assets/icons-3d) tenant la place du glyphe du sprite pour les neuf types d'objets qui en ont une ;… |
| `IconButton` | Bouton icône seul, rond (cloche, notifications…) — voir .icon-btn dans la topbar. |
| `IconChip` | Pastille d'icône : carré arrondi teinté portant un glyphe du sprite, OU l'illustration 3D quand l'objet en a une (dossier,… |
| `IconSprite` | — |
| `Nav` | — |
| `NavSwatch` | Miniature de la coquille de l'app : un cadre, une bande de navigation sur un bord, trois entrées dont la première est active. |
| `NumberField` | Champ numérique à unité — §6.6. Les compteurs natifs sont masqués (non stylables sur Firefox/Safari) et remplacés par deux… |
| `Pill` | Statut sémantique — voir DESIGN_SYSTEM.md §6.3. |
| `ProtoPill` | Bandeau "Aperçu — maquette visuelle" affiché dans le prototype — à retirer une fois l'app connectée à de vraies données… |
| `RowIcon` | Carré arrondi coloré associé à un type de ligne (dossier, fichier…) — §6.5. Délègue à IconChip, qui bascule sur l'illustration… |
| `RowMenu` | Icône "…" en fin de ligne, ouvre un menu contextuel (à implémenter côté appli). |
| `Screen` | Conteneur d'un écran principal — `<section class="screen is-active">`. Un seul écran est monté à la fois côté React (le… |
| `Select` | Select du design system — §6.6. Le style est porté par le contrôle lui-même, il ne dépend plus d'un <Field> parent. |
| `ShapeSwatch` | Carré d'aperçu du rayon de bordure. |
| `SoField` | Motif clé/valeur vertical utilisé dans le corps du slideover. |
| `Subscreen` | Panneau associé à un onglet — n'affiche ses enfants que si `active` (évite de monter le contenu des onglets inactifs,… |
| `SubscreenPanel` | Panneau d'onglet de second/troisième niveau (.subscreen2 / .subscreen3). |
| `Tag` | Classification libre (fond accent violet par défaut, ou une des couleurs du thème). |
| `TextInput` | Input texte du design system — §6.6. Le style est porté par le contrôle, il ne dépend plus d'un <Field> parent. |
| `Textarea` | Zone de texte du design system — §6.6. Elle porte son style elle-même ; la zone de réponse Q&R (`.qa-reply textarea`) garde sa… |
| `Toggle` | Interrupteur maison (.toggle) — rendu accessible ici (role="switch" + aria-checked), corrigeant la dette notée en §7 point 6… |
| `TopbarRight` | — |
| `TypographySample` | Échantillon « Aa » rendu dans la police du preset. |

## Molécules — petits assemblages

| Composant | Rôle |
|---|---|
| `AvatarStack` | Pile d'avatars chevauchés, dernière entrée typiquement un "+N". |
| `Breadcrumb` | — |
| `ButtonRow` | Regroupe des boutons/filtres sur une ligne avec un espacement cohérent (.btn-row). |
| `DocPanel` | Panneau de droite de l'explorer — §6.8. |
| `Dropzone` | Zone de dépôt en pointillés (logo de l'étude, ajout de pièces). |
| `FeedItem` | Ligne de fil d'activité — §6.9. La couleur de `iconBg`/`iconColor` encode le type d'évènement (dépôt = info, question =… |
| `Field` | Label + contrôle, empilés — §6.6. Enrober un <input>/<select> pour hériter du style de focus/bordure défini sur `.field input,… |
| `FieldRow` | Deux (ou plus) `<Field>` côte à côte, répartis équitablement. |
| `ListControls` | Ligne de contrôles des listes V1 : « afficher [25] dossiers » à gauche, « Rechercher… » à droite. |
| `MetaBanner` | Bandeau de métadonnées clé/valeur en tête de fiche dataroom — §6.13. |
| `ModuleRow` | Ligne « module activable » de Personnalisation → Modules. |
| `NavGroup` | — |
| `NavItem` | Entrée de navigation de premier niveau. |
| `NavSubItem` | Entrée de sous-menu de la sidebar (V1 : « Dossiers » → « Exports multiples », « Espaces clients »…). |
| `PresetCard` | Vignette sélectionnable (.preset-card). |
| `PresetRow` | Rangée de vignettes de preset (typographie, formes) — §Personnalisation. |
| `RowName` | Cellule <td class="row-name"> = RowIcon + libellé, motif systématique des tableaux du prototype (dossiers, documents, membres…). |
| `SidebarBrand` | En-tête de la sidebar (logo + nom d'office/produit). |
| `SidebarFoot` | Pied de sidebar : utilisateur connecté (clic = déconnexion) + mention "propulsé par Notantis" — les tokens… |
| `StatCard` | Carte de statistique du dashboard — §6.2. |
| `TabStrip` | Bandeau d'onglets — §6.7. `active` désigne la clé active ; le panneau correspondant est à afficher par l'appelant (voir… |
| `TablePager` | Pied de tableau des listes V1 : compteur, export, puis « début / précédent / numéros / suivant / fin ». |
| `TagFilter` | Menu de filtre par tags — multi-sélection en OU (un élément remonte s'il porte AU MOINS UN des tags cochés). |
| `TemplateOption` | Ligne « modèle de dataroom » (.tpl-option) — liste des modèles dans Personnalisation, et choix du modèle dans la modale de… |
| `TenantSwitcher` | Sélecteur d'office — liste déroulante des offices auxquels l'utilisateur appartient, l'office courant coché. |
| `TokenItem` | Un champ de couleur : pastille + libellé + valeur hex (+ opacité si le token l'accepte). |
| `Toolbar`, `ToolbarSeparator` | Barre d'outils horizontale des écrans de l'interface actuelle (V1) : une rangée de boutons d'action au-dessus du contenu («… |
| `TopbarSearch` | — |
| `WidgetFrame` | Cadre commun à tous les widgets du tableau de bord : en-tête, corps défilant, et en édition la poignée de déplacement. |

## Organismes — blocs autonomes

| Composant | Rôle |
|---|---|
| `AccessRightsTable` | Tableau de droits d'accès — un composant réutilisé tel quel pour une vraie dataroom (dossiers + documents) ET pour un Template… |
| `AppearanceTab` | Personnalisation → Apparence (index_16.html #sub3-apparence). |
| `ConfirmModal` | Confirmation d'une action, avec son énoncé complet. |
| `DashboardGrid` | — |
| `DashboardTabs` | Barre d'onglets des écrans personnalisés. |
| `DataroomMetadataPanel` | — |
| `DocumentPreview` | Aperçu du contenu d'une pièce, affiché dans le volet document. |
| `DocumentSlideover` | Volet latéral de fiche document — index_16.html #doc-slideover. |
| `Explorer` | Layout deux colonnes (arbre + panneau de documents) — §6.8. L'ouverture des noeuds est gérée ici (état purement UI) ; la… |
| `GreyLabelStatementModal` | — |
| `IdentityTab` | Personnalisation → Identité (index_16.html #sub3-identite). |
| `MetadataSchemaTab` | — |
| `Modal` | Overlay + boîte modale — §6.11. `open` pilote `.overlay.is-active` (le prototype le faisait en JS via openModal()/closeModal()). |
| `ModulesTab` | Personnalisation → Modules (index_16.html #sub3-modules). |
| `NamedUsersEditor` | Puces d'utilisateurs nommés, avec un champ d'ajout TOUJOURS visible en dessous. |
| `NavBar` | Barre d'onglets horizontale — navigation « en haut » ou « en bas ». |
| `NewDataroomModal` | Modale "Nouveau dossier" — index_16.html #modal-new. |
| `NewFolderModal` | Modale "Nouveau dossier" — même patron que NewDataroomModal, un seul champ : le dossier parent est déjà déterminé par… |
| `NewOfficeModal` | Création d'un office ET de son premier admin, dans le même geste que le backend (POST /api/hyperadmin/offices/ fait les deux… |
| `NewPortfolioModal` | — |
| `NewTemplateFolderModal` | Modale "Nouveau dossier" d'un Template — même patron exact que NewFolderModal (dataroom réelle) : le dossier parent est déjà… |
| `NewTemplateModal` | Création ou modification d'un modèle de dataroom (Template) — juste son nom et sa description ; l'arborescence de dossiers se… |
| `OfficeContentTab` | — |
| `OfficeModulesModal` | Modules activés pour UN office (PATCH .../enabled_module_slugs, remplacement complet de la liste — pas d'ajout/retrait… |
| `OfficeUserModal` | Ajout d'un utilisateur à l'étude, dans ses deux formes. |
| `QACard` | Carte question/réponse — §6.10. |
| `RenameFolderModal` | Popup dédié UNIQUEMENT au renommage — ouvert depuis le menu "⋮" d'un nœud de `Explorer`, dans une vraie dataroom comme dans un… |
| `SearchPalette` | Palette de recherche globale (⌘K / Ctrl+K), ouverte depuis la barre de la topbar. |
| `Sidebar` | Conteneur latéral fixe, largeur --nav-w — §6.14. Se replie en rail d'icônes (62px) à la demande, et de lui-même sous 1024px :… |
| `Slideover` | Panneau latéral (fiche document) — §6.12. `open` pilote `.slideover.is-active`. |
| `TableCard` | Enveloppe une <table> dans .card > .table-wrap — §6.5. Passer les <tr> déjà composés en children (typiquement via… |
| `TagPicker` | Sélecteur de tags d'un élément (dossier ou pièce) : les pastilles posées, une croix pour retirer, un bouton « + » qui ouvre le… |
| `TemplateGallery` | Galerie des dispositions prêtes à l'emploi. |
| `TemporaryLinkModal` | — |
| `TokenEditor` | Toute la grille de couleurs, générée depuis TOKEN_SCHEMA et regroupée par TOKEN_GROUPS — équivalent React de renderGroups()… |
| `Topbar` | — |
| `UserRestrictionsModal` | Restrictions d'accès qui nomment (ou pourraient nommer) cet utilisateur — ouverte depuis le bouton "Restrictions" d'une ligne… |
| `WidgetLibrary` | Bibliothèque des widgets disponibles, en panneau latéral. |

## Gabarits — structure de page

| Composant | Rôle |
|---|---|
| `AppShell` | Assemble la coquille de l'app (sidebar + topbar + zone de contenu) — §6.14 + topbar. |

## Écrans — composition complète

| Composant | Rôle |
|---|---|
| `AuditTrailScreen` | — |
| `DataroomDetailScreen` | Écran détail dataroom — index_16.html #screen-dataroom (onglets Documents / Informations / Q&R / Droits d'accès / Historique). |
| `DataroomsListScreen` | Écran "Dossiers" (liste) — index_16.html #screen-datarooms. |
| `HomeScreen` | Écran d'accueil / dashboard — voir index_16.html #screen-dashboard. |
| `HyperadminOfficesScreen` | Liste des offices — GET /api/hyperadmin/offices/. Même patron que OfficeUsersScreen (barre d'outils, « afficher N », tableau,… |
| `LoginScreen` | Écran de connexion — §6.15. Composant pur : `onSubmit` reçoit identifiant + mot de passe, à brancher sur POST /api/login/… |
| `MfaScreen` | Deuxième temps de la connexion (MFA, TOTP) — même structure à deux panneaux que LoginScreen (§6.15), pour rester dans la même… |
| `ModuleScreen` | Écran d'un module activé pour l'office. |
| `OfficeUsersScreen` | Annuaire de l'étude — utilisateurs de l'office courant (GET /api/office-users/). |
| `PortfolioDetailScreen` | — |
| `PortfoliosScreen` | Écran "Portefeuilles" — index_16.html #screen-portfolios. |
| `SettingsScreen` | Écran Personnalisation — index_16.html #screen-settings. |
| `StatsScreen` | Écran Statistiques & facturation — index_16.html #screen-stats. |
| `TemplateDetailScreen` | Arborescence d'un modèle de dataroom (Template) — plus d'Explorer ni de toggle Arborescence/Droits d'accès (retirés le… |
| `TemplatesListScreen` | Liste des modèles de dataroom de l'office — GET /api/templates/. Même patron que OfficeUsersScreen (barre d'outils, « afficher… |
