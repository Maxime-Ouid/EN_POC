import notantisLogo from '../../assets/notantis-logo.png';
import { TextInput } from '../atoms/TextInput';
import { Button } from '../atoms/Button';
import { Decor } from '../atoms/Decor';
import type { FormEvent } from 'react';

export interface MfaScreenProps {
  /** 'enroll' : premier dispositif à confirmer (QR code). 'verify' : dispositif déjà confirmé, code seul. */
  mode: 'enroll' | 'verify';
  qrCode?: string | null;
  secret?: string | null;
  onSubmit: (token: string) => void;
  error?: string;
  logoUrl?: string;
}

// Deuxième temps de la connexion (MFA, TOTP) — même structure à deux panneaux que
// LoginScreen (§6.15), pour rester dans la même continuité visuelle d'un pas à
// l'autre du même flux. Composant pur : `onSubmit` reçoit le code à 6 chiffres, à
// brancher sur POST /api/mfa/setup/ (enrôlement) ou /api/mfa/verify/ (déjà
// enrôlé) — voir hooks/useSession.ts pour la machine à états qui choisit `mode`.
export function MfaScreen({ mode, qrCode, secret, onSubmit, error, logoUrl = notantisLogo }: MfaScreenProps) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const token = (form.elements.namedItem('token') as HTMLInputElement).value;
    onSubmit(token);
  }

  return (
    <div className="app is-active" id="app-mfa">
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
            <h1 style={{ marginTop: 70 }}>Un dernier code avant d'entrer.</h1>
            <p>
              Votre mot de passe est validé — il ne manque plus que la confirmation depuis votre
              application d'authentification.
            </p>
          </div>
          <div className="tiny" style={{ color: 'var(--shell-text-dim)' }}>
            © 2026 Notantis — Espace Notarial Next, aperçu de maquette
          </div>
        </div>

        <div className="login-panel" style={{ position: 'relative' }}>
          <Decor preset="login-panel" />
          <div className="login-card">
            <div className="lc-logo">
              <svg className="icon" style={{ width: 20, height: 20, color: 'var(--brass-600)' }}>
                <use href="#i-lock" />
              </svg>
              <span className="dim tiny">Vérification en deux étapes</span>
            </div>
            <h2>{mode === 'enroll' ? 'Configurer votre application' : 'Code de vérification'}</h2>
            {mode === 'enroll' ? (
              <>
                <div className="dim tiny" style={{ marginTop: 6 }}>
                  Scannez ce QR code avec votre application d'authentification (Google
                  Authenticator, etc.), puis saisissez le code à 6 chiffres généré.
                </div>
                {qrCode && (
                  <img
                    src={qrCode}
                    alt="QR code TOTP"
                    width={180}
                    height={180}
                    style={{ margin: '16px auto', display: 'block' }}
                  />
                )}
                {secret && (
                  <div className="tiny dim" style={{ textAlign: 'center', wordBreak: 'break-all' }}>
                    Secret (saisie manuelle) : <code>{secret}</code>
                  </div>
                )}
              </>
            ) : (
              <div className="dim tiny" style={{ marginTop: 6 }}>
                Saisissez le code à 6 chiffres de votre application d'authentification.
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="field" style={{ marginTop: 22 }}>
                <label>Code de vérification</label>
                <TextInput name="token" placeholder="123456" inputMode="numeric" autoFocus />
              </div>
              {error && (
                <div className="tiny" style={{ color: 'var(--critical)', marginBottom: 10 }}>
                  {error}
                </div>
              )}
              <Button variant="primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                Valider
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
