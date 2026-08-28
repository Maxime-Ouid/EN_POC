/* ===========================================================================
   Adaptateur entre le moteur de personnalisation (src/theme) et l'API.

   Il existe pour que src/theme ne dépende JAMAIS du client HTTP : le même
   ThemeProvider doit pouvoir tourner dans le UI kit et dans la maquette, sans
   backend. C'est ici, et seulement ici, que les deux mondes se rencontrent.
   =========================================================================== */

import { normalizeThemeState, type ThemeState, type ThemeTransport } from '../theme/engine';
import { api } from './endpoints';

/**
 * Le serveur renvoie un dictionnaire ouvert : on ne fait jamais confiance à sa
 * forme, `normalizeThemeState` complète ce qui manque avec les valeurs par
 * défaut du schéma et ignore les tokens inconnus (une couleur retirée du design
 * system reste alors sans effet, au lieu de casser le rendu).
 */
export const apiThemeTransport: ThemeTransport = {
  async load(signal) {
    const payload = await api.tenantTheme(signal);
    return payload ? normalizeThemeState(payload) : null;
  },

  async save(state: ThemeState) {
    // ThemeState est structurellement un TenantThemePayload (presets typés en
    // union de littéraux d'un côté, string de l'autre) — pas de cast nécessaire.
    await api.saveTenantTheme(state);
  },
};
