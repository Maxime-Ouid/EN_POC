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

type View =
  | { kind: 'home' }
  | { kind: 'datarooms' }
  | { kind: 'dataroom'; dataroom: { id: number; name: string } }
  | { kind: 'module'; slug: string; label: string };

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
  view,
  setView,
}: {
  config: TenantConfig;
  otherOffices: OfficeMembership[];
  currentUser: string | null;
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
}: {
  dataroom: { id: number; name: string };
  onBack: () => void;
}) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);

  function loadDocuments() {
    fetch(`${apiOrigin}/api/datarooms/${dataroom.id}/documents/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setDocuments);
  }

  useEffect(loadDocuments, [dataroom.id]);

  async function uploadFile(file: File) {
    const body = new FormData();
    body.append('file', file);
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
    loadDocuments();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  return (
    <section>
      <button onClick={onBack}>← Retour aux datarooms</button>
      <h2>{dataroom.name}</h2>
      <ul>
        {documents.map(d => (
          <li key={d.id}>
            <a href={d.file} target="_blank" rel="noreferrer">{d.name}</a>
          </li>
        ))}
      </ul>
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

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null); // null = en cours de vérification
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [offices, setOffices] = useState<OfficeMembership[]>([]);
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [configResolved, setConfigResolved] = useState(false);
  const [view, setView] = useState<View>({ kind: 'home' });

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
    if (res.ok) {
      const data = await res.json();
      setCurrentUser(data.username);
      await loadOffices();
    } else {
      alert('Identifiants incorrects');
    }
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

  return (
    <div>
      <Header config={config} otherOffices={otherOffices} currentUser={currentUser} view={view} setView={setView} />
      {view.kind === 'home' && <HomePage config={config} />}
      {view.kind === 'datarooms' && (
        <DataroomsPage onOpen={d => setView({ kind: 'dataroom', dataroom: d })} />
      )}
      {view.kind === 'dataroom' && (
        <DataroomDetailPage dataroom={view.dataroom} onBack={() => setView({ kind: 'datarooms' })} />
      )}
      {view.kind === 'module' && <ModulePage slug={view.slug} label={view.label} />}
    </div>
  );
}

export default App;
