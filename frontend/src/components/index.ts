/* Bibliothèque de composants — Atomic Design.

   atoms       indivisibles : un élément d'interface qui ne contient aucun autre
               composant du design system (Button, Pill, Icon, Card…).
   molecules   assemblage court d'atomes rendant UN service (Field = label +
               contrôle, RowName = icône + libellé, TabStrip, PresetCard…).
   organisms   bloc autonome et signifiant pour l'utilisateur, avec sa propre
               logique d'état si besoin (Sidebar, Explorer, Modal, TokenEditor…).
   templates   la coquille de page, sans contenu métier (AppShell).
   pages       un écran complet, alimenté par des props ou des hooks.

   Règle de dépendance : une couche n'importe QUE des couches inférieures.
   Un import qui remonte (un atome tirant une molécule) signale un composant
   mal classé, pas un cas particulier. */
export * from './atoms';
export * from './molecules';
export * from './organisms';
export * from './templates';
export * from './pages';
