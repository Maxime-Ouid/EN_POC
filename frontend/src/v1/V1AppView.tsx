import { useEffect, useMemo, useState } from 'react';
import { Card, LoginScreen } from '../components';
import { MODULE_CATALOG } from '../data/demo';
import { useDatarooms } from '../hooks/useDatarooms';
import { useSession } from '../hooks/useSession';
import { useTenantTheme } from '../theme/useTenantTheme';
import { EspaceNotarialV1 } from './EspaceNotarialV1';
import {
  DEMO_OFFICE_CONTENT,
  V1_ADMINS_PAR_DOSSIER,
  V1_ADMINS_TOTAL,
  V1_ANNUAIRE_ETUDE,
  V1_ANNUAIRE_TOTAL,
  V1_CONNECTES,
  V1_DOSSIERS_TOTAL,
  V1_ESPACES_CLIENTS,
  V1_ESPACES_CLIENTS_TOTAL,
  V1_ETUDES_DESTINATAIRES,
  V1_FACTURATION_ANNEES,
  V1_FACTURES,
} from './data';
import type { V1DossierRow } from '../components';

/* La navigation V1 branchée sur le backend Django.

   Ce qui est RÉEL ici : la connexion, l'identité de l'office, la liste des
   dossiers (/api/datarooms/), les modules activés (/api/tenant-config/) et
   l'onglet Personnalisation → Apparence, qui écrit dans /api/tenant-theme/.

   Ce qui reste simulé : espaces clients, annuaires, administrateurs délégués,
   sessions ouvertes, facturation, et les réglages de contenu de l'office
   (coordonnées, emails, accueil, espace client) — aucun endpoint n'existe. La
   pastille de la topbar et la note sous chaque formulaire le disent à l'écran.

   Accessible en dev sur https://<host>:5173/?view=v1-app. */
export function V1AppView() {
  const session = useSession();
  const authenticated = session.status === 'authenticated';
  const datarooms = useDatarooms(authenticated);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [content, setContent] = useState(DEMO_OFFICE_CONTENT);

  const { syncFromServer } = useTenantTheme();
  useEffect(() => {
    if (authenticated) void syncFromServer();
  }, [authenticated, syncFromServer]);

  const modulesWithServerState = useMemo(() => {
    const enabled = new Set(session.tenant?.enabled_modules ?? []);
    return MODULE_CATALOG.map(m => (m.comingSoon ? m : { ...m, enabled: enabled.has(m.slug) }));
  }, [session.tenant]);

  if (session.status === 'loading') {
    return <Centered>Chargement de votre espace…</Centered>;
  }

  if (session.status === 'error') {
    return <Centered>Backend injoignable — {session.error}</Centered>;
  }

  if (!authenticated) {
    return (
      <LoginScreen
        officeName={session.tenant?.name ?? 'Espace Notarial'}
        officeDomain={window.location.host}
        error={loginError}
        onSubmit={(identifier, password) => {
          setLoginError(undefined);
          session.login(identifier, password).catch((err: Error) => setLoginError(err.message));
        }}
      />
    );
  }

  const username = session.user?.username ?? '';
  const currentOffice = session.offices.find(o => o.name === session.tenant?.name);

  const rows: V1DossierRow[] = datarooms.items.map(d => ({
    id: String(d.id),
    name: d.name,
    numero: '',
    espaceClient: session.tenant?.name ?? '—',
    type: 'Dataroom',
  }));

  return (
    <EspaceNotarialV1
      officeName={session.tenant?.name ?? 'Office'}
      officeRole={currentOffice?.role ?? '—'}
      logoUrl={session.tenant?.logo_url || undefined}
      userName={username}
      userInitials={initialsOf(username)}
      userRole={currentOffice?.role ?? 'Membre'}
      dossiers={rows}
      // Le total de référence de la V1 (245) n'est pas celui du POC : l'écran
      // affiche les deux séparément plutôt que de faire passer l'un pour l'autre.
      dossiersTotal={V1_DOSSIERS_TOTAL}
      dossiersNotice={
        datarooms.loading ? 'Chargement des dossiers…' : (datarooms.error ?? null)
      }
      espacesClients={V1_ESPACES_CLIENTS}
      espacesClientsTotal={V1_ESPACES_CLIENTS_TOTAL}
      annuaire={V1_ANNUAIRE_ETUDE}
      annuaireTotal={V1_ANNUAIRE_TOTAL}
      adminsParDossier={V1_ADMINS_PAR_DOSSIER}
      adminsTotal={V1_ADMINS_TOTAL}
      connectes={V1_CONNECTES}
      facturationAnnees={V1_FACTURATION_ANNEES}
      factures={V1_FACTURES}
      etudesDestinataires={V1_ETUDES_DESTINATAIRES}
      derniersDossiers={datarooms.items.slice(0, 3).map(d => ({
        id: String(d.id),
        name: d.name,
        date: new Date(d.created_at).toLocaleDateString('fr-FR'),
      }))}
      supportEmail="support.applicatif@paris.notaires.fr"
      supportTelephone="01.76.53.73.91"
      content={content}
      onContentChange={setContent}
      // Pas de bouton d'enregistrement actif : aucun endpoint n'écrit ces
      // réglages. Un bouton qui « réussit » sans rien enregistrer ferait croire
      // la fonctionnalité livrée.
      contentNote="Ces réglages n'ont pas encore d'endpoint côté serveur : la saisie reste locale à cette session. Seul l'onglet Apparence est réellement enregistré (/api/tenant-theme/)."
      modules={{
        modules: modulesWithServerState,
        readOnly: true,
        readOnlyNote:
          "L'activation d'un module se fait aujourd'hui côté Notantis (admin Django) : cet écran montre ce dont l'office dispose réellement, sans le modifier.",
      }}
      noticeLabel="Données partiellement simulées"
    />
  );
}

function initialsOf(name: string): string {
  const parts = name.replace(/[@.].*$/, '').split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
      <Card padded style={{ maxWidth: 420, textAlign: 'center' }}>
        {children}
      </Card>
    </div>
  );
}
