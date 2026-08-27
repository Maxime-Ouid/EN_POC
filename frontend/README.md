# Front — Espace Notarial V2 (POC)

React 19 + TypeScript + Vite. Reconstruction complète du prototype
`NotantisApp/index_16.html` sous forme de composants réutilisables, et
application réelle branchée sur le backend Django du POC.

## Deux points d'entrée

| URL | Composant | Données |
|---|---|---|
| `https://<host>:5173/` | `src/App.tsx` | Backend Django là où les endpoints existent, démonstration ailleurs |
| `https://<host>:5173/?view=prototype-preview` | `src/PrototypeDemo.tsx` | 100 % démonstration, aucun appel réseau |
| `https://<host>:5173/?view=ui-kit` | `src/uikit/UiKit.tsx` | Bibliothèque de composants, fiche par fiche |

Les trois montent exactement les mêmes composants. La maquette sert de
référence visuelle, l'app réelle valide l'intégration, le UI kit documente.

## UI kit (`src/uikit/`)

Les 72 composants, un par fiche : le composant réellement monté et interactif
dans chacune de ses variantes, puis sa table de props.

Deux partis pris qui expliquent la structure du dossier :

- **La table des props est lue dans le code**, pas recopiée à côté. Les sources
  sont importées en texte (`import.meta.glob(..., '?raw')`) et analysées par
  `parser.ts`. Renommer une prop ou changer son type met la fiche à jour tout
  seul ; une prop ajoutée sans commentaire apparaît quand même, en creux.
  `parser.ts` ne dépend ni de Vite ni du DOM, ce qui le rend testable hors
  navigateur ; `introspect.ts` n'ajoute que la lecture des fichiers.
- **Les écrans sont rendus vivants, puis réduits à l'échelle** (`ScreenPreview`),
  pas capturés en image. Un écran cassé se voit dans sa vignette.

Le sélecteur clair/sombre et le spécimen `TokenEditor` agissent sur le thème
global : changer une couleur depuis la page repeint la page. C'est voulu —
c'est le test le plus rapide pour juger une palette.

## Arborescence

```
src/
  api/            client HTTP (session + CSRF) et surface d'API réelle du backend
  components/     bibliothèque de composants, organisée en Atomic Design
    atoms/        27 composants
    molecules/    24
    organisms/    13
    templates/     1
    pages/         7
  data/demo.tsx   jeux de démonstration — tout ce qui n'existe PAS en base
  hooks/          chargement des données (session, datarooms, documents)
  styles/         tokens.css et components.css, extraits du prototype
  theme/          moteur de personnalisation « marque grise »
```

## Atomic Design — où ranger un nouveau composant

Un composant par fichier, nommé comme lui. Le niveau se déduit d'une seule
question : **de quoi ce composant a-t-il besoin pour exister ?**

| Niveau | Définition | Exemples |
|---|---|---|
| `atoms` | N'importe aucun autre composant du design system. | `Button`, `Pill`, `Icon`, `Card`, `BarTrack` |
| `molecules` | Assemble des atomes pour rendre **un** service. | `Field` (label + contrôle), `RowName`, `TabStrip`, `PresetCard` |
| `organisms` | Bloc autonome et signifiant pour l'utilisateur, avec son état si besoin. | `Sidebar`, `Explorer`, `Modal`, `TokenEditor`, `QACard` |
| `templates` | La coquille de page, sans contenu métier. | `AppShell` |
| `pages` | Un écran complet, alimenté par des props ou des hooks. | `HomeScreen`, `StatsScreen`, `SettingsScreen` |

**Règle de dépendance : une couche n'importe que des couches inférieures.** Un
atome qui a besoin d'une molécule n'est pas un atome — c'est le signe qu'il est
mal classé, pas un cas particulier. La contrainte est vérifiable :

```bash
grep -rn "from '\.\./" src/components/atoms/      # ne doit citer aucun autre niveau
```

Chaque niveau expose un baril (`atoms/index.ts`…) et `components/index.ts` les
réunit : à l'usage, tout s'importe depuis `'./components'`, quel que soit le
niveau. Les types voyagent avec leur composant (`PillKind` dans `Pill.tsx`,
`TreeNodeData` dans `Explorer.tsx`).

## Ce qui est réellement branché

Endpoints consommés (`backend/datarooms/urls.py`) :

- `POST /api/login/`, `GET /api/whoami/`, `GET /api/my-offices/`
- `GET /api/tenant-config/` — nom de l'office, logo, modules activés
- `GET|POST /api/datarooms/`
- `GET|POST /api/datarooms/<id>/documents/`
- `POST /api/sso/issue/` — bascule d'office

Non modélisé côté serveur, donc servi depuis `src/data/demo.tsx` : portefeuilles,
arborescence de rubriques, Q&R, membres d'une dataroom, historique d'audit,
statistiques d'usage, facturation, sessions ouvertes, modèles de dataroom,
écriture de l'identité de l'office. La topbar affiche « Données partiellement
simulées » tant que c'est le cas.

## Moteur de personnalisation (`src/theme/`)

Portage du `window.TenantTheme` du prototype :

- `schema.ts` — **le** référentiel des 55 variables éditables (clair + sombre),
  des presets de typographie et de formes. Miroir exact de l'IIFE de
  `index_16.html` et de `design-system/tokens.py`.
- `color.ts` — conversions et parsing (`#rgb`, `#rrggbbaa`, `rgba(...)`,
  `rgb(r g b / a%)`).
- `engine.ts` — génération du CSS (`:root`, `prefers-color-scheme`,
  `[data-theme]`), persistance, valeurs par défaut.
- `ThemeProvider.tsx` + `useTenantTheme.ts` — état React et application live.

L'écran Personnalisation → Apparence est **généré** depuis ce référentiel :
aucune couleur n'y est écrite en dur. `applyThemeEarly()` est appelé dans
`main.tsx` avant le premier rendu pour éviter un flash aux couleurs par défaut.

## Commandes

```bash
npm run dev      # serveur de dev (HTTPS, voir SETUP.md)
npm run build    # tsc -b puis vite build
npm run lint     # oxlint
```
