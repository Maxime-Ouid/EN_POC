import { useEffect, useState, type DragEvent, type FormEvent } from 'react';

interface OfficeMembership {
  subdomain: string;
  name: string;
  role: string;
}

interface TenantConfig {
  name: string;
  logo_url: string;
  primary_color: string;
  enabled_modules: string[];
}

interface DataroomSummary {
  id: number;
  name: string;
  created_at: string;
}

interface DocumentSummary {
  id: number;
  name: string;
  file: string;
  uploaded_at: string;
}

interface FolderSummary {
  id: number;
  name: string;
  created_at: string;
}

interface OfficeUserRow {
  membership_id: number;
  user_id: number;
  username: string;
  role: string;
}

interface AccessRestrictionSummary {
  id: number;
  kind: 'dataroom' | 'folder' | 'document';
  dataroom_id: number;
  target_id: number;
  label: string;
  user_ids: number[];
}

function accessEndpoint(kind: 'dataroom' | 'folder' | 'document', dataroomId: number, targetId: number): string {
  if (kind === 'dataroom') return `${apiOrigin}/api/datarooms/${dataroomId}/access/`;
  if (kind === 'folder') return `${apiOrigin}/api/datarooms/${dataroomId}/folders/${targetId}/access/`;
  return `${apiOrigin}/api/datarooms/${dataroomId}/documents/${targetId}/access/`;
}

const ROLE_OPTIONS = ['superadmin', 'admin', 'membre', 'client'];
// Même ordre hiérarchique que OfficeMembership.ROLE_RANK côté backend (source de
// vérité — le serveur revalide toujours, ce filtrage n'est qu'un confort d'UI pour ne
// pas proposer des rôles que l'appelant ne pourrait de toute façon pas assigner).
const ROLE_RANK: Record<string, number> = { superadmin: 3, admin: 2, membre: 1, client: 0 };

function rolesAtOrBelow(role: string): string[] {
  const rank = ROLE_RANK[role] ?? -1;
  return ROLE_OPTIONS.filter(r => ROLE_RANK[r] <= rank);
}

type View =
  | { kind: 'home' }
  | { kind: 'datarooms' }
  | { kind: 'dataroom'; dataroom: { id: number; name: string } }
  | { kind: 'module'; slug: string; label: string }
  | { kind: 'users' };

const MODULE_LABELS: Record<string, string> = {
  'coffre-fort': 'Coffre-fort',
  'confiance-rib': 'ConfianceRIB',
};

const apiOrigin = `https://${window.location.hostname}:8000`;

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function switchOffice(subdomain: string) {
  const res = await fetch(`${apiOrigin}/api/sso/issue/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken') ?? '',
    },
    body: JSON.stringify({ target: subdomain }),
  });
  if (!res.ok) {
    alert("Impossible de changer d'office");
    return;
  }
  const { ticket } = await res.json();
  window.location.href =
    `https://${subdomain}.localhost:8000/api/sso/consume/?ticket=${encodeURIComponent(ticket)}`;
}

function MfaChallenge({
  stage,
  qrCode,
  secret,
  onSubmit,
}: {
  stage: 'enroll' | 'verify';
  qrCode: string | null;
  secret: string | null;
  onSubmit: (token: string) => void;
}) {
  const [token, setToken] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(token);
  }

  return (
    <form onSubmit={handleSubmit}>
      {stage === 'enroll' ? (
        <>
          <p>Scannez ce QR code avec votre application d'authentification (Google
             Authenticator, etc.), puis saisissez le code à 6 chiffres généré :</p>
          {qrCode && <img src={qrCode} alt="QR code TOTP" width={200} height={200} />}
          {secret && <p>Secret (saisie manuelle) : <code>{secret}</code></p>}
        </>
      ) : (
        <p>Saisissez le code à 6 chiffres de votre application d'authentification :</p>
      )}
      <input value={token} onChange={e => setToken(e.target.value)} placeholder="Code TOTP" />
      <button type="submit">Valider</button>
    </form>
  );
}

