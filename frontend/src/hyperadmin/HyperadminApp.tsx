import { useState } from 'react';
import notantisLogo from '../assets/notantis-logo.png';
import {
  Button,
  Card,
  HyperadminOfficesScreen,
  Icon,
  LoginScreen,
  MfaScreen,
  NewOfficeModal,
  OfficeModulesModal,
} from '../components';
import type { HyperadminOfficeRow } from '../api/endpoints';
import { useHyperadminOffices } from '../hooks/useHyperadminOffices';
import { useSession } from '../hooks/useSession';

/**
 * Racine séparée de l'app office (App.tsx) — même statut architectural que
 * V1AppView/PrototypeDemo (src/v1/, src/PrototypeDemo.tsx) : montée depuis
 * main.tsx quand window.location.hostname === 'hyperadmin.localhost', jamais
 * l'AppShell des offices (pas de sélecteur d'office, pas de thème, pas de
 * navigation par module — rien de tout ça n'a de sens pour un rôle transverse
 * à tous les offices). useSession() est réutilisé tel quel : mfaSetup/
 * mfaVerify/whoami/logout ne dépendent d'aucun office, et myOffices/
 * tenantConfig se dégradent déjà proprement (.catch(() => [] / null)) sur cet
 * hôte où aucun des deux n'a de sens.
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28 }}>
            <img
              src={notantisLogo}
              alt="Notantis"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              Interface hyperadmin
            </div>
            <div className="tiny dim">Gestion transverse des offices Notantis</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="tiny dim">{username}</span>
          <Button size="sm" variant="ghost" onClick={() => void session.logout()}>
            <Icon id="logout" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '0 24px 24px' }}>
        <HyperadminOfficesScreen
          offices={offices.offices}
          modules={offices.modules}
          loading={offices.loading}
          error={offices.error}
          onCreateOffice={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
          onToggleActive={office => {
            setActionError(null);
            offices.setActive(office.id, !office.is_active).catch((err: Error) => setActionError(err.message));
          }}
          onManageModules={office => setModulesOffice(office)}
        />
        {actionError && (
          <div className="tiny" style={{ marginTop: 10, color: 'var(--critical)' }}>
            {actionError}
          </div>
        )}
      </main>

      <NewOfficeModal
        open={createOpen}
        error={createError}
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
    </div>
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
