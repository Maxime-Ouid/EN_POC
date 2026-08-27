import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/tokens.css'
import './styles/components.css'
import App from './App.tsx'
import { PrototypeDemo } from './PrototypeDemo'
import { IconSprite } from './components/icons/IconSprite'

// Aperçu de la bibliothèque de composants + reconstitution du prototype,
// accessible en dev sur https://<host>:5173/?view=prototype-preview — sans
// toucher à App.tsx (l'app réelle, branchée sur le backend).
const showPreview =
  new URLSearchParams(window.location.search).get('view') === 'prototype-preview';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IconSprite />
    {showPreview ? <PrototypeDemo /> : <App />}
  </StrictMode>,
)
