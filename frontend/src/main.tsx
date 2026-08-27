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
import { IconSprite } from './components'
import { ThemeProvider, applyThemeEarly } from './theme'

// Le thème enregistré est appliqué AVANT le premier rendu : sans cela, une
// étude ayant personnalisé ses couleurs verrait un flash aux couleurs Notantis
// par défaut. C'est l'équivalent React de l'IIFE placée tôt dans le <head> du
// prototype (index_16.html).
const initialTheme = applyThemeEarly();

// Deux vues de développement, en plus de l'application réelle (App.tsx) :
//   ?view=ui-kit             la bibliothèque de composants, fiche par fiche
//   ?view=prototype-preview  la reconstitution navigable du prototype
// Aucune des deux ne touche à App.tsx ni au backend.
const view = new URLSearchParams(window.location.search).get('view');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider initialState={initialTheme}>
      <IconSprite />
      {view === 'ui-kit' ? <UiKit /> : view === 'prototype-preview' ? <PrototypeDemo /> : <App />}
    </ThemeProvider>
  </StrictMode>,
)
