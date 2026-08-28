import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Icon } from '../atoms/Icon';
import { TextInput } from '../atoms/TextInput';
import { Textarea } from '../atoms/Textarea';
import { Toggle } from '../atoms/Toggle';
import { Dropzone } from '../molecules/Dropzone';
import { Field } from '../molecules/Field';
import { FieldRow } from '../molecules/FieldRow';

/**
 * Réglages de contenu de l'office — le périmètre « Personnalisation » de
 * l'Espace Notarial actuel (coordonnées et logo, en-tête des emails) élargi à ce
 * que la V2 doit pouvoir personnaliser (textes d'accueil, mentions légales,
 * espace client).
 *
 * Ces valeurs ne sont PAS des tokens de thème : les couleurs, la typographie et
 * les formes restent gérées par src/theme et l'onglet Apparence. Elles n'ont pas
 * non plus d'endpoint aujourd'hui — voir `readOnlyNote`.
 */
export interface OfficeContent {
  raisonSociale: string;
  adresse: string;
  telephone: string;
  email: string;
  siteWeb: string;
  logoUrl?: string;
  banniereUrl?: string;
  emailExpediteur: string;
  emailObjetPrefixe: string;
  emailSignature: string;
  accueilTitre: string;
  accueilTexte: string;
  mentionsLegales: string;
  espaceClientTitre: string;
  espaceClientTexte: string;
  espaceClientAfficherLogo: boolean;
}

export type OfficeContentSection = 'coordonnees' | 'emails' | 'accueil' | 'espace-client';

export interface OfficeContentTabProps {
  section: OfficeContentSection;
  content: OfficeContent;
  onChange: (next: OfficeContent) => void;
  onSave?: () => void;
  /** Message affiché quand l'enregistrement serveur n'existe pas encore. */
  note?: string | null;
  onLogoSelected?: (file: File) => void;
  onBanniereSelected?: (file: File) => void;
}

const TITLES: Record<OfficeContentSection, { title: string; desc: string }> = {
  coordonnees: {
    title: "Coordonnées et logo de l'office",
    desc: "Identité affichée dans l'application, dans les emails et sur les documents exportés.",
  },
  emails: {
    title: 'En-tête des emails',
    desc: "Expéditeur, préfixe d'objet et signature des notifications envoyées aux membres d'un dossier.",
  },
  accueil: {
    title: 'Accueil & mentions',
    desc: "Textes affichés sur la page d'accueil et mentions légales rappelées aux utilisateurs.",
  },
  'espace-client': {
    title: 'Espace client',
    desc: "Ce que voient les clients de l'étude en se connectant à leurs dossiers en ligne.",
  },
};

export function OfficeContentTab({
  section,
  content,
  onChange,
  onSave,
  note,
  onLogoSelected,
  onBanniereSelected,
}: OfficeContentTabProps) {
  const set = <K extends keyof OfficeContent>(key: K, value: OfficeContent[K]) =>
    onChange({ ...content, [key]: value });
  const head = TITLES[section];

  return (
    <Card padded style={{ maxWidth: 720 }}>
      <div className="appearance-block-title">{head.title}</div>
      <div className="appearance-block-desc">{head.desc}</div>

      {section === 'coordonnees' && (
        <>
          <Field label="Raison sociale">
            <TextInput
              value={content.raisonSociale}
              onChange={e => set('raisonSociale', e.target.value)}
            />
          </Field>
          <Field label="Adresse">
            <Textarea rows={2} value={content.adresse} onChange={e => set('adresse', e.target.value)} />
          </Field>
          <FieldRow>
            <Field label="Téléphone">
              <TextInput value={content.telephone} onChange={e => set('telephone', e.target.value)} />
            </Field>
            <Field label="Email de contact">
              <TextInput value={content.email} onChange={e => set('email', e.target.value)} />
            </Field>
          </FieldRow>
          <Field label="Site web">
            <TextInput value={content.siteWeb} onChange={e => set('siteWeb', e.target.value)} />
          </Field>
          <Field label="Logo de l'étude">
            <Dropzone
              hint="Glisser le logo (PNG ou SVG) ou"
              accept="image/*"
              onFiles={files => onLogoSelected?.(files[0])}
            />
          </Field>
        </>
      )}

      {section === 'emails' && (
        <>
          <Field label="Adresse d'expédition">
            <TextInput
              value={content.emailExpediteur}
              onChange={e => set('emailExpediteur', e.target.value)}
            />
          </Field>
          <Field label="Préfixe des objets">
            <TextInput
              value={content.emailObjetPrefixe}
              onChange={e => set('emailObjetPrefixe', e.target.value)}
            />
          </Field>
          <Field label="Signature">
            <Textarea
              rows={4}
              value={content.emailSignature}
              onChange={e => set('emailSignature', e.target.value)}
            />
          </Field>
          <div className="help">
            Le logo réglé dans « Coordonnées et logo » est repris en tête des emails.
          </div>
        </>
      )}

      {section === 'accueil' && (
        <>
          <Field label="Titre de la page d'accueil">
            <TextInput
              value={content.accueilTitre}
              onChange={e => set('accueilTitre', e.target.value)}
            />
          </Field>
          <Field label="Texte d'accueil">
            <Textarea
              rows={3}
              value={content.accueilTexte}
              onChange={e => set('accueilTexte', e.target.value)}
            />
          </Field>
          <Field label="Bannière">
            <Dropzone
              hint="Glisser une image de bannière ou"
              accept="image/*"
              onFiles={files => onBanniereSelected?.(files[0])}
            />
          </Field>
          <Field label="Mentions légales">
            <Textarea
              rows={4}
              value={content.mentionsLegales}
              onChange={e => set('mentionsLegales', e.target.value)}
            />
          </Field>
        </>
      )}

      {section === 'espace-client' && (
        <>
          <Field label="Titre affiché aux clients">
            <TextInput
              value={content.espaceClientTitre}
              onChange={e => set('espaceClientTitre', e.target.value)}
            />
          </Field>
          <Field label="Texte d'introduction">
            <Textarea
              rows={3}
              value={content.espaceClientTexte}
              onChange={e => set('espaceClientTexte', e.target.value)}
            />
          </Field>
          <div className="v1-list-controls" style={{ justifyContent: 'flex-start', gap: 12 }}>
            <span className="tiny">Afficher le logo de l'étude dans l'espace client</span>
            <Toggle
              checked={content.espaceClientAfficherLogo}
              onChange={next => set('espaceClientAfficherLogo', next)}
            />
          </div>
        </>
      )}

      <div style={{ marginTop: 18 }}>
        <Button variant="primary" onClick={onSave} disabled={!onSave}>
          <Icon id="check" />
          Enregistrer
        </Button>
      </div>

      {note && <div className="help">{note}</div>}
    </Card>
  );
}
