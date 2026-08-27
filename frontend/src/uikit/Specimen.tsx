import type { ReactNode } from 'react';
import { Pill } from '../components';
import { docFor } from './introspect';
import { useMatchesFilter } from './filter';

export interface Variant {
  label: string;
  node: ReactNode;
}

export interface SpecimenProps {
  /** Nom exporté du composant — sert de clé pour lire sa documentation. */
  name: string;
  variants: Variant[];
  /** Description manuelle, quand le commentaire du code ne suffit pas. */
  note?: string;
}

const LEVEL_TONE: Record<string, 'success' | 'info' | 'warning' | 'critical' | 'neutral'> = {
  atoms: 'success',
  molecules: 'info',
  organisms: 'warning',
  templates: 'critical',
  pages: 'neutral',
};

// Fiche d'un composant : identité, description tirée du code, rendu vivant
// dans chacune de ses variantes, puis table des props également lue dans le
// code (voir introspect.ts).
export function Specimen({ name, variants, note }: SpecimenProps) {
  const doc = docFor(name);
  const visible = useMatchesFilter(name);

  // Le filtre démonte la fiche au lieu de la masquer en CSS : les spécimens
  // interactifs (modales, éditeur de tokens) ne continuent pas de tourner en
  // arrière-plan quand on cherche autre chose.
  if (!visible) return null;

  return (
    <section className="uikit-item" id={`c-${name}`}>
      <header className="uikit-item-head">
        <span className="uikit-item-name">{`<${name}>`}</span>
        <Pill kind={LEVEL_TONE[doc.level] ?? 'neutral'}>{doc.level || '—'}</Pill>
        <span className="uikit-item-path">{doc.path}</span>
      </header>

      {(note || doc.description) && <p className="uikit-item-desc">{note ?? doc.description}</p>}

      <div className="uikit-stage">
        {variants.map(v => (
          <div className="uikit-variant" key={v.label}>
            <div className="uikit-variant-label">{v.label}</div>
            {v.node}
          </div>
        ))}
      </div>

      <PropsTable name={name} />
    </section>
  );
}

function PropsTable({ name }: { name: string }) {
  const doc = docFor(name);

  if (doc.aliasOf) {
    return (
      <div className="uikit-empty">
        Props : <code className="mono">{doc.aliasOf}</code> — toutes les props natives de
        l'élément HTML correspondant.
      </div>
    );
  }
  if (!doc.props.length) {
    return <div className="uikit-empty">Aucune prop.</div>;
  }

  return (
    <>
      {doc.extendsFrom && (
        <div className="uikit-empty">
          Hérite aussi de <code className="mono">{doc.extendsFrom}</code>.
        </div>
      )}
      <table className="uikit-props">
        <thead>
          <tr>
            <th style={{ width: '22%' }}>Prop</th>
            <th style={{ width: '30%' }}>Type</th>
            <th>Rôle</th>
          </tr>
        </thead>
        <tbody>
          {doc.props.map(p => (
            <tr key={p.name}>
              <td className="n">
                {p.name}
                {p.required && <span className="uikit-req" title="obligatoire">requis</span>}
              </td>
              <td className="t">{p.type}</td>
              <td className="d">{p.doc ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export interface StageProps {
  height?: number;
  children?: ReactNode;
}

// Boîte qui retient les descendants en position:fixed (modale, volet latéral).
export function Stage({ height = 260, children }: StageProps) {
  return (
    <div className="uikit-contained" style={{ height }}>
      {children}
    </div>
  );
}

export interface ScreenPreviewProps {
  /** Largeur simulée de la fenêtre, avant réduction. */
  width?: number;
  height?: number;
  scale?: number;
  children?: ReactNode;
}

// Aperçu d'un écran entier, rendu à taille réelle puis réduit. Le contenu est
// bien monté (c'est du React vivant, pas une image) : seule l'échelle change.
export function ScreenPreview({ width = 1440, height = 900, scale = 0.42, children }: ScreenPreviewProps) {
  return (
    <div className="uikit-frame" style={{ width: width * scale, height: height * scale }}>
      <div className="uikit-viewport" style={{ width, height, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
