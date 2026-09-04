import { useState } from 'react';
import {
  AppShell,
  AuditTrailScreen,
  Card,
  HyperadminOfficesScreen,
  ImpersonateModal,
  LoginScreen,
  MfaScreen,
  MigrationConsoleScreen,
  NewOfficeModal,
  OfficeModulesModal,
  PlatformNotificationsScreen,
  PlatformReportingScreen,
} from '../components';
import type { HyperadminOfficeRow } from '../api/endpoints';
import { useHyperadminOffices } from '../hooks/useHyperadminOffices';
import { useSession } from '../hooks/useSession';
import { HYPERADMIN_CRUMBS, HYPERADMIN_NAV } from './nav';
import {
  ACCOUNTING_EXPORTS,
  IMPERSONATE_CANDIDATES,
  MIGRATION_BATCHES,
  PLATFORM_AUDIT_EVENTS,
  PLATFORM_NOTICES,
  PLATFORM_OFFICES,
  PLATFORM_STATS,
} from '../data/platformDemo';

/**
 * Racine séparée de l'app office (App.tsx) — même statut architectural que
 * V1AppView/PrototypeDemo (src/v1/, src/PrototypeDemo.tsx) : montée depuis
 * main.tsx quand window.location.hostname === 'hyperadmin.localhost'.
 * useSession() est réutilisé tel quel : mfaSetup/mfaVerify/whoami/logout ne
 * dépendent d'aucun office, et myOffices/tenantConfig se dégradent déjà
 * proprement (.catch(() => [] / null)) sur cet hôte où aucun des deux n'a de
 * sens.
 *
 * DEPUIS LE 03/09/2026 : la console monte l'AppShell de l'application, rail
 * vertical compris (voir nav.ts). Elle portait jusque-là un en-tête à elle,
 * écrit en styles inline — deux barres à maintenir, deux hauteurs, deux
 * typographies, et aucune des personnalisations du design system ne
 * l'atteignait. Ce qui reste propre à la console est dit en props et non en
 * CSS : pas de recherche globale (elle exige une session d'office), pas de
 * cloche (rien n'en émet pour un rôle transverse), pas de sélecteur d'office
 * (`offices` absent : le composant redevient une étiquette).
 */
