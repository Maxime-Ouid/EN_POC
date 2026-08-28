/* ===========================================================================
   Modèle de navigation, partagé par le rail vertical (Sidebar, monté par
   AppShell) et la barre d'onglets horizontale (NavBar).

   Ces types vivaient dans AppShell.tsx. Ils en ont été sortis quand la
   navigation a pu changer de place : NavBar est un organisme, AppShell un
   template — l'organisme ne doit pas importer le template qui le monte.
   AppShell les réexporte, les imports existants (`data/demo.tsx`, `v1/nav.ts`)
   n'ont pas bougé.
   =========================================================================== */

export interface NavSubEntry {
  key: string;
  label: string;
  count?: number;
}

export interface NavEntry {
  key: string;
  icon: string;
  label: string;
  count?: number;
  /**
   * Sous-entrées de la rubrique (navigation V1 : « Dossiers » → « Exports
   * multiples », « Espaces clients »…). Une rubrique qui en porte affiche un
   * chevron ; cliquer dessus l'ouvre ET navigue vers sa première sous-entrée,
   * comme l'interface actuelle.
   */
  items?: NavSubEntry[];
}

export interface NavSection {
  label: string;
  items: NavEntry[];
}
