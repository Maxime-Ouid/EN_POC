import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// tokens.css doit précéder components.css : le second ne fait que consommer les
// custom properties du premier. (L'index.css du template Vite a été supprimé —
// il imposait #root{width:1126px} et redéfinissait --bg/--border/--accent, ce
// qui bridait l'app en colonne centrée et entrait en collision avec les tokens.)
import './styles/tokens.css'
import './styles/components.css'
import App from './App.tsx'
import { PrototypeDemo } from './PrototypeDemo'
import { UiKit } from './uikit/UiKit'
import { V1AppView } from './v1/V1AppView'
import { V1Preview } from './v1/V1Preview'
import type { V1ScreenKey } from './v1/nav'
import { IconSprite } from './components'
import { ThemeProvider, applyThemeEarly } from './theme'
import { apiThemeTransport } from './api/theme'

// Le thème en cache est appliqué AVANT le premier rendu : sans cela, une étude
// ayant personnalisé ses couleurs verrait un flash aux couleurs Notantis par
// défaut. C'est l'équivalent React de l'IIFE placée tôt dans le <head> du
// prototype (index_16.html). La source de vérité reste le serveur : le
// ThemeProvider recharge GET /api/tenant-theme/ juste après le montage, et
// après chaque connexion (voir App.tsx).
const initialTheme = applyThemeEarly();

// Vues disponibles, en plus de l'application réelle (App.tsx) :
//   ?view=ui-kit             la bibliothèque de composants, fiche par fiche
//   ?view=prototype-preview  la reconstitution navigable du prototype V2
//   ?view=v1                 l'Espace Notarial ACTUEL reconstruit, sur données
//                            de démonstration — la maquette à partager
//   ?view=v1-app             la même navigation V1, branchée sur Django
// Seule `v1-app` parle au backend ; les autres sont autonomes.
const params = new URLSearchParams(window.location.search);
const view = params.get('view');
// `?view=v1&screen=facturation` ouvre directement une rubrique — pratique pour
// partager un écran précis avec le client sans expliquer où cliquer.
const initialScreen = params.get('screen') as V1ScreenKey | null;
const usesBackend = !view || view === 'v1-app';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider
      initialState={initialTheme}
      // Le UI kit et les maquettes n'ont pas de backend : ils restent en
      // personnalisation locale, sans transport.
      transport={usesBackend ? apiThemeTransport : undefined}
    >
      <IconSprite />
      {view === 'ui-kit' ? (
        <UiKit />
      ) : view === 'prototype-preview' ? (
        <PrototypeDemo />
      ) : view === 'v1' ? (
        <V1Preview initialScreen={initialScreen ?? undefined} />
      ) : view === 'v1-app' ? (
        <V1AppView />
      ) : (
        <App />
      )}
    </ThemeProvider>
  </StrictMode>,
)
