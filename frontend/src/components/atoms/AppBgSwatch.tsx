import type { AppBgKey } from '../../theme/schema';

export interface AppBgSwatchProps {
  bg: AppBgKey;
}

// Vignette d'aperçu d'un fond d'application. Elle ne redéfinit aucune couleur :
// components.css écrit chaque fond une seule fois, pour `#app-main` ET pour
// cette vignette — un aperçu qui diverge du rendu réel ne sert à rien.
export function AppBgSwatch({ bg }: AppBgSwatchProps) {
  return <div className="appbg-swatch" data-appbg={bg} aria-hidden="true" />;
}
