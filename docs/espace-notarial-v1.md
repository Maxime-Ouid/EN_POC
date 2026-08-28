# Espace Notarial actuel (V1) — navigation et écrans reconstruits

Reconstruction de l'interface administrateur en production
(`admin.espacenotarial.com`) avec les composants et les tokens du design system
V2. Objectif : disposer d'un **iso-fonctionnel navigable** pour discuter écran par
écran de ce qui doit bouger en V2 — et montrer, sur la même maquette, ce que la
personnalisation par office change réellement.

## Comment le voir

```bash
cd frontend
npm install
npm run dev
```

| URL | Ce qu'on voit | Réseau |
|---|---|---|
| `https://officea.localhost:5173/?view=v1` | la navigation V1 complète sur données de démonstration — **la version à partager** | aucun |
| `https://officea.localhost:5173/?view=v1&screen=facturation` | la même, ouverte directement sur une rubrique | aucun |
| `https://officea.localhost:5173/?view=v1-app` | la même navigation, branchée sur Django | oui |
| `https://officea.localhost:5173/` | l'application V2 (inchangée) | oui |
| `https://officea.localhost:5173/?view=prototype-preview` | la maquette V2 (inchangée) | aucun |
| `https://officea.localhost:5173/?view=ui-kit` | le catalogue de composants (inchangé) | aucun |

Les clés d'écran acceptées par `&screen=` sont celles de `src/v1/nav.ts`
(`dossiers`, `espaces-clients`, `annuaire-etude`, `perso-apparence`…).

## Ce qui a été construit

**Navigation iso-V1, sous-menus compris** (`src/v1/nav.ts`) : Accueil ·
Dossiers (7 sous-entrées) · Annuaires (5) · Téléchargements · Activités (5) ·
Transfert de fichiers · Espace promoteurs · Personnalisation · Outils (6) ·
Support. L'ordre et les libellés sont ceux relevés à l'écran, y compris quand ils
surprennent. La sidebar sait désormais déplier un sous-menu (`NavEntry.items`,
`NavSubItem`, chevron sur `NavItem`) ; la rubrique qui contient l'écran courant
est toujours ouverte.

**10 écrans complets**, avec barre d'outils, recherche, pagination et libellés
mot pour mot :

| Écran | Capture de référence |
|---|---|
| Accueil (4 cartes) | 113344, 113401 |
| Dossiers | 113410, 114013 |
| Espaces clients + modale d'édition | 115315, 114026 |
| Duplications entre études | 113246, 115130, 115142 |
| Annuaire de l'étude | 113833, 113907 |
| Administrateurs par dossier | 113854 |
| Qui est connecté ? | 113518 |
| Facturation du service | 113545, 113634, 113720, 113821 |
| Statistiques de consultations | 113500, 115702 |
| Outils → Transfert Data | 115231, 115237 |

**Personnalisation élargie** — la rubrique V1 ne contient que « Coordonnées et
logo de l'office » et « En-tête des emails ». L'écran reconstruit garde ces deux
entrées et ajoute quatre onglets : **Apparence** (le moteur de thème existant,
réellement enregistré dans `/api/tenant-theme/`), **Accueil & mentions**,
**Espace client**, **Modules & modèles**. Les réglages de contenu
(`OfficeContentTab`) n'ont pas d'endpoint : la saisie reste locale **et l'écran
le dit** sous chaque formulaire.

**17 coquilles structurées** (`src/v1/placeholders.ts`) pour les rubriques dont
aucune capture n'existe. Chacune affiche ce qui est établi (libellé, URL relevée,
trace indirecte ailleurs dans l'interface) et ce qui manque. Aucun tableau
plausible n'a été inventé : une maquette fausse mais crédible se fait valider,
c'est plus cher qu'un écran vide.

## Ce qui est réel dans `?view=v1-app`

Connexion, identité de l'office, **liste des dossiers** (`/api/datarooms/`),
modules activés (`/api/tenant-config/`), et l'onglet **Apparence**
(`GET`/`PUT /api/tenant-theme/`, écriture réservée aux rôles `admin` et
`superadmin`).

Simulés, faute d'endpoint : espaces clients, annuaires, administrateurs délégués,
sessions ouvertes, facturation, et les réglages de contenu de l'office. La
pastille de la topbar l'annonce, et l'écran Dossiers affiche séparément la
volumétrie de référence de la production (245 dossiers) et ce que le backend
contient réellement.

## Points à trancher avec le client

1. **2ᵉ entrée du sous-menu Personnalisation** : masquée par le curseur sur la
   seule capture qui la montre (113447), lue « En-tête des emails ». À confirmer.
2. **Sous-menus jamais dépliés** : Téléchargements, Transfert de fichiers,
   Espace promoteurs, Support sont modélisés sans sous-entrées — hypothèse, pas
   constat.
3. **Colonnes d'icônes sans libellé** des listes V1 (Dossiers, Espaces clients,
   Annuaire) : leurs infobulles n'apparaissent sur aucune capture. Elles sont
   regroupées dans une colonne « État » explicite plutôt que reproduites à
   l'aveugle.
4. **Écrans de résultats des statistiques** : jamais capturés. Le formulaire est
   reconstruit, les résultats non.
5. **Périmètre de la personnalisation V2** : les quatre onglets ajoutés
   (apparence, accueil & mentions, espace client, modules) sont une proposition,
   pas une reprise de l'existant.

## Vérifications faites

- `tsc -b --force` : sans erreur.
- `npm run check:ds` : vert (57 écarts hérités, **aucun nouveau**).
- **Rendu réellement exercé** : les 34 écrans de la navigation ont été montés un
  par un avec `react-dom/server` — chacun produit une `.screen` et son fil
  d'Ariane. Idem pour le comportement des sous-menus (déplié sur la rubrique
  active, replié ailleurs, chevron et état actif corrects).
- `npm run build` (vite) et `npm run lint` (oxlint) : **à relancer côté
  reviewer**. Leurs binaires natifs installés dans `node_modules` sont ceux de
  Windows et ne s'exécutent pas dans l'environnement de préparation — c'est la
  même limite que sur la branche précédente, pas une régression.

## Fichiers

```
src/v1/                       nav.ts · placeholders.ts · data.ts
                              EspaceNotarialV1.tsx (coquille, purement présentationnelle)
                              V1Preview.tsx (démo) · V1AppView.tsx (branché Django)
src/components/pages/v1/      12 écrans
src/components/molecules/     NavSubItem · Toolbar · ListControls · TablePager
src/components/organisms/     OfficeContentTab
src/hooks/useListPaging.ts    recherche + pagination côté client
src/styles/components.css     section « ESPACE NOTARIAL V1 » (aucune couleur littérale)
```

`AppShell` gagne `NavEntry.items` et `hideSectionLabels` ; `NavItem` gagne
`expandable`/`expanded` ; `NavGroup.label` devient optionnel. L'application V2 et
la maquette existantes ne changent pas de comportement.
