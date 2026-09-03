import { createContext, useContext } from 'react';

/* ===========================================================================
   Commandes de la coquille, prêtées aux écrans.

   Même raison d'être que topbarSlots.ts, dans l'autre sens : là, l'écran
   projette SES commandes dans la topbar ; ici, il déclenche celles qui
   appartiennent à la coquille.

   Le cas qui l'a fait naître : le widget « Actions rapides » de l'accueil
   propose « Rechercher », or la palette est ouverte par AppShell, qui en tient
   l'état. App.tsx est encore AU-DESSUS d'AppShell : lui passer la commande
   aurait voulu dire remonter `searchOpen` dans App pour le redescendre en prop
   à AppShell — un état de coquille tenu par l'application, à recopier dans
   chaque appelant (PrototypeDemo, V1AppView, UiKit) qui n'en a que faire.

   Hors AppShell, les commandes valent `null` : l'écran ne les propose alors
   pas, plutôt que d'offrir un bouton sans effet.
   =========================================================================== */

export interface ShellCommands {
  /** Ouvre la palette de recherche (⌘K). `null` si la coquille n'en a pas. */
  openSearch: (() => void) | null;
}

const NONE: ShellCommands = { openSearch: null };

export const ShellCommandsContext = createContext<ShellCommands>(NONE);

export function useShellCommands(): ShellCommands {
  return useContext(ShellCommandsContext);
}
