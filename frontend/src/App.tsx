import { useEffect, useState, type FormEvent } from 'react';

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

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [offices, setOffices] = useState<OfficeMembership[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const [config, setConfig] = useState<TenantConfig | null>(null);

  const authHeaders = { Authorization: `Token ${token}` };

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const res = await fetch('http://localhost:8000/api/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
    } else {
      alert('Identifiants incorrects');
    }
  }

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/my-offices/', { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setOffices(data);
        if (data.length > 0) setSelectedOffice(data[0].subdomain);
      });
  }, [token]);

  useEffect(() => {
    if (!token || !selectedOffice) return;
    fetch(`http://localhost:8000/api/tenant-config/?office=${selectedOffice}`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        document.documentElement.style.setProperty('--primary-color', data.primary_color);
      });
  }, [token, selectedOffice]);

  if (!token) {
    return (
      <form onSubmit={handleLogin}>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Utilisateur" />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mot de passe" />
        <button type="submit">Connexion</button>
      </form>
    );
  }

  if (!config) return <p>Chargement...</p>;

  return (
    <div>
      <select value={selectedOffice ?? ''} onChange={e => setSelectedOffice(e.target.value)}>
        {offices.map(o => (
          <option key={o.subdomain} value={o.subdomain}>{o.name} ({o.role})</option>
        ))}
      </select>

      <h1 style={{ color: 'var(--primary-color)' }}>{config.name}</h1>

      <nav>
        {config.enabled_modules.includes('coffre-fort') && <button>Coffre-fort</button>}
        {config.enabled_modules.includes('confiance-rib') && <button>ConfianceRIB</button>}
      </nav>
    </div>
  );
}

export default App;