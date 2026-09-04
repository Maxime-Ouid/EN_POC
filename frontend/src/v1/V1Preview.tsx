import { useState } from 'react';
import { DEMO_OFFICE, MODULE_CATALOG } from '../data/demo';
import { EspaceNotarialV1 } from './EspaceNotarialV1';
import {
  DEMO_OFFICE_CONTENT,
  V1_ADMINS_PAR_DOSSIER,
  V1_ADMINS_TOTAL,
  V1_ANNUAIRE_CLIENTS,
  V1_ANNUAIRE_ETUDE,
  V1_ANNUAIRE_TOTAL,
  V1_CONNECTES,
  V1_DERNIERS_DOSSIERS,
  V1_DOSSIERS,
  V1_DOSSIERS_TOTAL,
  V1_ESPACES_CLIENTS,
  V1_ESPACES_CLIENTS_TOTAL,
  V1_ETUDES_DESTINATAIRES,
  V1_FACTURATION_ANNEES,
  V1_FACTURES,
} from './data';
import type { V1ScreenKey } from './nav';

/* Maquette navigable de l'Espace Notarial actuel — aucun appel réseau.

   C'est la version à montrer et à partager : elle se suffit à elle-même, on y
   parcourt toute la navigation V1 et la personnalisation y est locale.
   Accessible en dev sur https://<host>:5173/?view=v1. */
export interface V1PreviewProps {
  /** Écran ouvert au montage (ex. `?view=v1&screen=facturation`). */
  initialScreen?: V1ScreenKey;
}

export function V1Preview({ initialScreen }: V1PreviewProps = {}) {
  const [content, setContent] = useState(DEMO_OFFICE_CONTENT);
  const [modules, setModules] = useState(MODULE_CATALOG);

  return (
    <EspaceNotarialV1
      initialScreen={initialScreen}
      officeName={DEMO_OFFICE.name}
      officeRole={DEMO_OFFICE.role}
      userName={DEMO_OFFICE.userName}
      userInitials={DEMO_OFFICE.userInitials}
      userRole={DEMO_OFFICE.userRole}
      dossiers={V1_DOSSIERS}
      dossiersTotal={V1_DOSSIERS_TOTAL}
      espacesClients={V1_ESPACES_CLIENTS}
      espacesClientsTotal={V1_ESPACES_CLIENTS_TOTAL}
      annuaire={V1_ANNUAIRE_ETUDE}
      annuaireTotal={V1_ANNUAIRE_TOTAL}
      annuaireClients={V1_ANNUAIRE_CLIENTS}
      adminsParDossier={V1_ADMINS_PAR_DOSSIER}
      adminsTotal={V1_ADMINS_TOTAL}
      connectes={V1_CONNECTES}
      facturationAnnees={V1_FACTURATION_ANNEES}
      factures={V1_FACTURES}
      etudesDestinataires={V1_ETUDES_DESTINATAIRES}
      derniersDossiers={V1_DERNIERS_DOSSIERS}
      supportEmail="support.applicatif@paris.notaires.fr"
      supportTelephone="01.76.53.73.91"
      content={content}
      onContentChange={setContent}
      // Maquette : « Enregistrer » ne fait rien d'autre que garder la valeur à
      // l'écran, et l'écran le dit.
      onSaveContent={() => {}}
      contentNote="Maquette — les modifications restent dans cette page et ne sont pas envoyées au serveur."
      modules={{
        modules,
        onToggleModule: (slug, next) =>
          setModules(prev => prev.map(m => (m.slug === slug ? { ...m, enabled: next } : m))),
      }}
      noticeLabel="Maquette — Espace Notarial actuel (V1)"
    />
  );
}
