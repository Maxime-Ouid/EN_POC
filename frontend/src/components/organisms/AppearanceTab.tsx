import { useState } from 'react';
import {
  APP_BG,
  APP_BG_KEYS,
  NAV_ACTIVE,
  NAV_ACTIVE_KEYS,
  NAV_DENSITY,
  NAV_DENSITY_KEYS,
  NAV_PLACEMENT,
  NAV_PLACEMENT_KEYS,
  NAV_SIZE,
  NAV_SIZE_KEYS,
  NAV_TOGGLES,
  SHAPE,
  SHAPE_KEYS,
  TYPOGRAPHY,
  TYPOGRAPHY_KEYS,
} from '../../theme/schema';
import { useTenantTheme } from '../../theme/useTenantTheme';
import { AppBgSwatch } from '../atoms/AppBgSwatch';
import { Avatar } from '../atoms/Avatar';
import { BarTrack } from '../atoms/BarTrack';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Grid } from '../atoms/Grid';
import { Icon } from '../atoms/Icon';
import { NavSwatch } from '../atoms/NavSwatch';
import { Pill } from '../atoms/Pill';
import { ShapeSwatch } from '../atoms/ShapeSwatch';
import { Tag } from '../atoms/Tag';
import { Toggle } from '../atoms/Toggle';
import { TypographySample } from '../atoms/TypographySample';
import { PresetCard } from '../molecules/PresetCard';
import { TokenItem } from '../molecules/TokenItem';
import { PresetRow } from '../molecules/PresetRow';
import { StatCard } from '../molecules/StatCard';
import { SubscreenPanel } from '../atoms/SubscreenPanel';
import { TabStrip } from '../molecules/TabStrip';
import { TokenEditor } from './TokenEditor';
import type { TabDef } from '../molecules/TabStrip';
import { TOKEN_SCHEMA } from '../../theme/schema';
import type { ThemeMode } from '../../theme/schema';

const EDIT_MODES: Array<{ key: ThemeMode; label: string }> = [
  { key: 'light', label: 'Thème clair' },
  { key: 'dark', label: 'Thème sombre' },
];

/* Les quatre familles de réglages, en onglets depuis le 28/08/2026.

   Elles étaient empilées dans une seule colonne : neuf blocs bout à bout, dont
   l'éditeur de couleurs qui fait à lui seul plusieurs écrans de haut. Changer
   une police après avoir touché une couleur demandait un long défilement, et
   rien ne disait à l'arrivée combien de réglages restaient plus bas. Les cinq
   blocs de navigation (emplacement, largeur, densité, indicateur, éléments
   affichés) tiennent dans un seul onglet : ils se règlent ensemble. */
const APPEARANCE_TABS: TabDef[] = [
  { key: 'couleurs', label: 'Couleurs' },
  { key: 'fond', label: 'Fond' },
  { key: 'typographie', label: 'Typographie' },
  { key: 'formes', label: 'Formes' },
  { key: 'navigation', label: 'Navigation' },
];

type AppearanceTabKey = (typeof APPEARANCE_TABS)[number]['key'];

