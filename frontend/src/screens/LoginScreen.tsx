import { type FormEvent } from 'react';
import { Decor } from '../components/Decor';

export interface LoginScreenProps {
  officeName: string;
  officeDomain: string;
  defaultIdentifier?: string;
  onSubmit: (identifier: string, password: string) => void;
  onSsoClick?: () => void;
  logoUrl?: string;
  error?: string;
}

// Écran de connexion — §6.15. Composant pur : `onSubmit` reçoit identifiant +
// mot de passe, à brancher sur POST /api/login/ (voir switchOffice()/App.tsx
// pour le pattern fetch + CSRF déjà en place côté backend). Le double effet
// décoratif (story + panel) suit la structure exacte du prototype.
export function LoginScreen({
  officeName,
  officeDomain,
  defaultIdentifier,
  onSubmit,
  onSsoClick,
  logoUrl,
  error,
}: LoginScreenProps) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const identifier = (form.elements.namedItem('identifier') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    onSubmit(identifier, password);
  }

  return (
    <div className="app is-active" id="app-login">
      <div className="login-shell" style={{ width: '100%' }}>
        <div className="login-story" style={{ position: 'relative' }}>
          <Decor preset="login-story" />
          <div>
            <div className="story-top">
              <div className="mark" style={{ width: 34, height: 34 }}>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Notantis"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                )}
              </div>
              <div>
                <div className="brand-name">Espace Notarial</div>
                <div className="brand-sub" style={{ color: 'var(--shell-text-dim)' }}>
                  by Notantis
                </div>
              </div>
            </div>
            <h1 style={{ marginTop: 70 }}>La dataroom pensée pour le notariat.</h1>
            <p>
              Centralisez, structurez et partagez les pièces d'une opération immobilière —
              en toute confidentialité, du premier diagnostic à la signature de l'acte.
            </p>
            <div className="story-badges">
              <div className="story-badge">
                <svg className="icon">
                  <use href="#i-shield" />
                </svg>
                Hébergement UE — DSN 2026
              </div>
              <div className="story-badge">
                <svg className="icon">
                  <use href="#i-lock" />
                </svg>
                Authentification forte
              </div>
              <div className="story-badge">
                <svg className="icon">
                  <use href="#i-layers" />
                </svg>
                Un compte, tous vos offices
              </div>
            </div>
          </div>
          <div className="tiny" style={{ color: 'var(--shell-text-dim)' }}>
            © 2026 Notantis — Espace Notarial Next
          </div>
        </div>

        <div className="login-panel" style={{ position: 'relative' }}>
          <Decor preset="login-panel" />
          <div className="login-card">
            <div className="lc-logo">
              <svg className="icon" style={{ width: 20, height: 20, color: 'var(--brass-600)' }}>
                <use href="#i-building" />
              </svg>
              <span className="dim tiny">Connexion office</span>
            </div>
            <h2>Bienvenue</h2>
            <div className="dim tiny">{officeName}</div>
            <div className="login-domain">{officeDomain}</div>
            <form onSubmit={handleSubmit}>
              <div className="field" style={{ marginTop: 22 }}>
                <label>Identifiant</label>
                <input
                  type="text"
                  name="identifier"
                  placeholder="cyril.dumont@paris.notaires.fr"
                  defaultValue={defaultIdentifier}
                />
              </div>
              <div className="field">
                <label>Mot de passe</label>
                <input type="password" name="password" />
              </div>
              {error && (
                <div className="tiny" style={{ color: 'var(--critical)', marginBottom: 10 }}>
                  {error}
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} type="submit">
                Se connecter
              </button>
            </form>
            <div className="tiny dim" style={{ marginTop: 10 }}>
              Une confirmation vous sera demandée sur votre mobile (MFA).
            </div>
            <div className="divider">ou</div>
            <button className="btn sso-btn" onClick={onSsoClick}>
              <svg className="icon">
                <use href="#i-seal" />
              </svg>
              Continuer avec Id.Not
            </button>
            <div className="login-foot">
              <a href="#" onClick={e => e.preventDefault()}>
                Mot de passe oublié ?
              </a>
              <a href="#" onClick={e => e.preventDefault()}>
                Besoin d'aide ?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
