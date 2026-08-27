import { SHAPE, SHAPE_KEYS, TYPOGRAPHY, TYPOGRAPHY_KEYS } from '../../theme/schema';
import { useTenantTheme } from '../../theme/useTenantTheme';
import { Avatar } from '../atoms/Avatar';
import { BarTrack } from '../atoms/BarTrack';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Grid } from '../atoms/Grid';
import { Icon } from '../atoms/Icon';
import { Pill } from '../atoms/Pill';
import { ShapeSwatch } from '../atoms/ShapeSwatch';
import { Tag } from '../atoms/Tag';
import { TypographySample } from '../atoms/TypographySample';
import { PresetCard } from '../molecules/PresetCard';
import { PresetRow } from '../molecules/PresetRow';
import { StatCard } from '../molecules/StatCard';
import { TokenEditor } from './TokenEditor';
import type { ThemeMode } from '../../theme/schema';

const EDIT_MODES: Array<{ key: ThemeMode; label: string }> = [
  { key: 'light', label: 'Thème clair' },
  { key: 'dark', label: 'Thème sombre' },
];

// Personnalisation → Apparence (index_16.html #sub3-apparence).
// Tous les champs de couleur sont générés depuis TOKEN_SCHEMA via <TokenEditor> ;
// le sélecteur clair/sombre choisit à la fois le jeu de valeurs édité et le
// thème prévisualisé (data-theme sur <html>), pour que l'aperçu corresponde
// toujours exactement à ce qu'on modifie.
export function AppearanceTab() {
  const { state, editMode, setEditMode, setTypography, setShape, reset, justSaved, saveError } =
    useTenantTheme();

  return (
    <Grid columns={2} style={{ alignItems: 'start' }}>
      <Card padded>
        <div className="appearance-block">
          <div className="appearance-block-head">
            <div className="appearance-block-title">Couleurs</div>
            {/* Un échec d'enregistrement remplace le badge « Enregistré » : afficher
                les deux laisserait croire que la couleur est partie au serveur. */}
            {saveError ? (
              <span className="save-error" role="status">
                <Icon id="x" style={{ width: 11, height: 11 }} />
                Non enregistré — {saveError}
              </span>
            ) : (
              <span className={justSaved ? 'save-flash show' : 'save-flash'} aria-live="polite">
                <Icon id="check" style={{ width: 11, height: 11 }} />
                Enregistré
              </span>
            )}
          </div>
          <div className="appearance-block-desc">
            Chaque couleur de l'interface se règle individuellement — fonds, dégradés, texte, icônes
            et statuts compris. Choisissez le thème à modifier ci-dessous ; tout l'Espace Notarial
            (pas seulement cet écran) bascule avec vous pour que l'aperçu soit exact.
          </div>
          <div className="theme-edit-toggle" role="tablist" aria-label="Thème en cours d'édition">
            {EDIT_MODES.map(m => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={editMode === m.key}
                className={editMode === m.key ? 'theme-edit-btn active' : 'theme-edit-btn'}
                onClick={() => setEditMode(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <TokenEditor />
        </div>

        <div className="appearance-block">
          <div className="appearance-block-title">Typographie</div>
          <div className="appearance-block-desc">
            S'applique aux titres et à l'ensemble de l'interface.
          </div>
          <PresetRow label="Typographie">
            {TYPOGRAPHY_KEYS.map(key => {
              const preset = TYPOGRAPHY[key];
              return (
                <PresetCard
                  key={key}
                  active={state.typography === key}
                  onSelect={() => setTypography(key)}
                  preview={<TypographySample fontFamily={preset.sampleFont} />}
                  name={preset.label}
                  desc={preset.desc}
                />
              );
            })}
          </PresetRow>
        </div>

        <div className="appearance-block">
          <div className="appearance-block-title">Formes</div>
          <div className="appearance-block-desc">Rayons des cartes, boutons et champs.</div>
          <PresetRow label="Formes">
            {SHAPE_KEYS.map(key => {
              const preset = SHAPE[key];
              return (
                <PresetCard
                  key={key}
                  active={state.shape === key}
                  onSelect={() => setShape(key)}
                  preview={<ShapeSwatch radius={preset.swatchRadius} />}
                  name={preset.label}
                />
              );
            })}
          </PresetRow>
        </div>

        <div className="appearance-block">
          <Button variant="ghost" size="sm" onClick={reset}>
            <Icon id="x" />
            Réinitialiser les valeurs Notantis
          </Button>
        </div>
      </Card>

      <Card padded>
        <div className="appearance-block-title" style={{ marginBottom: 3 }}>
          Aperçu en direct
        </div>
        <div className="appearance-block-desc">
          Ces réglages s'appliquent immédiatement à tout l'Espace Notarial — sidebar, tableau de
          bord, boutons — pas seulement à cette carte.
        </div>
        <div className="appearance-preview">
          <Button variant="primary">Bouton principal</Button>
          <Button variant="accent">Bouton d'accent</Button>
          <Pill kind="success">Actif</Pill>
          <Tag icon="tag">Vente</Tag>
          <Avatar size="sm">CD</Avatar>
        </div>
        <div style={{ marginTop: 14 }}>
          <StatCard
            label="Dossiers actifs"
            value="64"
            icon="folder"
            iconBg="var(--brass-100)"
            iconColor="var(--brass-700)"
            sub={<BarTrack percent={62} label="Aperçu — 62 %" />}
          />
        </div>
      </Card>
    </Grid>
  );
}