function OfficePicker({ offices, title }: { offices: OfficeMembership[]; title: string }) {
  return (
    <div>
      <p>{title}</p>
      <ul>
        {offices.map(o => (
          <li key={o.subdomain}>
            <button onClick={() => switchOffice(o.subdomain)}>{o.name} ({o.role})</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Header({
  config,
  otherOffices,
  currentUser,
  isOfficeManager,
  view,
  setView,
}: {
  config: TenantConfig;
  otherOffices: OfficeMembership[];
  currentUser: string | null;
  isOfficeManager: boolean;
  view: View;
  setView: (v: View) => void;
}) {
  return (
    <header>
      <h1 style={{ color: 'var(--primary-color)' }}>{config.name}</h1>
      <p>Connecté(e) : {currentUser ?? '...'}</p>
      <nav>
        <button disabled={view.kind === 'home'} onClick={() => setView({ kind: 'home' })}>Accueil</button>
        <button disabled={view.kind === 'datarooms'} onClick={() => setView({ kind: 'datarooms' })}>Datarooms</button>
        {config.enabled_modules.map(slug => (
          <button
            key={slug}
            disabled={view.kind === 'module' && view.slug === slug}
            onClick={() => setView({ kind: 'module', slug, label: MODULE_LABELS[slug] ?? slug })}
          >
            {MODULE_LABELS[slug] ?? slug}
          </button>
        ))}
        {isOfficeManager && (
          <button disabled={view.kind === 'users'} onClick={() => setView({ kind: 'users' })}>Utilisateurs</button>
        )}
      </nav>
      {otherOffices.length > 0 && <OfficePicker offices={otherOffices} title="Changer d'office :" />}
    </header>
  );
}

function HomePage({ config }: { config: TenantConfig }) {
  return <p>Bienvenue sur l'espace de {config.name}.</p>;
}

function ModulePage({ slug, label }: { slug: string; label: string }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (slug !== 'coffre-fort') return;
    fetch(`${apiOrigin}/api/modules/coffre-fort/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setMessage(data.message ?? data.error ?? null));
  }, [slug]);

  return (
    <section>
      <h2>{label}</h2>
      {slug === 'coffre-fort'
        ? <p>{message ?? 'Chargement...'}</p>
        : <p>Module « {label} » activé — pas de contenu de démonstration implémenté.</p>}
    </section>
  );
}

function DataroomsPage({ onOpen }: { onOpen: (d: { id: number; name: string }) => void }) {
  const [datarooms, setDatarooms] = useState<DataroomSummary[]>([]);
  const [name, setName] = useState('');

  function loadDatarooms() {
    fetch(`${apiOrigin}/api/datarooms/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setDatarooms);
  }

  useEffect(loadDatarooms, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const res = await fetch(`${apiOrigin}/api/datarooms/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') ?? '',
      },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      alert('Impossible de créer la dataroom');
      return;
    }
    setName('');
    loadDatarooms();
  }

  return (
    <section>
      <h2>Datarooms</h2>
      <ul>
        {datarooms.map(d => (
          <li key={d.id}>
            <button onClick={() => onOpen({ id: d.id, name: d.name })}>{d.name}</button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreate}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la dataroom" />
        <button type="submit">Créer</button>
      </form>
    </section>
  );
}

function DataroomDetailPage({
  dataroom,
  onBack,
  isOfficeManager,
}: {
  dataroom: { id: number; name: string };
  onBack: () => void;
  isOfficeManager: boolean;
}) {
  const [folderPath, setFolderPath] = useState<{ id: number; name: string }[]>([]);
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [officeUsers, setOfficeUsers] = useState<OfficeUserRow[]>([]);
  const [accessPanel, setAccessPanel] = useState<
    { kind: 'dataroom' | 'folder' | 'document'; id: number; label: string } | null
  >(null);
  const [accessUserIds, setAccessUserIds] = useState<number[]>([]);

  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null;

  useEffect(() => {
    if (!isOfficeManager) return;
    fetch(`${apiOrigin}/api/office-users/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setOfficeUsers);
  }, [isOfficeManager]);

  function loadLevel() {
    const url = currentFolderId
      ? `${apiOrigin}/api/datarooms/${dataroom.id}/folders/?parent=${currentFolderId}`
      : `${apiOrigin}/api/datarooms/${dataroom.id}/folders/`;
    fetch(url, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setFolders(data.folders ?? []);
        setDocuments(data.documents ?? []);
      });
  }

  useEffect(loadLevel, [dataroom.id, currentFolderId]);

  async function uploadFile(file: File) {
    const body = new FormData();
    body.append('file', file);
    if (currentFolderId != null) body.append('folder', String(currentFolderId));
    const res = await fetch(`${apiOrigin}/api/datarooms/${dataroom.id}/documents/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': getCookie('csrftoken') ?? '' },
      body,
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Échec de l'upload");
      return;
    }
    loadLevel();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  async function handleCreateFolder(e: FormEvent) {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const res = await fetch(`${apiOrigin}/api/datarooms/${dataroom.id}/folders/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') ?? '',
      },
      body: JSON.stringify({ name: trimmed, parent: currentFolderId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? 'Impossible de créer le dossier');
      return;
    }
    setNewFolderName('');
    loadLevel();
  }

  function openFolder(folder: FolderSummary) {
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
  }

  function goToLevel(index: number) {
    setFolderPath(prev => prev.slice(0, index + 1));
  }

  async function openAccessPanel(kind: 'dataroom' | 'folder' | 'document', id: number, label: string) {
    const res = await fetch(accessEndpoint(kind, dataroom.id, id), { credentials: 'include' });
    const data = await res.json();
    setAccessPanel({ kind, id, label });
    setAccessUserIds(data.user_ids ?? []);
  }

  function toggleAccessUser(userId: number) {
    setAccessUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  async function saveAccessPanel() {
    if (!accessPanel) return;
    const res = await fetch(accessEndpoint(accessPanel.kind, dataroom.id, accessPanel.id), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') ?? '',
      },
      body: JSON.stringify({ user_ids: accessUserIds }),
    });
    if (!res.ok) {
      alert("Impossible d'enregistrer la restriction");
      return;
    }
    setAccessPanel(null);
    loadLevel();
  }

  return (
    <section>
      <button onClick={onBack}>← Retour aux datarooms</button>
      <h2>{dataroom.name}</h2>
      {isOfficeManager && (
        <button onClick={() => openAccessPanel('dataroom', dataroom.id, dataroom.name)}>
          Restreindre l'accès à cette dataroom
        </button>
      )}
      <nav>
        <button onClick={() => goToLevel(-1)} disabled={folderPath.length === 0}>Racine</button>
        {folderPath.map((f, i) => (
          <span key={f.id}>
            {' / '}
            <button onClick={() => goToLevel(i)} disabled={i === folderPath.length - 1}>{f.name}</button>
          </span>
        ))}
      </nav>
      <ul>
        {folders.map(f => (
          <li key={`folder-${f.id}`}>
            📁 <button onClick={() => openFolder(f)}>{f.name}</button>
            {isOfficeManager && (
              <button onClick={() => openAccessPanel('folder', f.id, f.name)}>Accès</button>
            )}
          </li>
        ))}
        {documents.map(d => (
          <li key={`doc-${d.id}`}>
            <a href={d.file} target="_blank" rel="noreferrer">{d.name}</a>
            {isOfficeManager && (
              <button onClick={() => openAccessPanel('document', d.id, d.name)}>Accès</button>
            )}
          </li>
        ))}
      </ul>

      {accessPanel && (
        <div style={{ border: '1px solid #999', padding: '8px', marginBottom: '16px' }}>
          <p>
            Restreindre l'accès de « {accessPanel.label} » — aucune case cochée =
            accès ouvert à tout l'office (comportement par défaut) :
          </p>
          {officeUsers.map(u => (
            <label key={u.user_id} style={{ display: 'block' }}>
              <input
                type="checkbox"
                checked={accessUserIds.includes(u.user_id)}
                onChange={() => toggleAccessUser(u.user_id)}
              />
              {u.username}
            </label>
          ))}
          <button onClick={saveAccessPanel}>Enregistrer</button>
          <button onClick={() => setAccessPanel(null)}>Annuler</button>
        </div>
      )}

      <form onSubmit={handleCreateFolder}>
        <input
          value={newFolderName}
          onChange={e => setNewFolderName(e.target.value)}
          placeholder="Nom du dossier"
        />
        <button type="submit">Créer un dossier</button>
      </form>
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        style={{ border: '1px dashed #999', padding: '16px' }}
      >
        <p>Glisser-déposer un fichier ici, ou :</p>
        <label>
          Parcourir…
          <input
            type="file"
            style={{ display: 'block' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </section>
  );
}

function UsersPage({ callerRole }: { callerRole: string }) {
  const [users, setUsers] = useState<OfficeUserRow[]>([]);
  const [mode, setMode] = useState<'create' | 'attach'>('create');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const allowedRoles = rolesAtOrBelow(callerRole);
  const [role, setRole] = useState(allowedRoles[allowedRoles.length - 1] ?? 'membre');

  function loadUsers() {
    fetch(`${apiOrigin}/api/office-users/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setUsers);
  }

  useEffect(loadUsers, []);

  function resetForm() {
    setUsername('');
    setPassword('');
    setRole(allowedRoles[allowedRoles.length - 1] ?? 'membre');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || !password) return;
    const res = await fetch(`${apiOrigin}/api/office-users/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') ?? '',
      },
      body: JSON.stringify({ username: trimmed, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? 'Impossible de créer cet utilisateur');
      return;
    }
    resetForm();
    loadUsers();
  }

  async function handleAttach(e: FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    const res = await fetch(`${apiOrigin}/api/office-users/attach/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') ?? '',
      },
      body: JSON.stringify({ username: trimmed, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? 'Impossible de rattacher cet utilisateur');
      return;
    }
    resetForm();
    loadUsers();
  }

  async function handleRoleChange(membershipId: number, newRole: string) {
    const res = await fetch(`${apiOrigin}/api/office-users/${membershipId}/`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') ?? '',
      },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      alert('Impossible de modifier le rôle');
      return;
    }
    loadUsers();
  }

  const [restrictionsPanelUser, setRestrictionsPanelUser] = useState<OfficeUserRow | null>(null);
  const [restrictions, setRestrictions] = useState<AccessRestrictionSummary[]>([]);

  async function loadRestrictions() {
    const res = await fetch(`${apiOrigin}/api/access-restrictions/`, { credentials: 'include' });
    setRestrictions(await res.json());
  }

  async function openRestrictionsPanel(u: OfficeUserRow) {
    setRestrictionsPanelUser(u);
    await loadRestrictions();
  }

  async function toggleUserInRestriction(r: AccessRestrictionSummary) {
    if (!restrictionsPanelUser) return;
    const included = r.user_ids.includes(restrictionsPanelUser.user_id);
    const newIds = included
      ? r.user_ids.filter(id => id !== restrictionsPanelUser.user_id)
      : [...r.user_ids, restrictionsPanelUser.user_id];
    const res = await fetch(accessEndpoint(r.kind, r.dataroom_id, r.target_id), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') ?? '',
      },
      body: JSON.stringify({ user_ids: newIds }),
    });
    if (!res.ok) {
      alert('Impossible de modifier la restriction');
      return;
    }
    loadRestrictions();
  }

  return (
    <section>
      <h2>Utilisateurs de l'office</h2>
      <table>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Rôle</th>
            <th>Restrictions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.membership_id}>
              <td>{u.username}</td>
              <td>
                <select value={u.role} onChange={e => handleRoleChange(u.membership_id, e.target.value)}>
                  {rolesAtOrBelow(callerRole).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </td>
              <td>
                <button onClick={() => openRestrictionsPanel(u)}>Restrictions</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {restrictionsPanelUser && (
        <div style={{ border: '1px solid #999', padding: '8px', marginBottom: '16px' }}>
          <p>Restrictions concernant {restrictionsPanelUser.username} :</p>
          {restrictions.length === 0 ? (
            <p>Aucune restriction définie dans cet office pour le moment.</p>
          ) : (
            restrictions.map(r => (
              <label key={r.id} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={r.user_ids.includes(restrictionsPanelUser.user_id)}
                  onChange={() => toggleUserInRestriction(r)}
                />
                {r.label} ({r.kind})
              </label>
            ))
          )}
          <button onClick={() => setRestrictionsPanelUser(null)}>Fermer</button>
        </div>
      )}

      <nav>
        <button disabled={mode === 'create'} onClick={() => setMode('create')}>
          Créer un nouvel utilisateur
        </button>
        <button disabled={mode === 'attach'} onClick={() => setMode('attach')}>
          Ajouter un utilisateur existant
        </button>
      </nav>

      {mode === 'create' ? (
        <form onSubmit={handleCreate}>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Nom d'utilisateur" />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="Mot de passe"
          />
          <select value={role} onChange={e => setRole(e.target.value)}>
            {allowedRoles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button type="submit">Créer</button>
        </form>
      ) : (
        <form onSubmit={handleAttach}>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Nom d'utilisateur exact"
          />
          <select value={role} onChange={e => setRole(e.target.value)}>
            {allowedRoles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button type="submit">Ajouter</button>
        </form>
      )}
    </section>
  );
}

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = en cours de vérification
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [offices, setOffices] = useState<OfficeMembership[]>([]);
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [configResolved, setConfigResolved] = useState(false);
  const [view, setView] = useState<View>({ kind: 'home' });
  const [mfaStage, setMfaStage] = useState<'enroll' | 'verify' | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);

  async function loadOffices() {
    const res = await fetch(`${apiOrigin}/api/my-offices/`, { credentials: 'include' });
    if (res.ok) {
      setAuthed(true);
      setOffices(await res.json());
      fetch(`${apiOrigin}/api/whoami/`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setCurrentUser(data.username));
    } else {
      setAuthed(false);
    }
  }

  useEffect(() => {
    loadOffices();
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`${apiOrigin}/api/login/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUsername, password: loginPassword }),
    });
    if (!res.ok) {
      alert('Identifiants incorrects');
      return;
    }
    const data = await res.json();
    if (data.enrollment) {
      setMfaStage('enroll');
      const setupRes = await fetch(`${apiOrigin}/api/mfa/setup/`, { credentials: 'include' });
      const setupData = await setupRes.json();
      setQrCode(setupData.qr_code);
      setMfaSecret(setupData.secret);
    } else {
      setMfaStage('verify');
    }
  }

  async function handleMfaSubmit(token: string) {
    const url = mfaStage === 'enroll' ? '/api/mfa/setup/' : '/api/mfa/verify/';
    const res = await fetch(`${apiOrigin}${url}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? 'Code invalide');
      return;
    }
    setCurrentUser(data.username);
    setMfaStage(null);
    setQrCode(null);
    setMfaSecret(null);
    await loadOffices();
  }

  useEffect(() => {
    if (!authed) return;
    fetch(`${apiOrigin}/api/tenant-config/`, { credentials: 'include' })
      .then(res => {
        setConfigResolved(true);
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data) {
          setConfig(data);
          document.documentElement.style.setProperty('--primary-color', data.primary_color);
        }
      });
  }, [authed]);

  if (authed === null) return <p>Chargement...</p>;

  if (mfaStage) {
    return <MfaChallenge stage={mfaStage} qrCode={qrCode} secret={mfaSecret} onSubmit={handleMfaSubmit} />;
  }

  if (!authed) {
    return (
      <form onSubmit={handleLogin}>
        <input value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="Utilisateur" />
        <input value={loginPassword} onChange={e => setLoginPassword(e.target.value)} type="password" placeholder="Mot de passe" />
        <button type="submit">Connexion</button>
      </form>
    );
  }

  if (!configResolved) return <p>Chargement...</p>;

  if (!config) {
    return <OfficePicker offices={offices} title="Choisis un office :" />;
  }

  const otherOffices = offices.filter(o => `${o.subdomain}.localhost` !== window.location.hostname);
  const currentOffice = offices.find(o => `${o.subdomain}.localhost` === window.location.hostname);
  const isOfficeManager = currentOffice != null && ['admin', 'superadmin'].includes(currentOffice.role);

  return (
    <div>
      <Header
        config={config}
        otherOffices={otherOffices}
        currentUser={currentUser}
        isOfficeManager={isOfficeManager}
        view={view}
        setView={setView}
      />
      {view.kind === 'home' && <HomePage config={config} />}
      {view.kind === 'datarooms' && (
        <DataroomsPage onOpen={d => setView({ kind: 'dataroom', dataroom: d })} />
      )}
      {view.kind === 'dataroom' && (
        <DataroomDetailPage
          dataroom={view.dataroom}
          onBack={() => setView({ kind: 'datarooms' })}
          isOfficeManager={isOfficeManager}
        />
      )}
      {view.kind === 'module' && <ModulePage slug={view.slug} label={view.label} />}
      {view.kind === 'users' && isOfficeManager && <UsersPage callerRole={currentOffice!.role} />}
    </div>
  );
}

export default App;