export function HyperadminApp() {
  const session = useSession();
  const authenticated = session.status === 'authenticated';
  const username = session.user?.username ?? '';

  const [loginError, setLoginError] = useState<string | undefined>();
  const [mfaError, setMfaError] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [modulesOffice, setModulesOffice] = useState<HyperadminOfficeRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  /* Rubrique ouverte. La console n'en avait qu'une jusqu'au 03/09/2026, d'où
     l'`activeScreen="offices"` figé et l'`onNavigate` vide qu'on remplace ici. */
  const [screen, setScreen] = useState('offices');
  const [impersonateOffice, setImpersonateOffice] = useState<HyperadminOfficeRow | null>(null);
  const [migrationScenario, setMigrationScenario] = useState<
    'nouvelles-datarooms' | 'reprise-integrale' | null
  >(null);

  const offices = useHyperadminOffices(authenticated);

  if (session.status === 'loading') {
    return <Centered>Chargement…</Centered>;
  }

  if (session.status === 'error') {
    return <Centered>Backend injoignable — {session.error}</Centered>;
  }

  if (session.status === 'mfa-enroll' || session.status === 'mfa-verify') {
    return (
      <MfaScreen
        mode={session.status === 'mfa-enroll' ? 'enroll' : 'verify'}
        qrCode={session.mfaQrCode}
        secret={session.mfaSecret}
        error={mfaError}
        onSubmit={token => {
          setMfaError(undefined);
          session.submitMfa(token).catch((err: Error) => setMfaError(err.message));
        }}
      />
    );
  }

  if (!authenticated) {
    return (
      <LoginScreen
        officeName="Notantis"
        officeDomain="hyperadmin.localhost"
        error={loginError}
        onSubmit={(identifier, password) => {
          setLoginError(undefined);
          session.login(identifier, password).catch((err: Error) => setLoginError(err.message));
        }}
      />
    );
  }

  return (
    <AppShell
      // Deux mots courts : le rail réserve deux lignes à la marque, et
      // « Interface hyperadmin » y passait à la ligne au milieu du mot.
      brandName="Hyperadmin"
      brandSub="Notantis"
      // Le bandeau d'office est masqué (voir showTenantSwitcher) — la console
      // n'administre aucune étude en particulier. Les deux props restent
      // renseignées : elles alimentent les libellés d'accessibilité si le
      // bandeau revient un jour.
      officeName="Notantis"
      officeRole="Toutes les études"
      showTenantSwitcher={false}
      navSections={HYPERADMIN_NAV}
      activeScreen={screen}
      onNavigate={setScreen}
      userInitials={(username.slice(0, 2) || 'NA').toUpperCase()}
      userName={username}
      // Le rail dit déjà « Hyperadmin » en haut ; le pied dit ce que la marque
      // ne dit pas — l'étendue du rôle de la personne connectée.
      userRole="Rôle transverse"
      onLogout={() => void session.logout()}
      breadcrumbCurrent={HYPERADMIN_CRUMBS[screen] ?? 'Offices'}
      breadcrumbRoot="Notantis"

      showSearch={false}
      showNotifications={false}
    >
      {screen === 'offices' && (
        <HyperadminOfficesScreen
          offices={offices.offices}
          modules={offices.modules}
          loading={offices.loading}
          error={offices.error}
          actionError={actionError}
          onCreateOffice={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          onToggleActive={office => {
            setActionError(null);
            offices
              .setActive(office.id, !office.is_active)
              .catch((err: Error) => setActionError(err.message));
          }}
          onManageModules={office => setModulesOffice(office)}
          onImpersonate={office => setImpersonateOffice(office)}
        />
      )}

      {screen === 'reporting' && (
        <PlatformReportingScreen
          stats={PLATFORM_STATS}
          offices={PLATFORM_OFFICES}
          exports={ACCOUNTING_EXPORTS}
        />
      )}

      {screen === 'notifications' && (
        <PlatformNotificationsScreen
          officeOptions={offices.offices.map(o => ({ id: String(o.id), label: o.name }))}
          history={PLATFORM_NOTICES}
        />
      )}

      {screen === 'securite' && (
        <AuditTrailScreen
          scope="plateforme"
          events={PLATFORM_AUDIT_EVENTS}
          retention="5 ans (journaux de sécurité)"
        />
      )}

      {screen === 'migration' && (
        <MigrationConsoleScreen
          scenario={migrationScenario}
          batches={MIGRATION_BATCHES}
          onScenarioChange={setMigrationScenario}
        />
      )}

      <ImpersonateModal
        open={impersonateOffice !== null}
        onClose={() => setImpersonateOffice(null)}
        officeName={impersonateOffice?.name ?? ''}
        users={IMPERSONATE_CANDIDATES}
        onStart={() => setImpersonateOffice(null)}
      />

      <NewOfficeModal
        open={createOpen}
        error={createError}
        superadmins={offices.superadmins}
        onClose={() => setCreateOpen(false)}
        onSubmit={data => {
          setCreateError(null);
          offices
            .createOffice(data)
            .then(() => setCreateOpen(false))
            .catch((err: Error) => setCreateError(err.message));
        }}
      />

      <OfficeModulesModal
        open={modulesOffice !== null}
        office={modulesOffice}
        modules={offices.modules}
        onClose={() => setModulesOffice(null)}
        onSubmit={(officeId, slugs) => {
          setActionError(null);
          offices
            .setModules(officeId, slugs)
            .then(() => setModulesOffice(null))
            .catch((err: Error) => setActionError(err.message));
        }}
      />
    </AppShell>
  );
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
