/* Tableau de bord modulable.

   Cette couche est AU-DESSUS de components/ : elle assemble des composants qui
   ignorent tout des widgets (WidgetFrame, DashboardGrid, WidgetLibrary,
   TemplateGallery) avec le catalogue applicatif (registry, templates). Rien
   dans components/ ne doit importer d'ici — voir l'en-tête de DashboardScreen. */
export * from './DashboardScreen';
export * from './actions';
export * from './registry';
export * from './templates';
export * from './types';
export * from './layout';
