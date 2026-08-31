import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export type DocumentPreviewKind = 'pdf' | 'image' | 'text' | 'unsupported';

export interface DocumentPreviewProps {
  fileName: string;
  kind: DocumentPreviewKind;
  loading?: boolean;
  error?: string | null;
  /** URL objet (blob:) du PDF ou de l'image. */
  url?: string | null;
  /** Contenu déjà décodé, pour les fichiers texte. */
  text?: string | null;
  onDownload?: () => void;
}

/**
 * Aperçu du contenu d'une pièce, affiché dans le volet document.
 *
 * Composant pur : il ne connaît ni l'API ni le stockage, seulement ce qu'on lui
 * donne à montrer (voir hooks/useDocumentPreview.ts). Trois rendus utiles - PDF
 * par le lecteur natif du navigateur, image, texte brut - et un quatrième cas,
 * assumé : le format qu'on ne sait pas afficher le DIT, avec le bouton de
 * téléchargement à côté. Un cadre vide laisserait croire à une pièce vide.
 */
export function DocumentPreview({
  fileName,
  kind,
  loading,
  error,
  url,
  text,
  onDownload,
}: DocumentPreviewProps) {
  if (loading) {
    return <PreviewFrame><span className="dim tiny">Chargement de l'aperçu…</span></PreviewFrame>;
  }

  if (error) {
    return (
      <PreviewFrame>
        <Icon id="x" style={{ width: 20, height: 20, color: 'var(--critical)' }} />
        <span className="tiny" style={{ color: 'var(--critical)' }}>{error}</span>
        {onDownload && (
          <Button size="sm" onClick={onDownload}>
            <Icon id="down" />
            Télécharger
          </Button>
        )}
      </PreviewFrame>
    );
  }

  if (kind === 'unsupported') {
    return (
      <PreviewFrame>
        <Icon id="file" style={{ width: 22, height: 22, color: 'var(--ink-400)' }} />
        <span className="tiny dim">
          Aperçu indisponible pour ce format — le fichier reste consultable une fois
          téléchargé.
        </span>
        {onDownload && (
          <Button size="sm" variant="primary" onClick={onDownload}>
            <Icon id="down" />
            Télécharger
          </Button>
        )}
      </PreviewFrame>
    );
  }

  if (kind === 'text') {
    return (
      <div className="doc-preview">
        <pre className="doc-preview-text">{text}</pre>
      </div>
    );
  }

  if (kind === 'image' && url) {
    return (
      <div className="doc-preview">
        <img src={url} alt={fileName} className="doc-preview-image" />
      </div>
    );
  }

  if (kind === 'pdf' && url) {
    // <iframe> plutôt que <embed> : c'est le seul des deux qui expose une hauteur
    // contrôlable de façon fiable dans un conteneur en flex, et le lecteur PDF
    // intégré du navigateur y fonctionne à l'identique (pagination, zoom,
    // impression, téléchargement).
    return (
      <div className="doc-preview">
        <iframe src={url} title={fileName} className="doc-preview-frame" />
      </div>
    );
  }

  return <PreviewFrame><span className="dim tiny">Aucun aperçu à afficher.</span></PreviewFrame>;
}

function PreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="doc-preview doc-preview-empty">
      <div style={{ display: 'grid', gap: 10, justifyItems: 'center', textAlign: 'center', maxWidth: 280 }}>
        {children}
      </div>
    </div>
  );
}