// Personnalisation → Apparence (index_16.html #sub3-apparence).
// Tous les champs de couleur sont générés depuis TOKEN_SCHEMA via <TokenEditor> ;
// le sélecteur clair/sombre choisit à la fois le jeu de valeurs édité et le
// thème prévisualisé (data-theme sur <html>), pour que l'aperçu corresponde
// toujours exactement à ce qu'on modifie.
export function AppearanceTab() {
  const [tab, setTab] = useState<AppearanceTabKey>('couleurs');
  const {
    state,
    editMode,
    setEditMode,
    setTypography,
    setShape,
    setAppBg,
    setLayout,
    reset,
    justSaved,
    saveError,
  } = useTenantTheme();
  const layout = state.layout;

  return (
    <Grid columns={2} style={{ alignItems: 'start' }}>
      <Card padded>
        {/* Le badge d'enregistrement vit au-dessus des onglets, pas dans le bloc
            Couleurs : il vaut pour TOUT l'écran (une police, un rayon et une
            couleur partent au serveur par le même chemin). Sous un onglet, il
            aurait disparu au moment précis où l'on modifie autre chose. */}
        <div className="appearance-tabs-head">
          <TabStrip
            tabs={APPEARANCE_TABS}
            active={tab}
            onChange={k => setTab(k as AppearanceTabKey)}
          />
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

        <SubscreenPanel level={3} active={tab === 'couleurs'}>
          <div className="appearance-block">
            <div className="appearance-block-desc">
              Chaque couleur de l'interface se règle individuellement — fonds, dégradés, texte,
              icônes et statuts compris. Choisissez le thème à modifier ci-dessous ; tout l'Espace
              Notarial (pas seulement cet écran) bascule avec vous pour que l'aperçu soit exact.
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
            <TokenEditor exclude={['appbg']} />
          </div>
        </SubscreenPanel>

        {/* --- Fond de l'espace connecté ---------------------------------
            Les formes flottantes ont été retirées de l'espace connecté le
            01/09/2026 (elles restent sur les écrans de connexion) : ce qui se
            règle ici est le fond lui-même. Seuls les tokens que le fond
            sélectionné consomme réellement sont affichés — proposer un réglage
            sans effet visible est le piège déjà rencontré avec `shell-bg`. */}
        <SubscreenPanel level={3} active={tab === 'fond'}>
          <div className="appearance-block">
            <div className="appearance-block-desc">
              Fond des écrans une fois connecté. Les écrans de connexion gardent leur
              décor animé, réglé plus bas dans l'onglet Couleurs.
            </div>
            <PresetRow label="Style de fond">
              {APP_BG_KEYS.map(key => {
                const preset = APP_BG[key];
                return (
                  <PresetCard
                    key={key}
                    active={state.appBg === key}
                    onSelect={() => setAppBg(key)}
                    preview={<AppBgSwatch bg={key} />}
                    name={preset.label}
                    desc={preset.desc}
                  />
                );
              })}
            </PresetRow>
            <div className="token-group" style={{ marginTop: 18 }}>
              <div className="token-group-title">Couleurs de ce fond</div>
              <div className="token-grid">
                {APP_BG[state.appBg].uses.map(key => {
                  const token = TOKEN_SCHEMA.find(t => t.key === key);
                  return token ? <TokenItem key={key} token={token} /> : null;
                })}
              </div>
            </div>
          </div>
        </SubscreenPanel>

        <SubscreenPanel level={3} active={tab === 'typographie'}>
          <div className="appearance-block">
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
        </SubscreenPanel>

        <SubscreenPanel level={3} active={tab === 'formes'}>
          <div className="appearance-block">
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
        </SubscreenPanel>

        {/* --- Navigation ------------------------------------------------
            Tout ce bloc est généré depuis les tables de theme/schema.ts :
            ajouter un placement ou un style d'indicateur ne demande pas de
            toucher à cet écran. Aucun aperçu séparé n'est proposé — le clic
            réagence l'application entière, c'est le seul aperçu exact. */}
        <SubscreenPanel level={3} active={tab === 'navigation'}>
          <div className="appearance-block">
            <div className="appearance-block-title">Emplacement</div>
            <div className="appearance-block-desc">
              Emplacement et style du menu principal. Le changement s'applique immédiatement à toute
              l'application : c'est la navigation autour de cet écran qui se déplace.
            </div>

            <PresetRow label="Emplacement de la navigation">
              {NAV_PLACEMENT_KEYS.map(key => (
                <PresetCard
                  key={key}
                  active={layout.navPlacement === key}
                  onSelect={() => setLayout({ navPlacement: key })}
                  preview={<NavSwatch placement={key} indicator={layout.navActive} />}
                  name={NAV_PLACEMENT[key].label}
                  desc={NAV_PLACEMENT[key].desc}
                />
              ))}
            </PresetRow>
          </div>

          <div className="appearance-block">
            <div className="appearance-block-title">Largeur et libellés</div>
            <div className="appearance-block-desc">
              En « icônes seules », le rail se réduit à une colonne de pastilles et chaque libellé
              apparaît au survol, à côté de son icône ; il reste lu par les lecteurs d'écran. Les
              sous-menus et les intitulés de section, eux, disparaissent — ils n'ont plus de place
              où s'afficher.
            </div>
            <PresetRow label="Largeur de la navigation">
              {NAV_SIZE_KEYS.map(key => (
                <PresetCard
                  key={key}
                  active={layout.navSize === key}
                  onSelect={() => setLayout({ navSize: key })}
                  preview={
                    <NavSwatch
                      placement={layout.navPlacement}
                      thin={key === 'rail'}
                      indicator={layout.navActive}
                    />
                  }
                  name={NAV_SIZE[key].label}
                  desc={NAV_SIZE[key].desc}
                />
              ))}
            </PresetRow>
          </div>

          <div className="appearance-block">
            <div className="appearance-block-title">Densité des entrées</div>
            <div className="appearance-block-desc">
              Hauteur, espacement et taille d'icône. « Aéré » donne des cibles plus grandes, utile
              sur écran tactile ; « Dense » fait tenir plus de rubriques sans défilement.
            </div>
            <PresetRow label="Densité de la navigation">
              {NAV_DENSITY_KEYS.map(key => (
                <PresetCard
                  key={key}
                  active={layout.navDensity === key}
                  onSelect={() => setLayout({ navDensity: key })}
                  preview={<NavSwatch placement={layout.navPlacement} density={key} />}
                  name={NAV_DENSITY[key].label}
                  desc={NAV_DENSITY[key].desc}
                />
              ))}
            </PresetRow>
          </div>

          <div className="appearance-block">
            <div className="appearance-block-title">Rubrique active</div>
            <div className="appearance-block-desc">
              Comment l'application signale l'écran où l'on se trouve.
            </div>
            <PresetRow label="Indicateur de rubrique active">
              {NAV_ACTIVE_KEYS.map(key => (
                <PresetCard
                  key={key}
                  active={layout.navActive === key}
                  onSelect={() => setLayout({ navActive: key })}
                  preview={<NavSwatch placement={layout.navPlacement} indicator={key} />}
                  name={NAV_ACTIVE[key].label}
                  desc={NAV_ACTIVE[key].desc}
                />
              ))}
            </PresetRow>
          </div>

          <div className="appearance-block">
            <div className="appearance-block-title">Éléments affichés</div>
            <div className="appearance-block-desc">
              Ce que la navigation montre en plus des rubriques.
            </div>
            {NAV_TOGGLES.map(t => (
              <div className="nav-toggle-row" key={t.key}>
                <div className="nav-toggle-text">
                  <div className="nav-toggle-label">{t.label}</div>
                  <div className="nav-toggle-desc">{t.desc}</div>
                </div>
                <Toggle checked={layout[t.key]} onChange={next => setLayout({ [t.key]: next })} />
              </div>
            ))}
          </div>
        </SubscreenPanel>

        {/* Hors onglets : la réinitialisation remet TOUT (couleurs, police,
            formes, navigation), pas seulement l'onglet ouvert. La ranger sous
            l'un d'eux l'aurait fait passer pour un bouton de portée locale. */}
        <div className="appearance-reset">
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
